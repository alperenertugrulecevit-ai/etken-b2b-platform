"use server";

import {
  HandlingUnitStatus,
  InventoryCountLineStatus,
  InventoryCountStatus,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type RFInventoryCountItemState = {
  success: boolean;
  message: string;
};

const ACTIVE_COUNT_STATUSES:
  InventoryCountStatus[] = [
    InventoryCountStatus.ACTIVE,
    InventoryCountStatus.IN_PROGRESS,
  ];

function createState(
  success: boolean,
  message: string
): RFInventoryCountItemState {
  return {
    success,
    message,
  };
}

function validateId(
  value: number,
  message: string
) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(message);
  }
}

function getOperatorName(
  profile: Awaited<
    ReturnType<
      typeof AuthorizationService.requireRfAccess
    >
  >
) {
  return profile.employee
    ? `${profile.employee.firstName} ${profile.employee.lastName}`
    : profile.username;
}

function refreshCountPages(
  inventoryCountId: number,
  inventoryCountLocationId: number
) {
  revalidatePath("/rf");
  revalidatePath(
    "/rf/inventory-counts"
  );

  revalidatePath(
    `/rf/inventory-counts/${inventoryCountId}`
  );

  revalidatePath(
    `/rf/inventory-counts/${inventoryCountId}/locations/${inventoryCountLocationId}`
  );

  revalidatePath(
    "/admin/inventory-counts"
  );

  revalidatePath(
    `/admin/inventory-counts/${inventoryCountId}`
  );
}

function createCountUrl(
  inventoryCountId: number,
  type: "success" | "error",
  message: string
) {
  const parameters =
    new URLSearchParams();

  parameters.set(
    type,
    message
  );

  return (
    `/rf/inventory-counts/${inventoryCountId}?` +
    parameters.toString()
  );
}

async function findAuthorizedCountLocation(
  transaction:
    Prisma.TransactionClient,
  inventoryCountId: number,
  inventoryCountLocationId: number,
  userId: string
) {
  return transaction.inventoryCountLocation.findFirst({
    where: {
      id:
        inventoryCountLocationId,

      inventoryCountId,

      inventoryCount: {
        is: {
          status: {
            in:
              ACTIVE_COUNT_STATUSES,
          },

          assignees: {
            some: {
              userId,
            },
          },
        },
      },
    },

    select: {
      id: true,
      inventoryCountId: true,
      locationId: true,
      locationCode: true,
      status: true,
      countedById: true,
      countedByName: true,

      inventoryCount: {
        select: {
          id: true,
          countNumber: true,
          warehouseId: true,
          status: true,
        },
      },

      location: {
        select: {
          id: true,
          warehouseId: true,
          isActive: true,
        },
      },
    },
  });
}

export async function countInventoryItemAction(
  inventoryCountId: number,
  inventoryCountLocationId: number,
  _previousState:
    RFInventoryCountItemState,
  formData: FormData
): Promise<RFInventoryCountItemState> {
  const profile =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  try {
    validateId(
      inventoryCountId,
      "Geçerli bir sayım kaydı bulunamadı."
    );

    validateId(
      inventoryCountLocationId,
      "Geçerli bir sayım lokasyonu bulunamadı."
    );

    const handlingUnitBarcode =
      String(
        formData.get(
          "handlingUnitBarcode"
        ) ?? ""
      )
        .trim()
        .toUpperCase();

    const productBarcode =
      String(
        formData.get(
          "productBarcode"
        ) ?? ""
      )
        .trim()
        .toUpperCase();

    const countedQuantity =
      Number(
        formData.get(
          "countedQuantity"
        )
      );

    const note =
      String(
        formData.get(
          "note"
        ) ?? ""
      ).trim() || null;

    if (!handlingUnitBarcode) {
      return createState(
        false,
        "THM barkodunu okutun."
      );
    }

    if (!productBarcode) {
      return createState(
        false,
        "Ürün barkodunu okutun."
      );
    }

    if (
      !Number.isInteger(
        countedQuantity
      ) ||
      countedQuantity < 0
    ) {
      return createState(
        false,
        "Sayım miktarı sıfır veya sıfırdan büyük bir tam sayı olmalıdır."
      );
    }

    if (
      note &&
      note.length > 500
    ) {
      return createState(
        false,
        "Sayım notu en fazla 500 karakter olabilir."
      );
    }

    const operatorName =
      getOperatorName(
        profile
      );

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const countLocation =
            await findAuthorizedCountLocation(
              transaction,
              inventoryCountId,
              inventoryCountLocationId,
              profile.id
            );

          if (!countLocation) {
            throw new Error(
              "Sayım lokasyonu bulunamadı, sayım aktif değil veya bu sayıma atanmamışsınız."
            );
          }

          if (
            !countLocation.location
              .isActive
          ) {
            throw new Error(
              "Pasif lokasyonda sayım yapılamaz."
            );
          }

          if (
            countLocation.location
              .warehouseId !==
            countLocation.inventoryCount
              .warehouseId
          ) {
            throw new Error(
              "Sayım lokasyonu seçilen depoya ait değil."
            );
          }

          if (
            countLocation.status ===
            "COMPLETED"
          ) {
            throw new Error(
              "Tamamlanmış lokasyonda yeniden sayım yapılamaz."
            );
          }

          if (
            countLocation.status ===
              "IN_PROGRESS" &&
            countLocation.countedById &&
            countLocation.countedById !==
              profile.id
          ) {
            throw new Error(
              `Bu lokasyonda ${countLocation.countedByName ?? "başka bir personel"} sayım yapıyor.`
            );
          }

          const handlingUnit =
            await transaction.handlingUnit.findUnique({
              where: {
                barcode:
                  handlingUnitBarcode,
              },

              select: {
                id: true,
                barcode: true,
                unitType: true,
                status: true,
                locationId: true,
                updatedAt: true,

                parentUnit: {
                  select: {
                    id: true,
                    locationId:
                      true,
                  },
                },

                items: {
                  select: {
                    id: true,
                    productId: true,
                    quantity: true,
                    reservedStock:
                      true,
                    updatedAt: true,
                  },
                },
              },
            });

          if (!handlingUnit) {
            throw new Error(
              "Okutulan THM sistemde bulunamadı."
            );
          }

          if (
            handlingUnit.status ===
            HandlingUnitStatus.CANCELLED
          ) {
            throw new Error(
              "İptal edilmiş THM sayılamaz."
            );
          }

          const effectiveLocationId =
            handlingUnit.locationId ??
            handlingUnit.parentUnit
              ?.locationId ??
            null;

          if (
            effectiveLocationId !==
            countLocation.locationId
          ) {
            throw new Error(
              `${handlingUnit.barcode} THM'si ${countLocation.locationCode} lokasyonunda bulunmuyor.`
            );
          }

          const product =
            await transaction.product.findFirst({
              where: {
                OR: [
                  {
                    barcode:
                      productBarcode,
                  },
                  {
                    code:
                      productBarcode,
                  },
                ],
              },

              select: {
                id: true,
                code: true,
                barcode: true,
                name: true,
              },
            });

          if (!product) {
            throw new Error(
              "Okutulan ürün sistemde bulunamadı."
            );
          }

          const handlingUnitItem =
            handlingUnit.items.find(
              (item) =>
                item.productId ===
                product.id
            ) ?? null;

          const existingLine =
            await transaction.inventoryCountLine.findUnique({
              where: {
                inventory_count_line_unique: {
                  inventoryCountId,
                  locationId:
                    countLocation.locationId,
                  handlingUnitId:
                    handlingUnit.id,
                  productId:
                    product.id,
                },
              },
            });

          const locationStock =
            await transaction.warehouseLocationStock.findUnique({
              where: {
                location_product_unique: {
                  locationId:
                    countLocation.locationId,
                  productId:
                    product.id,
                },
              },

              select: {
                quantity: true,
                reservedStock: true,
                updatedAt: true,
              },
            });

          const now =
            new Date();

          if (
            countLocation.status ===
            "PENDING"
          ) {
            const claimResult =
              await transaction.inventoryCountLocation.updateMany({
                where: {
                  id:
                    countLocation.id,
                  status:
                    "PENDING",
                },

                data: {
                  status:
                    "IN_PROGRESS",
                  startedAt:
                    now,
                  countedById:
                    profile.id,
                  countedByName:
                    operatorName,
                },
              });

            if (
              claimResult.count !==
              1
            ) {
              throw new Error(
                "Lokasyon aynı anda başka bir personel tarafından işleme alındı."
              );
            }
          } else if (
            !countLocation.countedById
          ) {
            await transaction.inventoryCountLocation.update({
              where: {
                id:
                  countLocation.id,
              },

              data: {
                countedById:
                  profile.id,
                countedByName:
                  operatorName,
                startedAt:
                  countLocation.status ===
                  "IN_PROGRESS"
                    ? undefined
                    : now,
              },
            });
          }

          await transaction.inventoryCount.updateMany({
            where: {
              id:
                inventoryCountId,
              status:
                InventoryCountStatus.ACTIVE,
            },

            data: {
              status:
                InventoryCountStatus.IN_PROGRESS,

              startedAt:
                countLocation.inventoryCount
                  .status ===
                InventoryCountStatus.ACTIVE
                  ? now
                  : undefined,
            },
          });

          const systemQuantity =
            existingLine
              ?.systemQuantity ??
            handlingUnitItem
              ?.quantity ??
            0;

          const difference =
            countedQuantity -
            systemQuantity;

          let isDiscovered =
            false;

          if (existingLine) {
            await transaction.inventoryCountLine.update({
              where: {
                id:
                  existingLine.id,
              },

              data: {
                status:
                  InventoryCountLineStatus.COUNTED,

                countedQuantity,

                difference,

                countedById:
                  profile.id,

                countedByName:
                  operatorName,

                countedAt:
                  now,

                note,
              },
            });

            isDiscovered =
              existingLine.isDiscovered;
          } else {
            await transaction.inventoryCountLine.create({
              data: {
                inventoryCountId,

                inventoryCountLocationId:
                  countLocation.id,

                locationId:
                  countLocation.locationId,

                handlingUnitId:
                  handlingUnit.id,

                productId:
                  product.id,

                status:
                  InventoryCountLineStatus.COUNTED,

                locationCode:
                  countLocation.locationCode,

                handlingUnitBarcode:
                  handlingUnit.barcode,

                handlingUnitType:
                  handlingUnit.unitType,

                productCode:
                  product.code,

                productBarcode:
                  product.barcode,

                productName:
                  product.name,

                systemQuantity,

                systemReservedStock:
                  handlingUnitItem
                    ?.reservedStock ??
                  0,

                locationSystemQuantity:
                  locationStock
                    ?.quantity ??
                  0,

                locationReservedStock:
                  locationStock
                    ?.reservedStock ??
                  0,

                countedQuantity,

                difference,

                isDiscovered:
                  true,

                countedById:
                  profile.id,

                countedByName:
                  operatorName,

                countedAt:
                  now,

                note,

                handlingUnitUpdatedAt:
                  handlingUnit.updatedAt,

                handlingUnitItemUpdatedAt:
                  handlingUnitItem
                    ?.updatedAt ??
                  null,

                locationStockUpdatedAt:
                  locationStock
                    ?.updatedAt ??
                  null,
              },
            });

            isDiscovered =
              true;
          }

          return {
            countNumber:
              countLocation.inventoryCount
                .countNumber,

            locationCode:
              countLocation.locationCode,

            handlingUnitBarcode:
              handlingUnit.barcode,

            productCode:
              product.code,

            productName:
              product.name,

            countedQuantity,

            isDiscovered,
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,

          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );

    refreshCountPages(
      inventoryCountId,
      inventoryCountLocationId
    );

    return createState(
      true,
      `${result.productCode} - ${result.productName}: ${result.countedQuantity} adet kaydedildi.` +
        (
          result.isDiscovered
            ? " Ürün bu THM için fark satırı olarak eklendi."
            : ""
        )
    );
  } catch (error) {
    console.error(
      "RF planlı sayım satırı kaydetme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      (
        error.code === "P2002" ||
        error.code === "P2034"
      )
    ) {
      return createState(
        false,
        "Sayım kaydı aynı anda başka bir işlem tarafından değiştirildi. Lütfen tekrar deneyin."
      );
    }

    return createState(
      false,
      error instanceof Error
        ? error.message
        : "Sayım satırı kaydedilemedi."
    );
  }
}

export async function completeInventoryCountLocationAction(
  inventoryCountId: number,
  inventoryCountLocationId: number,
  _formData: FormData
): Promise<void> {
  const profile =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  let allLocationsCompleted =
    false;

  try {
    validateId(
      inventoryCountId,
      "Geçerli bir sayım kaydı bulunamadı."
    );

    validateId(
      inventoryCountLocationId,
      "Geçerli bir sayım lokasyonu bulunamadı."
    );

    const operatorName =
      getOperatorName(
        profile
      );

    await prisma.$transaction(
      async (transaction) => {
        const countLocation =
          await findAuthorizedCountLocation(
            transaction,
            inventoryCountId,
            inventoryCountLocationId,
            profile.id
          );

        if (!countLocation) {
          throw new Error(
            "Sayım lokasyonu bulunamadı, sayım aktif değil veya bu sayıma atanmamışsınız."
          );
        }

        if (
          countLocation.status ===
          "COMPLETED"
        ) {
          throw new Error(
            "Lokasyon daha önce tamamlanmış."
          );
        }

        if (
          countLocation.status ===
            "IN_PROGRESS" &&
          countLocation.countedById &&
          countLocation.countedById !==
            profile.id
        ) {
          throw new Error(
            `Bu lokasyonda ${countLocation.countedByName ?? "başka bir personel"} sayım yapıyor.`
          );
        }

        const pendingLines =
          await transaction.inventoryCountLine.findMany({
            where: {
              inventoryCountId,

              inventoryCountLocationId:
                countLocation.id,

              status: {
                in: [
                  InventoryCountLineStatus.PENDING,
                  InventoryCountLineStatus.RECOUNT_REQUIRED,
                ],
              },
            },

            select: {
              id: true,
              systemQuantity: true,
              status: true,
            },
          });

        const now =
          new Date();

        /*
         * Fiziksel sayım sırasında
         * okutulmayan snapshot satırları
         * sıfır sayılmış kabul edilir.
         */
        for (
          const pendingLine of
          pendingLines
        ) {
          await transaction.inventoryCountLine.update({
            where: {
              id:
                pendingLine.id,
            },

            data: {
              status:
                InventoryCountLineStatus.COUNTED,

              countedQuantity:
                0,

              difference:
                -pendingLine.systemQuantity,

              countedById:
                profile.id,

              countedByName:
                operatorName,

              countedAt:
                now,

              note:
                pendingLine.status ===
                InventoryCountLineStatus.RECOUNT_REQUIRED
                  ? "Tekrar sayım satırı okutulmadan lokasyon tamamlandı; miktar sıfır kabul edildi."
                  : "Lokasyon tamamlanırken okutulmadığı için miktar sıfır kabul edildi.",
            },
          });
        }

        const completeResult =
          await transaction.inventoryCountLocation.updateMany({
            where: {
              id:
                countLocation.id,

              status: {
                in: [
                  "PENDING",
                  "IN_PROGRESS",
                ],
              },

              OR: [
                {
                  countedById:
                    profile.id,
                },
                {
                  countedById:
                    null,
                },
              ],
            },

            data: {
              status:
                "COMPLETED",

              startedAt:
                countLocation.status ===
                "PENDING"
                  ? now
                  : undefined,

              completedAt:
                now,

              countedById:
                profile.id,

              countedByName:
                operatorName,
            },
          });

        if (
          completeResult.count !==
          1
        ) {
          throw new Error(
            "Lokasyon durumu değiştiği için tamamlama işlemi yapılamadı."
          );
        }

        const remainingLocationCount =
          await transaction.inventoryCountLocation.count({
            where: {
              inventoryCountId,

              status: {
                not:
                  "COMPLETED",
              },
            },
          });

        allLocationsCompleted =
          remainingLocationCount ===
          0;

        if (
          allLocationsCompleted
        ) {
          const submitResult =
            await transaction.inventoryCount.updateMany({
              where: {
                id:
                  inventoryCountId,

                status: {
                  in:
                    ACTIVE_COUNT_STATUSES,
                },
              },

              data: {
                status:
                  InventoryCountStatus.SUBMITTED,

                submittedAt:
                  now,
              },
            });

          if (
            submitResult.count !==
            1
          ) {
            throw new Error(
              "Sayım durumu değiştiği için onaya gönderilemedi."
            );
          }
        } else {
          await transaction.inventoryCount.updateMany({
            where: {
              id:
                inventoryCountId,

              status:
                InventoryCountStatus.ACTIVE,
            },

            data: {
              status:
                InventoryCountStatus.IN_PROGRESS,

              startedAt:
                now,
            },
          });
        }
      },
      {
        maxWait: 10000,
        timeout: 30000,

        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      }
    );
  } catch (error) {
    console.error(
      "RF planlı sayım lokasyonu tamamlama hatası:",
      error
    );

    redirect(
      createCountUrl(
        inventoryCountId,
        "error",
        error instanceof Error
          ? error.message
          : "Lokasyon tamamlanamadı."
      )
    );
  }

  refreshCountPages(
    inventoryCountId,
    inventoryCountLocationId
  );

  if (allLocationsCompleted) {
    redirect(
      `/rf/inventory-counts?success=${encodeURIComponent(
        "Sayımın tüm lokasyonları tamamlandı ve yönetici onayına gönderildi."
      )}`
    );
  }

  redirect(
    createCountUrl(
      inventoryCountId,
      "success",
      "Lokasyon sayımı tamamlandı."
    )
  );
}