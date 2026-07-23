"use server";

import {
  InventoryCountLineStatus,
  InventoryCountStatus,
  Prisma,
  StockMovementType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type LocationProductGroup = {
  locationId: number;
  productId: number;
  productCode: string;
  productName: string;
  snapshotQuantity: number;
  snapshotReservedStock: number;
  totalDifference: number;
};

type ProductDifferenceGroup = {
  productId: number;
  productCode: string;
  productName: string;
  totalDifference: number;
};

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
    `/admin/inventory-counts/${inventoryCountId}`
  );

  revalidatePath("/rf");
  revalidatePath(
    "/rf/inventory-counts"
  );
}

export async function approveInventoryCountAction(
  inventoryCountId: number,
  _formData: FormData
): Promise<void> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "INVENTORY_COUNT_APPROVE"
    );

  try {
    validateInventoryCountId(
      inventoryCountId
    );

    const approvedByName =
      getProfileName(
        currentUser
      );

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

              locations: {
                select: {
                  id: true,
                  status: true,
                },
              },

              lines: {
                orderBy: {
                  id: "asc",
                },

                select: {
                  id: true,
                  locationId: true,
                  handlingUnitId: true,
                  productId: true,
                  status: true,

                  locationCode: true,

                  handlingUnitBarcode:
                    true,

                  productCode: true,
                  productName: true,

                  systemQuantity:
                    true,

                  systemReservedStock:
                    true,

                  locationSystemQuantity:
                    true,

                  locationReservedStock:
                    true,

                  countedQuantity:
                    true,

                  handlingUnitUpdatedAt:
                    true,

                  handlingUnitItemUpdatedAt:
                    true,

                  locationStockUpdatedAt:
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
          inventoryCount.status !==
          InventoryCountStatus.SUBMITTED
        ) {
          throw new Error(
            "Yalnızca Onay Bekliyor durumundaki sayım onaylanabilir."
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

        const incompleteLocation =
          inventoryCount.locations.find(
            (location) =>
              location.status !==
              "COMPLETED"
          );

        if (incompleteLocation) {
          throw new Error(
            "Tüm lokasyonlar tamamlanmadan sayım onaylanamaz."
          );
        }

        const invalidLine =
          inventoryCount.lines.find(
            (line) =>
              line.status !==
                InventoryCountLineStatus.COUNTED ||
              line.countedQuantity ===
                null
          );

        if (invalidLine) {
          throw new Error(
            "Sayımda tamamlanmamış veya tekrar sayılması gereken ürün satırı bulunuyor."
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

        const approvedAt =
          new Date();

        /*
         * Önce bütün satırlar mevcut
         * operasyonel stok kayıtlarıyla
         * karşılaştırılır. Bir çakışma
         * varsa hiçbir stok güncellenmez.
         */
        for (
          const line of
          inventoryCount.lines
        ) {
          if (
            line.countedQuantity ===
            null
          ) {
            throw new Error(
              `${line.productCode} ürünü için sayım miktarı bulunamadı.`
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
            line.countedQuantity <
            currentReservedStock
          ) {
            throw new Error(
              `${line.handlingUnitBarcode} / ${line.productCode} için sayılan miktar rezerve miktardan az. ` +
                `Sayılan: ${line.countedQuantity}, rezerve: ${currentReservedStock}.`
            );
          }

          const difference =
            line.countedQuantity -
            line.systemQuantity;

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

            existingLocationGroup.totalDifference +=
              difference;
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

                totalDifference:
                  difference,
              }
            );
          }

          const existingProductGroup =
            productDifferenceGroups.get(
              line.productId
            );

          if (
            existingProductGroup
          ) {
            existingProductGroup.totalDifference +=
              difference;
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
                  difference,
              }
            );
          }
        }

        /*
         * Lokasyon bazlı toplamların da
         * snapshot sonrasında değişmediği
         * doğrulanır.
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

          const nextLocationQuantity =
            currentQuantity +
            group.totalDifference;

          if (
            nextLocationQuantity < 0
          ) {
            throw new Error(
              `${group.productCode} için hesaplanan lokasyon stoğu sıfırın altına düşüyor.`
            );
          }

          if (
            nextLocationQuantity <
            currentReservedStock
          ) {
            throw new Error(
              `${group.productCode} için hesaplanan lokasyon stoğu rezerve miktardan az.`
            );
          }
        }

        /*
         * Durum geçişi atomik olarak
         * kilitlenir. Başka bir işlem
         * durumu değiştirdiyse transaction
         * iptal edilir.
         */
        const transitionResult =
          await transaction.inventoryCount.updateMany({
            where: {
              id:
                inventoryCount.id,

              status:
                InventoryCountStatus.SUBMITTED,
            },

            data: {
              status:
                InventoryCountStatus.APPROVED,

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
         * THM ürün bakiyeleri sayılan
         * fiziksel miktara eşitlenir.
         */
        for (
          const line of
          inventoryCount.lines
        ) {
          if (
            line.countedQuantity ===
            null
          ) {
            throw new Error(
              "Sayım miktarı bulunamadı."
            );
          }

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
                line.countedQuantity,
            },

            create: {
              handlingUnitId:
                line.handlingUnitId,

              productId:
                line.productId,

              quantity:
                line.countedQuantity,

              reservedStock:
                existingItem
                  ?.reservedStock ??
                0,
            },
          });
        }

        /*
         * Lokasyon bakiyeleri, aynı ürün
         * için bütün THM farkları
         * toplandıktan sonra tek seferde
         * güncellenir.
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

          const nextQuantity =
            (
              currentLocationStock
                ?.quantity ??
              0
            ) +
            group.totalDifference;

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
                nextQuantity,
            },

            create: {
              locationId:
                group.locationId,

              productId:
                group.productId,

              quantity:
                nextQuantity,

              reservedStock:
                currentLocationStock
                  ?.reservedStock ??
                0,
            },
          });
        }

        /*
         * Global ürün stokları ve stok
         * hareketleri ürün bazında tek
         * hareketle oluşturulur.
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

              reservedChange:
                0,

              documentNumber:
                inventoryCount.countNumber,

              description:
                `${inventoryCount.countNumber} numaralı planlı sayım onayı: ` +
                `${group.productCode} - ${group.productName}, ` +
                `stok farkı ${group.totalDifference}.`,
            }
          );
        }

        await transaction.inventoryCountLine.updateMany({
          where: {
            inventoryCountId:
              inventoryCount.id,
          },

          data: {
            status:
              InventoryCountLineStatus.APPROVED,

            approvedAt,
          },
        });

        for (
          const line of
          inventoryCount.lines
        ) {
          if (
            line.countedQuantity ===
            null
          ) {
            continue;
          }

          await transaction.inventoryCountLine.update({
            where: {
              id:
                line.id,
            },

            data: {
              appliedQuantityChange:
                line.countedQuantity -
                line.systemQuantity,
            },
          });
        }
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

  redirect(
    createDetailUrl(
      inventoryCountId,
      "success",
      "Sayım onaylandı ve stok farkları sisteme uygulandı."
    )
  );
}