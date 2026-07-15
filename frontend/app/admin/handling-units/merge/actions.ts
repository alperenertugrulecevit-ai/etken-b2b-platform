"use server";

import {
  HandlingUnitStatus,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type HandlingUnitBulkMergeState = {
  success: boolean;
  message: string;

  targetBarcode: string;
  targetStockQuantity: number;

  mergedSourceCount: number;
  transferredProductCount: number;
  transferredQuantity: number;
};

const emptyState: HandlingUnitBulkMergeState = {
  success: false,
  message: "",

  targetBarcode: "",
  targetStockQuantity: 0,

  mergedSourceCount: 0,
  transferredProductCount: 0,
  transferredQuantity: 0,
};

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function createErrorState(
  message: string
): HandlingUnitBulkMergeState {
  return {
    ...emptyState,
    message,
  };
}

function parseSourceBarcodes(
  value: FormDataEntryValue | null
) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(
      String(value)
    );

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return Array.from(
      new Set(
        parsedValue
          .map((item) =>
            String(item)
              .trim()
              .toUpperCase()
          )
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
}

function canBeMergeSource(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.STORED
  );
}

function canBeMergeTarget(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

export async function mergeHandlingUnits(
  _previousState: HandlingUnitBulkMergeState,
  formData: FormData
): Promise<HandlingUnitBulkMergeState> {
  const targetBarcode =
    normalizeBarcode(
      formData.get("targetBarcode")
    );

  const sourceBarcodes =
    parseSourceBarcodes(
      formData.get("sourceBarcodes")
    );

  if (!targetBarcode) {
    return createErrorState(
      "Hedef koli veya palet barkodunu okutun."
    );
  }

  if (sourceBarcodes.length === 0) {
    return createErrorState(
      "Birleştirilecek en az bir kaynak koli veya palet seçin."
    );
  }

  if (
    sourceBarcodes.includes(
      targetBarcode
    )
  ) {
    return createErrorState(
      "Hedef taşıma birimi kaynak listesinde bulunamaz."
    );
  }

  if (sourceBarcodes.length > 100) {
    return createErrorState(
      "Tek işlemde en fazla 100 kaynak taşıma birimi birleştirilebilir."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const targetUnit =
            await tx.handlingUnit.findUnique({
              where: {
                barcode:
                  targetBarcode,
              },

              select: {
                id: true,
                barcode: true,
                status: true,
                warehouseId: true,
                locationId: true,
                parentUnitId: true,
              },
            });

          if (!targetUnit) {
            throw new Error(
              `${targetBarcode} barkodlu hedef koli veya palet bulunamadı.`
            );
          }

          if (
            !canBeMergeTarget(
              targetUnit.status
            )
          ) {
            throw new Error(
              `${targetUnit.barcode} hedef birimi ürün kabul etmeye uygun değil. ` +
                "Hedef Açık, Boş veya Adreslendi durumunda olmalıdır."
            );
          }

          const sourceUnits =
            await tx.handlingUnit.findMany({
              where: {
                barcode: {
                  in: sourceBarcodes,
                },
              },

              orderBy: {
                barcode: "asc",
              },

              select: {
                id: true,
                barcode: true,
                status: true,
                warehouseId: true,
                locationId: true,
                parentUnitId: true,

                items: {
                  select: {
                    id: true,
                    productId: true,
                    quantity: true,
                    reservedStock: true,

                    product: {
                      select: {
                        code: true,
                        name: true,
                      },
                    },
                  },
                },

                childUnits: {
                  select: {
                    id: true,
                    barcode: true,
                  },
                },
              },
            });

          if (
            sourceUnits.length !==
            sourceBarcodes.length
          ) {
            const foundBarcodes =
              new Set(
                sourceUnits.map(
                  (unit) =>
                    unit.barcode
                )
              );

            const missingBarcodes =
              sourceBarcodes.filter(
                (barcode) =>
                  !foundBarcodes.has(
                    barcode
                  )
              );

            throw new Error(
              `Bazı kaynak taşıma birimleri bulunamadı: ${missingBarcodes.join(
                ", "
              )}.`
            );
          }

          for (
            const sourceUnit of sourceUnits
          ) {
            if (
              sourceUnit.id ===
              targetUnit.id
            ) {
              throw new Error(
                "Hedef taşıma birimi kaynak listesinde bulunamaz."
              );
            }

            if (
              !canBeMergeSource(
                sourceUnit.status
              )
            ) {
              throw new Error(
                `${sourceUnit.barcode} kaynak birimi birleştirmeye uygun değil. ` +
                  "Kaynak Açık veya Adreslendi durumunda olmalıdır."
              );
            }

            if (
              sourceUnit.childUnits.length >
              0
            ) {
              throw new Error(
                `${sourceUnit.barcode} içinde bağlı alt koli bulunuyor. ` +
                  "Önce alt kolileri ayırın veya başka palete bağlayın."
              );
            }

            const reservedItem =
              sourceUnit.items.find(
                (item) =>
                  item.reservedStock > 0
              );

            if (reservedItem) {
              throw new Error(
                `${sourceUnit.barcode} içinde rezerve edilmiş ürün bulunuyor. ` +
                  `${reservedItem.product.code} - ${reservedItem.product.name}, ` +
                  `rezerve miktar: ${reservedItem.reservedStock}.`
              );
            }
          }

          const productTotals =
            new Map<number, number>();

          let transferredQuantity = 0;

          for (
            const sourceUnit of sourceUnits
          ) {
            for (
              const item of sourceUnit.items
            ) {
              if (item.quantity <= 0) {
                continue;
              }

              const currentQuantity =
                productTotals.get(
                  item.productId
                ) ?? 0;

              productTotals.set(
                item.productId,
                currentQuantity +
                  item.quantity
              );

              transferredQuantity +=
                item.quantity;
            }
          }

          if (
            transferredQuantity <= 0
          ) {
            throw new Error(
              "Seçilen kaynak taşıma birimlerinde aktarılabilecek ürün bulunmuyor."
            );
          }

          for (
            const [
              productId,
              quantity,
            ] of productTotals.entries()
          ) {
            await tx.handlingUnitItem.upsert({
              where: {
                handling_unit_product_unique:
                  {
                    handlingUnitId:
                      targetUnit.id,

                    productId,
                  },
              },

              update: {
                quantity: {
                  increment: quantity,
                },
              },

              create: {
                handlingUnitId:
                  targetUnit.id,

                productId,
                quantity,
                reservedStock: 0,
              },
            });
          }

          await tx.handlingUnitItem.deleteMany({
            where: {
              handlingUnitId: {
                in: sourceUnits.map(
                  (unit) => unit.id
                ),
              },
            },
          });

          /*
           * Kaynakların adresleri korunur.
           * İçerikleri boşaldığı için yalnızca
           * durumları EMPTY yapılır.
           */
          await tx.handlingUnit.updateMany({
            where: {
              id: {
                in: sourceUnits.map(
                  (unit) => unit.id
                ),
              },
            },

            data: {
              status:
                HandlingUnitStatus.EMPTY,
            },
          });

          if (
            targetUnit.status ===
            HandlingUnitStatus.EMPTY
          ) {
            const targetNextStatus =
              targetUnit.warehouseId &&
              targetUnit.locationId
                ? HandlingUnitStatus.STORED
                : HandlingUnitStatus.OPEN;

            await tx.handlingUnit.update({
              where: {
                id: targetUnit.id,
              },

              data: {
                status:
                  targetNextStatus,
              },
            });
          }

          const targetStockSummary =
            await tx.handlingUnitItem.aggregate({
              where: {
                handlingUnitId:
                  targetUnit.id,
              },

              _sum: {
                quantity: true,
              },
            });

          return {
            targetUnitId:
              targetUnit.id,

            targetBarcode:
              targetUnit.barcode,

            targetStockQuantity:
              targetStockSummary._sum
                .quantity ?? 0,

            sourceUnitIds:
              sourceUnits.map(
                (unit) => unit.id
              ),

            mergedSourceCount:
              sourceUnits.length,

            transferredProductCount:
              productTotals.size,

            transferredQuantity,
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

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      "/admin/handling-units/merge"
    );

    revalidatePath(
      "/admin/handling-units/transfers"
    );

    revalidatePath(
      "/admin/handling-units/addressing"
    );

    revalidatePath(
      `/admin/handling-units/${result.targetUnitId}`
    );

    for (
      const sourceUnitId of
      result.sourceUnitIds
    ) {
      revalidatePath(
        `/admin/handling-units/${sourceUnitId}`
      );
    }

    revalidatePath(
      "/admin/stock/locations"
    );

    return {
      success: true,

      message:
        `${result.mergedSourceCount} kaynak taşıma biriminin içeriği ` +
        `${result.targetBarcode} hedefine başarıyla birleştirildi. ` +
        `${result.transferredProductCount} farklı ürün, ` +
        `toplam ${result.transferredQuantity} adet transfer edildi.`,

      targetBarcode:
        result.targetBarcode,

      targetStockQuantity:
        result.targetStockQuantity,

      mergedSourceCount:
        result.mergedSourceCount,

      transferredProductCount:
        result.transferredProductCount,

      transferredQuantity:
        result.transferredQuantity,
    };
  } catch (error) {
    console.error(
      "Toplu taşıma birimi birleştirme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen birleştirme işlemini tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Taşıma birimleri birleştirilirken beklenmeyen bir hata oluştu."
    );
  }
}