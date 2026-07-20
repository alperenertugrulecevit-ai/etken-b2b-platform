"use server";

import {
  PurchaseOrderStatus,
  StockMovementType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import {
  createStockMovementWithTransaction,
} from "@/lib/stock/stock-service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type PurchaseReceiptActionState = {
  success: boolean;
  message: string;
};

type SubmittedReceiptItem = {
  purchaseOrderItemId: number;
  quantity: number;
};

export async function receivePurchaseOrder(
  purchaseOrderId: number,
  _previousState: PurchaseReceiptActionState,
  formData: FormData
): Promise<PurchaseReceiptActionState> {
  await AuthorizationService.requirePermission(
    "RECEIVING_EXECUTE"
  );

  if (
    !Number.isInteger(purchaseOrderId) ||
    purchaseOrderId <= 0
  ) {
    return {
      success: false,
      message:
        "Geçerli bir satın alma siparişi bulunamadı.",
    };
  }

  const itemsJson = String(
    formData.get("itemsJson") ?? "[]"
  );

  const documentNumber =
    String(
      formData.get("documentNumber") ?? ""
    ).trim() || null;

  const description =
    String(
      formData.get("description") ?? ""
    ).trim() || null;

  let submittedItems:
    SubmittedReceiptItem[] = [];

  try {
    const parsedItems =
      JSON.parse(itemsJson);

    if (!Array.isArray(parsedItems)) {
      return {
        success: false,
        message:
          "Mal kabul miktarları geçerli bir liste değil.",
      };
    }

    submittedItems =
      parsedItems as SubmittedReceiptItem[];
  } catch {
    return {
      success: false,
      message:
        "Mal kabul miktarları okunamadı.",
    };
  }

  const receiptItems =
    submittedItems.filter(
      (item) =>
        Number.isInteger(
          Number(
            item.purchaseOrderItemId
          )
        ) &&
        Number(
          item.purchaseOrderItemId
        ) > 0 &&
        Number.isInteger(
          Number(item.quantity)
        ) &&
        Number(item.quantity) > 0
    );

  if (receiptItems.length === 0) {
    return {
      success: false,
      message:
        "En az bir ürün için teslim alınan miktar girin.",
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const purchaseOrder =
          await tx.purchaseOrder.findUnique({
            where: {
              id: purchaseOrderId,
            },

            include: {
              items: {
                orderBy: {
                  id: "asc",
                },
              },
            },
          });

        if (!purchaseOrder) {
          throw new Error(
            "Satın alma siparişi bulunamadı."
          );
        }

        if (
          purchaseOrder.status !==
            PurchaseOrderStatus.APPROVED &&
          purchaseOrder.status !==
            PurchaseOrderStatus.PARTIALLY_RECEIVED
        ) {
          throw new Error(
            "Yalnızca onaylanmış veya kısmi mal kabul durumundaki satın almalara mal kabul yapılabilir."
          );
        }

        const itemMap = new Map(
          purchaseOrder.items.map(
            (item) => [
              item.id,
              item,
            ]
          )
        );

        const quantityByItem =
          new Map<number, number>();

        for (
          const submittedItem of
          receiptItems
        ) {
          const itemId = Number(
            submittedItem.purchaseOrderItemId
          );

          const quantity = Number(
            submittedItem.quantity
          );

          quantityByItem.set(
            itemId,
            (
              quantityByItem.get(
                itemId
              ) ?? 0
            ) + quantity
          );
        }

        for (
          const [
            purchaseOrderItemId,
            receiptQuantity,
          ] of quantityByItem
        ) {
          const item =
            itemMap.get(
              purchaseOrderItemId
            );

          if (!item) {
            throw new Error(
              "Satın alma siparişine ait olmayan ürün satırı bulundu."
            );
          }

          const remainingQuantity =
            item.orderedQuantity -
            item.receivedQuantity;

          if (
            receiptQuantity >
            remainingQuantity
          ) {
            throw new Error(
              `${item.productCode} - ${item.productName} için kalan miktardan fazla mal kabul yapılamaz. ` +
                `Kalan: ${remainingQuantity}, girilen: ${receiptQuantity}.`
            );
          }

          await createStockMovementWithTransaction(
            tx,
            {
              productId:
                item.productId,

              purchaseOrderId:
                purchaseOrder.id,

              movementType:
                StockMovementType.PURCHASE_RECEIPT,

              physicalChange:
                receiptQuantity,

              reservedChange: 0,

              documentNumber:
                documentNumber ??
                purchaseOrder.purchaseNumber,

              description:
                description ??
                `${purchaseOrder.purchaseNumber} numaralı satın alma siparişi için mal kabul yapıldı.`,
            }
          );

          await tx.purchaseOrderItem.update({
            where: {
              id: item.id,
            },

            data: {
              receivedQuantity: {
                increment:
                  receiptQuantity,
              },
            },
          });
        }

        const updatedItems =
          purchaseOrder.items.map(
            (item) => ({
              orderedQuantity:
                item.orderedQuantity,

              receivedQuantity:
                item.receivedQuantity +
                (
                  quantityByItem.get(
                    item.id
                  ) ?? 0
                ),
            })
          );

        const allReceived =
          updatedItems.every(
            (item) =>
              item.receivedQuantity >=
              item.orderedQuantity
          );

        const anyReceived =
          updatedItems.some(
            (item) =>
              item.receivedQuantity > 0
          );

        await tx.purchaseOrder.update({
          where: {
            id: purchaseOrder.id,
          },

          data: {
            status: allReceived
              ? PurchaseOrderStatus.RECEIVED
              : anyReceived
                ? PurchaseOrderStatus.PARTIALLY_RECEIVED
                : PurchaseOrderStatus.APPROVED,

            receivedAt: allReceived
              ? new Date()
              : null,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );
  } catch (error) {
    console.error(
      "Mal kabul hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Mal kabul yapılırken beklenmeyen bir hata oluştu.",
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  revalidatePath(
    "/admin/stock/movements"
  );

  revalidatePath(
    "/admin/purchase-orders"
  );

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}`
  );

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}/receive`
  );

  redirect(
    `/admin/purchase-orders/${purchaseOrderId}`
  );
}