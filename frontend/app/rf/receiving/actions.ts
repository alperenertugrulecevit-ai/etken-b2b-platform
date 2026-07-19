"use server";

import {
  HandlingUnitStatus,
  PurchaseOrderStatus,
  Prisma,
  StockMovementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type RFReceivingState = {
  success: boolean;
  message: string;

  purchaseOrderId: number | null;
  purchaseNumber: string;
  purchaseOrderItemId: number | null;

  handlingUnitId: number | null;
  handlingUnitBarcode: string;

  productId: number | null;
  productCode: string;
  productBarcode: string;
  productName: string;

  receivedQuantity: number;
  lineReceivedQuantity: number;
  lineRemainingQuantity: number;

  handlingUnitProductQuantity: number;
  handlingUnitTotalQuantity: number;

  productPhysicalStock: number;
  purchaseOrderStatus: string;
};

const emptyState: RFReceivingState = {
  success: false,
  message: "",

  purchaseOrderId: null,
  purchaseNumber: "",
  purchaseOrderItemId: null,

  handlingUnitId: null,
  handlingUnitBarcode: "",

  productId: null,
  productCode: "",
  productBarcode: "",
  productName: "",

  receivedQuantity: 0,
  lineReceivedQuantity: 0,
  lineRemainingQuantity: 0,

  handlingUnitProductQuantity: 0,
  handlingUnitTotalQuantity: 0,

  productPhysicalStock: 0,
  purchaseOrderStatus: "",
};

function createErrorState(
  message: string
): RFReceivingState {
  return {
    ...emptyState,
    message,
  };
}

function normalizeValue(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getPurchaseOrderStatusLabel(
  status: PurchaseOrderStatus
) {
  const labels: Record<
    PurchaseOrderStatus,
    string
  > = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PARTIALLY_RECEIVED:
      "Kısmi Mal Kabul",
    RECEIVED: "Mal Kabul Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}

function canReceivePurchaseOrder(
  status: PurchaseOrderStatus
) {
  return (
    status ===
      PurchaseOrderStatus.APPROVED ||
    status ===
      PurchaseOrderStatus.PARTIALLY_RECEIVED
  );
}

function canReceiveIntoHandlingUnit(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

export async function rfReceivePurchaseItem(
  _previousState: RFReceivingState,
  formData: FormData
): Promise<RFReceivingState> {
  await AuthorizationService.requireRfAccess(
    "RECEIVING_EXECUTE"
  );

  const purchaseNumber = normalizeValue(
    formData.get("purchaseNumber")
  );

  const handlingUnitBarcode =
    normalizeValue(
      formData.get(
        "handlingUnitBarcode"
      )
    );

  const productBarcode = normalizeValue(
    formData.get("productBarcode")
  );

  const quantity = Number(
    formData.get("quantity")
  );

  if (!purchaseNumber) {
    return createErrorState(
      "Satın alma sipariş numarasını okutun."
    );
  }

  if (!handlingUnitBarcode) {
    return createErrorState(
      "Mal kabul yapılacak koli veya palet barkodunu okutun."
    );
  }

  if (!productBarcode) {
    return createErrorState(
      "Ürün barkodunu okutun."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return createErrorState(
      "Mal kabul miktarı sıfırdan büyük bir tam sayı olmalıdır."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const purchaseOrder =
            await tx.purchaseOrder.findUnique({
              where: {
                purchaseNumber,
              },
              select: {
                id: true,
                purchaseNumber: true,
                status: true,
                supplier: {
                  select: {
                    name: true,
                  },
                },
                items: {
                  select: {
                    id: true,
                    productId: true,
                    productCode: true,
                    productName: true,
                    orderedQuantity: true,
                    receivedQuantity: true,
                    product: {
                      select: {
                        id: true,
                        code: true,
                        barcode: true,
                        name: true,
                        stock: true,
                        reservedStock: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            });

          if (!purchaseOrder) {
            throw new Error(
              `${purchaseNumber} numaralı satın alma siparişi bulunamadı.`
            );
          }

          if (
            !canReceivePurchaseOrder(
              purchaseOrder.status
            )
          ) {
            throw new Error(
              `${purchaseOrder.purchaseNumber} siparişi mal kabule uygun değil. ` +
                "Sipariş Onaylandı veya Kısmi Mal Kabul durumunda olmalıdır."
            );
          }

          const handlingUnit =
            await tx.handlingUnit.findUnique({
              where: {
                barcode:
                  handlingUnitBarcode,
              },
              select: {
                id: true,
                barcode: true,
                status: true,
                warehouseId: true,
                locationId: true,
              },
            });

          if (!handlingUnit) {
            throw new Error(
              `${handlingUnitBarcode} barkodlu koli veya palet bulunamadı.`
            );
          }

          if (
            !canReceiveIntoHandlingUnit(
              handlingUnit.status
            )
          ) {
            throw new Error(
              `${handlingUnit.barcode} taşıma birimi mal kabul işlemine uygun değil.`
            );
          }

          const purchaseOrderItem =
            purchaseOrder.items.find(
              (item) =>
                item.product.barcode
                  .trim()
                  .toUpperCase() ===
                  productBarcode ||
                item.product.code
                  .trim()
                  .toUpperCase() ===
                  productBarcode
            );

          if (!purchaseOrderItem) {
            throw new Error(
              `${productBarcode} barkodlu ürün bu satın alma siparişinde bulunmuyor.`
            );
          }

          if (
            !purchaseOrderItem.product
              .isActive
          ) {
            throw new Error(
              `${purchaseOrderItem.productCode} - ${purchaseOrderItem.productName} ürünü pasif durumda.`
            );
          }

          const remainingQuantity =
            purchaseOrderItem.orderedQuantity -
            purchaseOrderItem.receivedQuantity;

          if (remainingQuantity <= 0) {
            throw new Error(
              `${purchaseOrderItem.productCode} - ${purchaseOrderItem.productName} satırının mal kabulü daha önce tamamlanmış.`
            );
          }

          if (quantity > remainingQuantity) {
            throw new Error(
              `Girilen miktar sipariş kalanından fazla. ` +
                `Sipariş: ${purchaseOrderItem.orderedQuantity}, ` +
                `kabul edilen: ${purchaseOrderItem.receivedQuantity}, ` +
                `kalan: ${remainingQuantity}, ` +
                `girilen: ${quantity}.`
            );
          }

          const updatedPurchaseOrderItem =
            await tx.purchaseOrderItem.update({
              where: {
                id: purchaseOrderItem.id,
              },
              data: {
                receivedQuantity: {
                  increment: quantity,
                },
              },
              select: {
                id: true,
                orderedQuantity: true,
                receivedQuantity: true,
              },
            });

          const updatedProduct =
            await tx.product.update({
              where: {
                id:
                  purchaseOrderItem
                    .productId,
              },
              data: {
                stock: {
                  increment: quantity,
                },
              },
              select: {
                id: true,
                code: true,
                barcode: true,
                name: true,
                stock: true,
                reservedStock: true,
              },
            });

          const updatedHandlingUnitItem =
            await tx.handlingUnitItem.upsert({
              where: {
                handling_unit_product_unique:
                  {
                    handlingUnitId:
                      handlingUnit.id,
                    productId:
                      purchaseOrderItem
                        .productId,
                  },
              },
              update: {
                quantity: {
                  increment: quantity,
                },
              },
              create: {
                handlingUnitId:
                  handlingUnit.id,
                productId:
                  purchaseOrderItem
                    .productId,
                quantity,
                reservedStock: 0,
              },
              select: {
                id: true,
                quantity: true,
              },
            });

          if (
            handlingUnit.status ===
            HandlingUnitStatus.EMPTY
          ) {
            const nextStatus =
              handlingUnit.warehouseId &&
              handlingUnit.locationId
                ? HandlingUnitStatus.STORED
                : HandlingUnitStatus.OPEN;

            await tx.handlingUnit.update({
              where: {
                id: handlingUnit.id,
              },
              data: {
                status: nextStatus,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              productId:
                purchaseOrderItem
                  .productId,
              purchaseOrderId:
                purchaseOrder.id,
              movementType:
                StockMovementType.PURCHASE_RECEIPT,
              physicalChange: quantity,
              reservedChange: 0,
              physicalBalanceAfter:
                updatedProduct.stock,
              reservedBalanceAfter:
                updatedProduct.reservedStock,
              availableBalanceAfter:
                updatedProduct.stock -
                updatedProduct.reservedStock,
              documentNumber:
                purchaseOrder.purchaseNumber,
              description:
                `${handlingUnit.barcode} taşıma birimine RF mal kabulü. ` +
                `Tedarikçi: ${purchaseOrder.supplier.name}.`,
            },
          });

          const allPurchaseItems =
            await tx.purchaseOrderItem.findMany({
              where: {
                purchaseOrderId:
                  purchaseOrder.id,
              },
              select: {
                orderedQuantity: true,
                receivedQuantity: true,
              },
            });

          const allItemsReceived =
            allPurchaseItems.every(
              (item) =>
                item.receivedQuantity >=
                item.orderedQuantity
            );

          const anyItemReceived =
            allPurchaseItems.some(
              (item) =>
                item.receivedQuantity > 0
            );

          let nextPurchaseOrderStatus:
            PurchaseOrderStatus;

          if (allItemsReceived) {
            nextPurchaseOrderStatus =
              PurchaseOrderStatus.RECEIVED;
          } else if (anyItemReceived) {
            nextPurchaseOrderStatus =
              PurchaseOrderStatus.PARTIALLY_RECEIVED;
          } else {
            nextPurchaseOrderStatus =
              PurchaseOrderStatus.APPROVED;
          }

          await tx.purchaseOrder.update({
            where: {
              id: purchaseOrder.id,
            },
            data: {
              status:
                nextPurchaseOrderStatus,
              receivedAt:
                allItemsReceived
                  ? new Date()
                  : null,
            },
          });

          const handlingUnitStockSummary =
            await tx.handlingUnitItem.aggregate({
              where: {
                handlingUnitId:
                  handlingUnit.id,
              },
              _sum: {
                quantity: true,
              },
            });

          const lineRemainingQuantity =
            Math.max(
              0,
              updatedPurchaseOrderItem
                .orderedQuantity -
                updatedPurchaseOrderItem
                  .receivedQuantity
            );

          return {
            purchaseOrderId:
              purchaseOrder.id,
            purchaseNumber:
              purchaseOrder.purchaseNumber,
            purchaseOrderItemId:
              updatedPurchaseOrderItem.id,
            handlingUnitId:
              handlingUnit.id,
            handlingUnitBarcode:
              handlingUnit.barcode,
            productId:
              updatedProduct.id,
            productCode:
              updatedProduct.code,
            productBarcode:
              updatedProduct.barcode,
            productName:
              updatedProduct.name,
            receivedQuantity:
              quantity,
            lineReceivedQuantity:
              updatedPurchaseOrderItem
                .receivedQuantity,
            lineRemainingQuantity,
            handlingUnitProductQuantity:
              updatedHandlingUnitItem.quantity,
            handlingUnitTotalQuantity:
              handlingUnitStockSummary._sum
                .quantity ?? 0,
            productPhysicalStock:
              updatedProduct.stock,
            purchaseOrderStatus:
              nextPurchaseOrderStatus,
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
    revalidatePath("/rf/receiving");

    revalidatePath(
      "/admin/purchase-orders"
    );

    revalidatePath(
      `/admin/purchase-orders/${result.purchaseOrderId}`
    );

    revalidatePath("/admin/products");

    revalidatePath(
      `/admin/products/${result.productId}`
    );

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      `/admin/handling-units/${result.handlingUnitId}`
    );

    revalidatePath(
      "/admin/stock/movements"
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    revalidatePath(
      "/admin/stock/location-map"
    );

    return {
      success: true,
      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.receivedQuantity} adet, ` +
        `${result.handlingUnitBarcode} taşıma birimine kabul edildi.`,

      purchaseOrderId:
        result.purchaseOrderId,
      purchaseNumber:
        result.purchaseNumber,
      purchaseOrderItemId:
        result.purchaseOrderItemId,

      handlingUnitId:
        result.handlingUnitId,
      handlingUnitBarcode:
        result.handlingUnitBarcode,

      productId:
        result.productId,
      productCode:
        result.productCode,
      productBarcode:
        result.productBarcode,
      productName:
        result.productName,

      receivedQuantity:
        result.receivedQuantity,
      lineReceivedQuantity:
        result.lineReceivedQuantity,
      lineRemainingQuantity:
        result.lineRemainingQuantity,

      handlingUnitProductQuantity:
        result.handlingUnitProductQuantity,
      handlingUnitTotalQuantity:
        result.handlingUnitTotalQuantity,

      productPhysicalStock:
        result.productPhysicalStock,

      purchaseOrderStatus:
        getPurchaseOrderStatusLabel(
          result.purchaseOrderStatus
        ),
    };
  } catch (error) {
    console.error(
      "RF mal kabul hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen mal kabulü tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Mal kabul işlemi sırasında beklenmeyen bir hata oluştu."
    );
  }
}