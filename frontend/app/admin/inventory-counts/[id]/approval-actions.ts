"use server";

import {
  InventoryCountLineStatus,
  InventoryCountLocationStatus,
  InventoryCountStatus,
  Prisma,
  StockMovementType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

import { PasswordService } from "@/modules/auth/services/password.service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type LocationProductGroup = {
  locationId: number;
  productId: number;
  productCode: string;
  productName: string;

  snapshotQuantity: number;

  snapshotReservedStock:
    number;

  finalCountedQuantity:
    number;
};

type ProductDifferenceGroup = {
  productId: number;
  productCode: string;
  productName: string;
  totalDifference: number;
};

const APPROVABLE_STATUSES:
  InventoryCountStatus[] = [
    InventoryCountStatus.ACTIVE,
    InventoryCountStatus.IN_PROGRESS,
    InventoryCountStatus.SUBMITTED,
  ];

function validateInventoryCountId(
  inventoryCountId: number
) {
  if (
    !Number.isInteger(
      inventoryCountId
    ) ||
    inventoryCountId <= 0
  ) {
    throw new Error(
      "Geçerli bir sayım kaydı bulunamadı."
    );
  }
}

function getProfileName(
  profile: Awaited<
    ReturnType<
      typeof AuthorizationService.requirePermission
    >
  >
) {
  return profile.employee
    ? `${profile.employee.firstName} ${profile.employee.lastName}`
    : profile.username;
}

function sameDate(
  firstValue: Date | null,
  secondValue: Date | null
) {
  if (
    firstValue === null &&
    secondValue === null
  ) {
    return true;
  }

  if (
    firstValue === null ||
    secondValue === null
  ) {
    return false;
  }

  return (
    firstValue.getTime() ===
    secondValue.getTime()
  );
}

function createDetailUrl(
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
    `/admin/inventory-counts/${inventoryCountId}?` +
    parameters.toString()
  );
}

function refreshInventoryPages(
  inventoryCountId: number
) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");

  revalidatePath(
    "/admin/products"
  );

  revalidatePath(
    "/admin/stock/movements"
  );

  revalidatePath(
    "/admin/stock/locations"
  );

  revalidatePath(
    "/admin/inventory-counts"
  );

  revalidatePath(
    "/admin/inventory-counts/reports"
  );

  revalidatePath(
    `/admin/inventory-counts/${inventoryCountId}`
  );

  revalidatePath("/rf");

  revalidatePath(
    "/rf/inventory-counts"
  );

  revalidatePath(
    `/rf/inventory-counts/${inventoryCountId}`
  );
}

export async function approveInventoryCountAction(
  inventoryCountId: number,
  formData: FormData
): Promise<void> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "INVENTORY_COUNT_APPROVE"
    );

  let incompleteLocationCount =
    0;

  let automaticZeroLineCount =
    0;

  try {
    validateInventoryCountId(
      inventoryCountId
    );

    const approvalPassword =
      String(
        formData.get(
          "approvalPassword"
        ) ?? ""
      );

    if (!approvalPassword) {
      throw new Error(
        "Sayımı onaylamak için giriş şifrenizi yazın."
      );
    }

    const currentUserAccount =
      await prisma.user.findUnique({
        where: {
          id: currentUser.id,
        },

        select: {
          id: true,
          passwordHash: true,
        },
      });

    if (!currentUserAccount) {
      throw new Error(
        "Onaylayan kullanıcı hesabı bulunamadı."
      );
    }

    const passwordValid =
      await PasswordService.verify(
        approvalPassword,
        currentUserAccount.passwordHash
      );

    if (!passwordValid) {
      throw new Error(
        "Onay şifresi hatalı. Sayım onaylanmadı."
      );
    }

    const incompleteLocationsConfirmed =
      formData.get(
        "confirmIncompleteLocations"
      ) === "true";

    const approvedByName =
      getProfileName(
        currentUser
      );

    const approvalResult =
      await prisma.$transaction(
        async (transaction) => {
          const inventoryCount =
            await transaction.inventoryCount.findUnique({
              where: {
                id:
                  inventoryCountId,
              },

              select: {
                id: true,
                countNumber: true,
                status: true,
                submittedAt: true,

                locations: {
                  select: {
                    id: true,

                    locationId:
                      true,

                    locationCode:
                      true,

                    status: true,
                  },
                },

                lines: {
                  orderBy: {
                    id: "asc",
                  },

                  select: {
                    id: true,

                    locationId:
                      true,

                    handlingUnitId:
                      true,

                    productId: true,
                    status: true,

                    locationCode:
                      true,

                    handlingUnitBarcode:
                      true,

                    productCode: true,

                    productName: true,

                    systemQuantity:
                      true,

                    locationSystemQuantity:
                      true,

                    locationReservedStock:
                      true,

                    countedQuantity:
                      true,

                    countedById:
                      true,

                    countedByName:
                      true,

                    countedAt: true,
                    note: true,

                    handlingUnitUpdatedAt:
                      true,

                    handlingUnitItemUpdatedAt:
                      true,
                  },
                },
              },
            });

          if (!inventoryCount) {
            throw new Error(
              "Onaylanacak sayım bulunamadı."
            );
          }

          if (
            !APPROVABLE_STATUSES.includes(
              inventoryCount.status
            )
          ) {
            if (
              inventoryCount.status ===
              InventoryCountStatus.DRAFT
            ) {
              throw new Error(
                "Taslak durumundaki sayım başlatılmadan onaylanamaz."
              );
            }

            if (
              inventoryCount.status ===
              InventoryCountStatus.APPROVED
            ) {
              throw new Error(
                "Bu sayım daha önce onaylanmış."
              );
            }

            if (
              inventoryCount.status ===
              InventoryCountStatus.CANCELLED
            ) {
              throw new Error(
                "İptal edilmiş sayım onaylanamaz."
              );
            }

            throw new Error(
              "Bu sayım mevcut durumunda onaylanamaz."
            );
          }

          if (
            inventoryCount.locations.length ===
            0
          ) {
            throw new Error(
              "Lokasyon bulunmayan sayım onaylanamaz."
            );
          }

          const incompleteLocations =
            inventoryCount.locations.filter(
              (location) =>
                location.status !==
                InventoryCountLocationStatus.COMPLETED
            );

          if (
            incompleteLocations.length >
              0 &&
            !incompleteLocationsConfirmed
          ) {
            throw new Error(
              `${incompleteLocations.length} lokasyon henüz tamamlanmadı. ` +
                "Bu lokasyonlardaki okutulmayan bütün ürünler sıfır kabul edilecektir. " +
                "Devam etmek için uyarıyı onaylayın."
            );
          }

          const recountRequiredLine =
            inventoryCount.lines.find(
              (line) =>
                line.status ===
                InventoryCountLineStatus.RECOUNT_REQUIRED
            );

          if (recountRequiredLine) {
            throw new Error(
              `${recountRequiredLine.locationCode} / ${recountRequiredLine.productCode} satırı tekrar sayım bekliyor. ` +
                "Tekrar sayım tamamlanmadan onay verilemez."
            );
          }

          const handlingUnitIds =
            Array.from(
              new Set(
                inventoryCount.lines.map(
                  (line) =>
                    line.handlingUnitId
                )
              )
            );

          const productIds =
            Array.from(
              new Set(
                inventoryCount.lines.map(
                  (line) =>
                    line.productId
                )
              )
            );

          const locationIds =
            Array.from(
              new Set(
                inventoryCount.lines.map(
                  (line) =>
                    line.locationId
                )
              )
            );

          const [
            handlingUnits,
            locationStocks,
          ] = await Promise.all([
            transaction.handlingUnit.findMany({
              where: {
                id: {
                  in:
                    handlingUnitIds,
                },
              },

              select: {
                id: true,
                barcode: true,
                locationId: true,
                updatedAt: true,

                parentUnit: {
                  select: {
                    locationId:
                      true,
                  },
                },

                items: {
                  where: {
                    productId: {
                      in:
                        productIds,
                    },
                  },

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
            }),

            transaction.warehouseLocationStock.findMany({
              where: {
                locationId: {
                  in:
                    locationIds,
                },

                productId: {
                  in:
                    productIds,
                },
              },

              select: {
                id: true,
                locationId: true,
                productId: true,
                quantity: true,

                reservedStock:
                  true,

                updatedAt: true,
              },
            }),
          ]);

          const handlingUnitMap =
            new Map(
              handlingUnits.map(
                (handlingUnit) => [
                  handlingUnit.id,
                  handlingUnit,
                ]
              )
            );

          const locationStockMap =
            new Map(
              locationStocks.map(
                (locationStock) => [
                  `${locationStock.locationId}:${locationStock.productId}`,
                  locationStock,
                ]
              )
            );

          const locationProductGroups =
            new Map<
              string,
              LocationProductGroup
            >();

          const productDifferenceGroups =
            new Map<
              number,
              ProductDifferenceGroup
            >();

          const finalQuantityByLineId =
            new Map<
              number,
              number
            >();

          const automaticallyZeroedLineIds =
            new Set<number>();

          const approvedAt =
            new Date();

          /*
           * Ürün bazlı global stok
           * farkı, bütün THM satırlarının
           * sayılan eksi sistem
           * miktarlarının toplamıdır.
           */
          for (
            const line of
            inventoryCount.lines
          ) {
            const finalCountedQuantity =
              line.countedQuantity ??
              0;

            finalQuantityByLineId.set(
              line.id,
              finalCountedQuantity
            );

            if (
              line.countedQuantity ===
              null
            ) {
              automaticallyZeroedLineIds.add(
                line.id
              );
            }

            const handlingUnit =
              handlingUnitMap.get(
                line.handlingUnitId
              );

            if (!handlingUnit) {
              throw new Error(
                `${line.handlingUnitBarcode} THM'si artık sistemde bulunmuyor. Sayım onaylanamaz.`
              );
            }

            const effectiveLocationId =
              handlingUnit.locationId ??
              handlingUnit.parentUnit
                ?.locationId ??
              null;

            if (
              effectiveLocationId !==
              line.locationId
            ) {
              throw new Error(
                `${line.handlingUnitBarcode} THM'sinin lokasyonu sayımdan sonra değişmiş. Sayım onaylanamaz.`
              );
            }

            if (
              line.handlingUnitUpdatedAt &&
              !sameDate(
                handlingUnit.updatedAt,
                line.handlingUnitUpdatedAt
              )
            ) {
              throw new Error(
                `${line.handlingUnitBarcode} THM kaydı sayımdan sonra değiştirilmiş. Sayım onaylanamaz.`
              );
            }

            const handlingUnitItem =
              handlingUnit.items.find(
                (item) =>
                  item.productId ===
                  line.productId
              ) ?? null;

            const currentItemQuantity =
              handlingUnitItem
                ?.quantity ??
              0;

            const currentReservedStock =
              handlingUnitItem
                ?.reservedStock ??
              0;

            if (
              currentItemQuantity !==
              line.systemQuantity
            ) {
              throw new Error(
                `${line.handlingUnitBarcode} / ${line.productCode} stok miktarı sayımdan sonra değişmiş. ` +
                  `Snapshot: ${line.systemQuantity}, güncel: ${currentItemQuantity}.`
              );
            }

            if (
              line.handlingUnitItemUpdatedAt &&
              (
                !handlingUnitItem ||
                !sameDate(
                  handlingUnitItem.updatedAt,
                  line.handlingUnitItemUpdatedAt
                )
              )
            ) {
              throw new Error(
                `${line.handlingUnitBarcode} / ${line.productCode} THM stok kaydı sayımdan sonra değiştirilmiş.`
              );
            }

            if (
              finalCountedQuantity <
              currentReservedStock
            ) {
              throw new Error(
                `${line.handlingUnitBarcode} / ${line.productCode} için sayım sonucu rezerve miktardan az. ` +
                  `Sayım sonucu: ${finalCountedQuantity}, rezerve: ${currentReservedStock}. ` +
                  "İlgili rezervasyon çözülmeden sayım onaylanamaz."
              );
            }

            const lineDifference =
              finalCountedQuantity -
              line.systemQuantity;

            const existingProductGroup =
              productDifferenceGroups.get(
                line.productId
              );

            if (
              existingProductGroup
            ) {
              existingProductGroup.totalDifference +=
                lineDifference;
            } else {
              productDifferenceGroups.set(
                line.productId,
                {
                  productId:
                    line.productId,

                  productCode:
                    line.productCode,

                  productName:
                    line.productName,

                  totalDifference:
                    lineDifference,
                }
              );
            }

            const locationProductKey =
              `${line.locationId}:${line.productId}`;

            const existingLocationGroup =
              locationProductGroups.get(
                locationProductKey
              );

            if (
              existingLocationGroup
            ) {
              if (
                existingLocationGroup.snapshotQuantity !==
                  line.locationSystemQuantity ||
                existingLocationGroup.snapshotReservedStock !==
                  line.locationReservedStock
              ) {
                throw new Error(
                  `${line.locationCode} / ${line.productCode} snapshot bilgileri tutarlı değil.`
                );
              }

              existingLocationGroup.finalCountedQuantity +=
                finalCountedQuantity;
            } else {
              locationProductGroups.set(
                locationProductKey,
                {
                  locationId:
                    line.locationId,

                  productId:
                    line.productId,

                  productCode:
                    line.productCode,

                  productName:
                    line.productName,

                  snapshotQuantity:
                    line.locationSystemQuantity,

                  snapshotReservedStock:
                    line.locationReservedStock,

                  finalCountedQuantity,
                }
              );
            }
          }

          /*
           * Lokasyon kayıtları
           * doğrulanır. Lokasyonun yeni
           * miktarı doğrudan sayılan
           * THM toplamı olacaktır.
           */
          for (
            const [
              key,
              group,
            ] of locationProductGroups
          ) {
            const currentLocationStock =
              locationStockMap.get(
                key
              );

            const currentQuantity =
              currentLocationStock
                ?.quantity ??
              0;

            const currentReservedStock =
              currentLocationStock
                ?.reservedStock ??
              0;

            if (
              currentQuantity !==
              group.snapshotQuantity
            ) {
              throw new Error(
                `${group.productCode} ürününün lokasyon stoğu sayımdan sonra değişmiş. ` +
                  `Snapshot: ${group.snapshotQuantity}, güncel: ${currentQuantity}.`
              );
            }

            if (
              currentReservedStock !==
              group.snapshotReservedStock
            ) {
              throw new Error(
                `${group.productCode} ürününün lokasyon rezervasyonu sayımdan sonra değişmiş.`
              );
            }

            if (
              group.finalCountedQuantity <
              currentReservedStock
            ) {
              throw new Error(
                `${group.productCode} için sayım sonucu rezerve miktardan az. ` +
                  `Sayım sonucu: ${group.finalCountedQuantity}, rezerve: ${currentReservedStock}. ` +
                  "İlgili rezervasyon çözülmeden sayım onaylanamaz."
              );
            }
          }

          const transitionResult =
            await transaction.inventoryCount.updateMany({
              where: {
                id:
                  inventoryCount.id,

                status: {
                  in:
                    APPROVABLE_STATUSES,
                },
              },

              data: {
                status:
                  InventoryCountStatus.APPROVED,

                submittedAt:
                  inventoryCount.submittedAt ??
                  approvedAt,

                approvedAt,

                approvedById:
                  currentUser.id,

                approvedByName,
              },
            });

          if (
            transitionResult.count !==
            1
          ) {
            throw new Error(
              "Sayım durumu değiştiği için onay işlemi tamamlanamadı."
            );
          }

          /*
           * THM ürün miktarları sayım
           * sonuçlarına eşitlenir.
           */
          for (
            const line of
            inventoryCount.lines
          ) {
            const finalCountedQuantity =
              finalQuantityByLineId.get(
                line.id
              ) ?? 0;

            const handlingUnit =
              handlingUnitMap.get(
                line.handlingUnitId
              );

            const existingItem =
              handlingUnit?.items.find(
                (item) =>
                  item.productId ===
                  line.productId
              ) ?? null;

            await transaction.handlingUnitItem.upsert({
              where: {
                handling_unit_product_unique: {
                  handlingUnitId:
                    line.handlingUnitId,

                  productId:
                    line.productId,
                },
              },

              update: {
                quantity:
                  finalCountedQuantity,
              },

              create: {
                handlingUnitId:
                  line.handlingUnitId,

                productId:
                  line.productId,

                quantity:
                  finalCountedQuantity,

                reservedStock:
                  existingItem
                    ?.reservedStock ??
                  0,
              },
            });
          }

          /*
           * Lokasyon miktarı doğrudan
           * lokasyondaki sayılan THM
           * toplamına eşitlenir.
           */
          for (
            const [
              key,
              group,
            ] of locationProductGroups
          ) {
            const currentLocationStock =
              locationStockMap.get(
                key
              );

            await transaction.warehouseLocationStock.upsert({
              where: {
                location_product_unique: {
                  locationId:
                    group.locationId,

                  productId:
                    group.productId,
                },
              },

              update: {
                quantity:
                  group.finalCountedQuantity,
              },

              create: {
                locationId:
                  group.locationId,

                productId:
                  group.productId,

                quantity:
                  group.finalCountedQuantity,

                reservedStock:
                  currentLocationStock
                    ?.reservedStock ??
                  0,
              },
            });
          }

          /*
           * Ürünün tüm THM satırlarının
           * toplam farkı sıfırsa hiçbir
           * stok hareketi oluşturulmaz.
           */
          for (
            const group of
            productDifferenceGroups.values()
          ) {
            if (
              group.totalDifference ===
              0
            ) {
              continue;
            }

            await createStockMovementWithTransaction(
              transaction,
              {
                productId:
                  group.productId,

                movementType:
                  group.totalDifference >
                  0
                    ? StockMovementType.COUNT_INCREASE
                    : StockMovementType.COUNT_DECREASE,

                physicalChange:
                  group.totalDifference,

                reservedChange: 0,

                documentNumber:
                  inventoryCount.countNumber,

                description:
                  `${inventoryCount.countNumber} numaralı planlı sayım sonucu: ` +
                  `${group.productCode} - ${group.productName}, ` +
                  (
                    group.totalDifference >
                    0
                      ? `sayım fazlası +${group.totalDifference}.`
                      : `sayım eksiği ${group.totalDifference}.`
                  ),
              }
            );
          }

          /*
           * Okutulmayan ürünler sıfır
           * sayılmış olarak kayıt altına
           * alınır.
           */
          for (
            const line of
            inventoryCount.lines
          ) {
            const finalCountedQuantity =
              finalQuantityByLineId.get(
                line.id
              ) ?? 0;

            const automaticallyZeroed =
              automaticallyZeroedLineIds.has(
                line.id
              );

            const automaticNote =
              "Sayım onayı sırasında okutulmadığı için miktar otomatik olarak 0 kabul edildi.";

            await transaction.inventoryCountLine.update({
              where: {
                id:
                  line.id,
              },

              data: {
                status:
                  InventoryCountLineStatus.APPROVED,

                countedQuantity:
                  finalCountedQuantity,

                difference:
                  finalCountedQuantity -
                  line.systemQuantity,

                appliedQuantityChange:
                  finalCountedQuantity -
                  line.systemQuantity,

                countedById:
                  line.countedById ??
                  (
                    automaticallyZeroed
                      ? currentUser.id
                      : null
                  ),

                countedByName:
                  line.countedByName ??
                  (
                    automaticallyZeroed
                      ? approvedByName
                      : null
                  ),

                countedAt:
                  line.countedAt ??
                  (
                    automaticallyZeroed
                      ? approvedAt
                      : null
                  ),

                note:
                  automaticallyZeroed
                    ? line.note
                      ? `${line.note}\n${automaticNote}`
                      : automaticNote
                    : line.note,

                approvedAt,
              },
            });
          }

          return {
            incompleteLocationCount:
              incompleteLocations.length,

            automaticZeroLineCount:
              automaticallyZeroedLineIds.size,
          };
        },
        {
          maxWait: 10000,
          timeout: 120000,

          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );

    incompleteLocationCount =
      approvalResult.incompleteLocationCount;

    automaticZeroLineCount =
      approvalResult.automaticZeroLineCount;
  } catch (error) {
    console.error(
      "Planlı sayım onaylama hatası:",
      error
    );

    redirect(
      createDetailUrl(
        inventoryCountId,
        "error",
        error instanceof Error
          ? error.message
          : "Planlı sayım onaylanamadı."
      )
    );
  }

  refreshInventoryPages(
    inventoryCountId
  );

  const successMessage =
    incompleteLocationCount > 0
      ? (
          `Sayım onaylandı. ${incompleteLocationCount} tamamlanmamış lokasyondaki ` +
          `${automaticZeroLineCount} okutulmayan ürün satırı 0 kabul edilerek stoklara uygulandı.`
        )
      : "Sayım onaylandı ve stok farkları sisteme uygulandı.";

  redirect(
    createDetailUrl(
      inventoryCountId,
      "success",
      successMessage
    )
  );
}