"use server";

import {
  HandlingUnitStatus,
  Prisma,
  StockMovementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type FullHandlingUnitTransferState = {
  success: boolean;
  message: string;

  sourceUnitId: number | null;
  sourceBarcode: string;
  sourceRemainingQuantity: number;

  targetUnitId: number | null;
  targetBarcode: string;
  targetTotalQuantity: number;

  transferredProductCount: number;
  transferredQuantity: number;
};

const emptyState: FullHandlingUnitTransferState =
  {
    success: false,
    message: "",

    sourceUnitId: null,
    sourceBarcode: "",
    sourceRemainingQuantity: 0,

    targetUnitId: null,
    targetBarcode: "",
    targetTotalQuantity: 0,

    transferredProductCount: 0,
    transferredQuantity: 0,
  };

function createErrorState(
  message: string
): FullHandlingUnitTransferState {
  return {
    ...emptyState,
    message,
  };
}

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function canBeSource(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.CLOSED ||
    status === HandlingUnitStatus.STORED
  );
}

function canBeTarget(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

export async function fullTransferHandlingUnit(
  _previousState: FullHandlingUnitTransferState,
  formData: FormData
): Promise<FullHandlingUnitTransferState> {
  await AuthorizationService.requirePermission(
    "TRANSFER_EXECUTE"
  );

  const sourceBarcode =
    normalizeBarcode(
      formData.get("sourceBarcode")
    );

  const targetBarcode =
    normalizeBarcode(
      formData.get("targetBarcode")
    );

  if (!sourceBarcode) {
    return createErrorState(
      "Kaynak koli veya palet barkodunu okutun."
    );
  }

  if (!targetBarcode) {
    return createErrorState(
      "Hedef koli veya palet barkodunu okutun."
    );
  }

  if (
    sourceBarcode === targetBarcode
  ) {
    return createErrorState(
      "Kaynak ve hedef taşıma birimi aynı olamaz."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const [
            sourceUnit,
            targetUnit,
          ] = await Promise.all([
            tx.handlingUnit.findUnique({
              where: {
                barcode:
                  sourceBarcode,
              },
              select: {
                id: true,
                barcode: true,
                unitType: true,
                status: true,
                warehouseId: true,
                locationId: true,
                parentUnitId: true,
                childUnits: {
                  select: {
                    id: true,
                    barcode: true,
                  },
                },
                items: {
                  orderBy: {
                    product: {
                      code: "asc",
                    },
                  },
                  select: {
                    id: true,
                    productId: true,
                    quantity: true,
                    reservedStock: true,
                    product: {
                      select: {
                        id: true,
                        code: true,
                        barcode: true,
                        name: true,
                        stock: true,
                        reservedStock: true,
                      },
                    },
                  },
                },
              },
            }),
            tx.handlingUnit.findUnique({
              where: {
                barcode:
                  targetBarcode,
              },
              select: {
                id: true,
                barcode: true,
                unitType: true,
                status: true,
                warehouseId: true,
                locationId: true,
                parentUnitId: true,
              },
            }),
          ]);

          if (!sourceUnit) {
            throw new Error(
              `${sourceBarcode} barkodlu kaynak koli veya palet bulunamadı.`
            );
          }

          if (!targetUnit) {
            throw new Error(
              `${targetBarcode} barkodlu hedef koli veya palet bulunamadı.`
            );
          }

          if (
            sourceUnit.id ===
            targetUnit.id
          ) {
            throw new Error(
              "Kaynak ve hedef taşıma birimi aynı olamaz."
            );
          }

          if (
            !canBeSource(
              sourceUnit.status
            )
          ) {
            throw new Error(
              `${sourceUnit.barcode} kaynak birimi komple transfere uygun değildir.`
            );
          }

          if (
            !canBeTarget(
              targetUnit.status
            )
          ) {
            throw new Error(
              `${targetUnit.barcode} hedef birimi ürün kabul etmeye uygun değildir.`
            );
          }

          if (
            sourceUnit.childUnits.length >
            0
          ) {
            throw new Error(
              `${sourceUnit.barcode} üzerinde bağlı alt koliler bulunuyor. ` +
                "Komple ürün transferinden önce bağlı kolileri ayırın veya başka palete bağlayın."
            );
          }

          if (
            sourceUnit.items.length === 0
          ) {
            throw new Error(
              `${sourceUnit.barcode} içinde transfer edilecek ürün bulunmuyor.`
            );
          }

          const reservedItem =
            sourceUnit.items.find(
              (item) =>
                item.reservedStock > 0
            );

          if (reservedItem) {
            throw new Error(
              `${sourceUnit.barcode} içinde rezerve stok bulunduğu için komple transfer yapılamaz. ` +
                `${reservedItem.product.code} - ${reservedItem.product.name}, ` +
                `rezerve miktar: ${reservedItem.reservedStock}.`
            );
          }

          const transferableItems =
            sourceUnit.items.filter(
              (item) =>
                item.quantity > 0
            );

          if (
            transferableItems.length === 0
          ) {
            throw new Error(
              `${sourceUnit.barcode} içinde pozitif miktarlı ürün bulunmuyor.`
            );
          }

          const transferredQuantity =
            transferableItems.reduce(
              (total, item) =>
                total + item.quantity,
              0
            );

          for (
            const item of
            transferableItems
          ) {
            await tx.handlingUnitItem.upsert({
              where: {
                handling_unit_product_unique:
                  {
                    handlingUnitId:
                      targetUnit.id,
                    productId:
                      item.productId,
                  },
              },
              update: {
                quantity: {
                  increment:
                    item.quantity,
                },
              },
              create: {
                handlingUnitId:
                  targetUnit.id,
                productId:
                  item.productId,
                quantity:
                  item.quantity,
                reservedStock: 0,
              },
            });

            /*
             * THM içi transfer global ürün
             * stoğunu değiştirmez.
             *
             * TRANSFER_OUT ve TRANSFER_IN
             * kayıtlarında fiziksel değişim
             * sıfırdır.
             */
            await tx.stockMovement.createMany({
              data: [
                {
                  productId:
                    item.productId,
                  movementType:
                    StockMovementType.TRANSFER_OUT,
                  physicalChange: 0,
                  reservedChange: 0,
                  physicalBalanceAfter:
                    item.product.stock,
                  reservedBalanceAfter:
                    item.product.reservedStock,
                  availableBalanceAfter:
                    item.product.stock -
                    item.product.reservedStock,
                  documentNumber:
                    `THM-${sourceUnit.barcode}-${targetUnit.barcode}`,
                  description:
                    `${item.quantity} adet ürün ${sourceUnit.barcode} THM kaynağından çıkarılarak ` +
                    `${targetUnit.barcode} hedefine aktarıldı.`,
                },
                {
                  productId:
                    item.productId,
                  movementType:
                    StockMovementType.TRANSFER_IN,
                  physicalChange: 0,
                  reservedChange: 0,
                  physicalBalanceAfter:
                    item.product.stock,
                  reservedBalanceAfter:
                    item.product.reservedStock,
                  availableBalanceAfter:
                    item.product.stock -
                    item.product.reservedStock,
                  documentNumber:
                    `THM-${sourceUnit.barcode}-${targetUnit.barcode}`,
                  description:
                    `${item.quantity} adet ürün ${sourceUnit.barcode} kaynağından ` +
                    `${targetUnit.barcode} THM hedefine alındı.`,
                },
              ],
            });
          }

          await tx.handlingUnitItem.deleteMany({
            where: {
              handlingUnitId:
                sourceUnit.id,
            },
          });

          /*
           * Kaynak fiziksel olarak mevcut
           * adresinde kalır. Yalnızca içeriği
           * boşaltılır ve durumu EMPTY olur.
           */
          await tx.handlingUnit.update({
            where: {
              id: sourceUnit.id,
            },
            data: {
              status:
                HandlingUnitStatus.EMPTY,
            },
          });

          /*
           * Hedef adresliyse STORED,
           * adressizse OPEN durumunda olur.
           */
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
            sourceUnitId:
              sourceUnit.id,
            sourceBarcode:
              sourceUnit.barcode,

            targetUnitId:
              targetUnit.id,
            targetBarcode:
              targetUnit.barcode,

            transferredProductCount:
              transferableItems.length,
            transferredQuantity,

            targetTotalQuantity:
              targetStockSummary._sum
                .quantity ?? 0,
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

    revalidatePath("/rf");

    revalidatePath(
      "/rf/full-transfer"
    );

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      "/admin/handling-units/full-transfer"
    );

    revalidatePath(
      "/admin/handling-units/transfers"
    );

    revalidatePath(
      "/admin/handling-units/merge"
    );

    revalidatePath(
      "/admin/stock/location-map"
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    revalidatePath(
      "/admin/stock/movements"
    );

    revalidatePath(
      `/admin/handling-units/${result.sourceUnitId}`
    );

    revalidatePath(
      `/admin/handling-units/${result.targetUnitId}`
    );

    return {
      success: true,
      message:
        `${result.sourceBarcode} içindeki ${result.transferredProductCount} farklı ürün ve ` +
        `toplam ${result.transferredQuantity} adet stok, ` +
        `${result.targetBarcode} hedefine komple transfer edildi.`,

      sourceUnitId:
        result.sourceUnitId,
      sourceBarcode:
        result.sourceBarcode,
      sourceRemainingQuantity: 0,

      targetUnitId:
        result.targetUnitId,
      targetBarcode:
        result.targetBarcode,
      targetTotalQuantity:
        result.targetTotalQuantity,

      transferredProductCount:
        result.transferredProductCount,
      transferredQuantity:
        result.transferredQuantity,
    };
  } catch (error) {
    console.error(
      "Komple THM transfer hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Komple transferi tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Komple THM transferi sırasında beklenmeyen bir hata oluştu."
    );
  }
}