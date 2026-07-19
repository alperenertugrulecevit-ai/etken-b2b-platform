"use server";

import {
  HandlingUnitStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type HandlingUnitTransferState = {
  success: boolean;
  message: string;

  sourceUnitId: number | null;
  sourceBarcode: string;
  sourceStockQuantity: number;

  targetUnitId: number | null;
  targetBarcode: string;
  targetStockQuantity: number;

  transferredQuantity: number;
};

const emptyTransferState: HandlingUnitTransferState =
  {
    success: false,
    message: "",

    sourceUnitId: null,
    sourceBarcode: "",
    sourceStockQuantity: 0,

    targetUnitId: null,
    targetBarcode: "",
    targetStockQuantity: 0,

    transferredQuantity: 0,
  };

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function canBeTransferSource(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.STORED
  );
}

function canBeTransferTarget(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

function createErrorState(
  message: string
): HandlingUnitTransferState {
  return {
    ...emptyTransferState,
    message,
  };
}

export async function transferProductBetweenHandlingUnits(
  _previousState: HandlingUnitTransferState,
  formData: FormData
): Promise<HandlingUnitTransferState> {
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

  const productBarcode =
    normalizeBarcode(
      formData.get("productBarcode")
    );

  const quantity = Number(
    formData.get("quantity")
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

  if (!productBarcode) {
    return createErrorState(
      "Transfer edilecek ürün barkodunu okutun."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return createErrorState(
      "Transfer miktarı sıfırdan büyük bir tam sayı olmalıdır."
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
                status: true,
                warehouseId: true,
                locationId: true,
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
                status: true,
                warehouseId: true,
                locationId: true,
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
            !canBeTransferSource(
              sourceUnit.status
            )
          ) {
            throw new Error(
              `${sourceUnit.barcode} kaynak birimi transfer işlemine uygun değil. ` +
                "Kaynak birim Açık veya Adreslendi durumunda olmalıdır."
            );
          }

          if (
            !canBeTransferTarget(
              targetUnit.status
            )
          ) {
            throw new Error(
              `${targetUnit.barcode} hedef birimi ürün kabul etmeye uygun değil. ` +
                "Hedef birim Açık, Boş veya Adreslendi durumunda olmalıdır."
            );
          }

          const product =
            await tx.product.findFirst({
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
                name: true,
                isActive: true,
              },
            });

          if (!product) {
            throw new Error(
              `${productBarcode} barkoduyla ürün bulunamadı.`
            );
          }

          if (!product.isActive) {
            throw new Error(
              `${product.code} - ${product.name} ürünü pasif durumda.`
            );
          }

          const sourceItem =
            await tx.handlingUnitItem.findUnique({
              where: {
                handling_unit_product_unique:
                  {
                    handlingUnitId:
                      sourceUnit.id,
                    productId:
                      product.id,
                  },
              },
              select: {
                id: true,
                quantity: true,
                reservedStock: true,
              },
            });

          if (!sourceItem) {
            throw new Error(
              `${product.code} - ${product.name} ürünü ` +
                `${sourceUnit.barcode} içinde bulunmuyor.`
            );
          }

          const sourceAvailableQuantity =
            sourceItem.quantity -
            sourceItem.reservedStock;

          if (
            sourceAvailableQuantity <= 0
          ) {
            throw new Error(
              `${product.code} - ${product.name} ürününün ` +
                "kaynak birimde transfer edilebilir stoğu bulunmuyor."
            );
          }

          if (
            quantity >
            sourceAvailableQuantity
          ) {
            throw new Error(
              `${product.code} - ${product.name} için kaynak stok yetersiz. ` +
                `Kaynak miktar: ${sourceItem.quantity}, ` +
                `rezerve: ${sourceItem.reservedStock}, ` +
                `transfer edilebilir: ${sourceAvailableQuantity}, ` +
                `istenen: ${quantity}.`
            );
          }

          const sourceRemainingQuantity =
            sourceItem.quantity -
            quantity;

          if (
            sourceRemainingQuantity === 0
          ) {
            await tx.handlingUnitItem.delete({
              where: {
                id: sourceItem.id,
              },
            });
          } else {
            await tx.handlingUnitItem.update({
              where: {
                id: sourceItem.id,
              },
              data: {
                quantity:
                  sourceRemainingQuantity,
              },
            });
          }

          await tx.handlingUnitItem.upsert({
            where: {
              handling_unit_product_unique:
                {
                  handlingUnitId:
                    targetUnit.id,
                  productId:
                    product.id,
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
              productId:
                product.id,
              quantity,
              reservedStock: 0,
            },
          });

          /*
           * Boş hedefin adresi varsa
           * yeniden STORED yapılır.
           *
           * Adresi yoksa OPEN yapılır.
           */
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

          const [
            sourceStockSummary,
            targetStockSummary,
            remainingSourceItemCount,
            sourceChildUnitCount,
          ] = await Promise.all([
            tx.handlingUnitItem.aggregate({
              where: {
                handlingUnitId:
                  sourceUnit.id,
              },
              _sum: {
                quantity: true,
              },
            }),
            tx.handlingUnitItem.aggregate({
              where: {
                handlingUnitId:
                  targetUnit.id,
              },
              _sum: {
                quantity: true,
              },
            }),
            tx.handlingUnitItem.count({
              where: {
                handlingUnitId:
                  sourceUnit.id,
                quantity: {
                  gt: 0,
                },
              },
            }),
            tx.handlingUnit.count({
              where: {
                parentUnitId:
                  sourceUnit.id,
              },
            }),
          ]);

          const sourceStockQuantity =
            sourceStockSummary._sum
              .quantity ?? 0;

          const targetStockQuantity =
            targetStockSummary._sum
              .quantity ?? 0;

          if (
            remainingSourceItemCount ===
              0 &&
            sourceChildUnitCount === 0
          ) {
            await tx.handlingUnit.update({
              where: {
                id: sourceUnit.id,
              },
              data: {
                status:
                  HandlingUnitStatus.EMPTY,
              },
            });
          }

          return {
            sourceUnitId:
              sourceUnit.id,
            sourceBarcode:
              sourceUnit.barcode,
            sourceStockQuantity,

            targetUnitId:
              targetUnit.id,
            targetBarcode:
              targetUnit.barcode,
            targetStockQuantity,

            productCode:
              product.code,
            productName:
              product.name,

            transferredQuantity:
              quantity,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );

    revalidatePath("/rf");
    revalidatePath("/rf/transfers");
    revalidatePath("/rf/full-transfer");

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      "/admin/handling-units/transfers"
    );

    revalidatePath(
      "/admin/handling-units/merge"
    );

    revalidatePath(
      "/admin/handling-units/addressing"
    );

    revalidatePath(
      `/admin/handling-units/${result.sourceUnitId}`
    );

    revalidatePath(
      `/admin/handling-units/${result.targetUnitId}`
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    return {
      success: true,
      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.transferredQuantity} adet ` +
        `${result.sourceBarcode} kaynağından ` +
        `${result.targetBarcode} hedefine transfer edildi.`,

      sourceUnitId:
        result.sourceUnitId,
      sourceBarcode:
        result.sourceBarcode,
      sourceStockQuantity:
        result.sourceStockQuantity,

      targetUnitId:
        result.targetUnitId,
      targetBarcode:
        result.targetBarcode,
      targetStockQuantity:
        result.targetStockQuantity,

      transferredQuantity:
        result.transferredQuantity,
    };
  } catch (error) {
    console.error(
      "Taşıma birimleri arası ürün transfer hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen transferi tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Ürün transferi sırasında beklenmeyen bir hata oluştu."
    );
  }
}