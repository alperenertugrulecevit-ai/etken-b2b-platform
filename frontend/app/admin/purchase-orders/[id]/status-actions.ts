"use server";

import {
  PurchaseOrderStatus,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function refreshPurchaseOrderPages(
  purchaseOrderId: number
) {
  revalidatePath("/admin");

  revalidatePath(
    "/admin/purchase-orders"
  );

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}`
  );
}

export async function approvePurchaseOrder(
  purchaseOrderId: number,
  _formData: FormData
) {
  await AuthorizationService.requirePermission(
    "RECEIVING_EXECUTE"
  );

  if (
    !Number.isInteger(purchaseOrderId) ||
    purchaseOrderId <= 0
  ) {
    throw new Error(
      "Geçerli bir satın alma siparişi bulunamadı."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const purchaseOrder =
        await tx.purchaseOrder.findUnique({
          where: {
            id: purchaseOrderId,
          },

          include: {
            items: {
              select: {
                id: true,
                orderedQuantity: true,
                unitPrice: true,
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
        PurchaseOrderStatus.DRAFT
      ) {
        throw new Error(
          "Yalnızca Taslak durumundaki satın alma siparişi onaylanabilir."
        );
      }

      if (
        purchaseOrder.items.length === 0
      ) {
        throw new Error(
          "Ürün satırı bulunmayan satın alma siparişi onaylanamaz."
        );
      }

      const hasInvalidItem =
        purchaseOrder.items.some(
          (item) =>
            item.orderedQuantity <= 0 ||
            item.unitPrice <= 0
        );

      if (hasInvalidItem) {
        throw new Error(
          "Satın alma siparişinde geçersiz miktar veya alış fiyatı bulunuyor."
        );
      }

      if (
        purchaseOrder.totalAmount <= 0
      ) {
        throw new Error(
          "Toplam tutarı sıfır olan satın alma siparişi onaylanamaz."
        );
      }

      await tx.purchaseOrder.update({
        where: {
          id: purchaseOrderId,
        },

        data: {
          status:
            PurchaseOrderStatus.APPROVED,

          approvedAt: new Date(),
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  refreshPurchaseOrderPages(
    purchaseOrderId
  );

  redirect(
    `/admin/purchase-orders/${purchaseOrderId}`
  );
}

export async function cancelPurchaseOrder(
  purchaseOrderId: number,
  _formData: FormData
) {
  await AuthorizationService.requirePermission(
    "RECEIVING_EXECUTE"
  );

  if (
    !Number.isInteger(purchaseOrderId) ||
    purchaseOrderId <= 0
  ) {
    throw new Error(
      "Geçerli bir satın alma siparişi bulunamadı."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const purchaseOrder =
        await tx.purchaseOrder.findUnique({
          where: {
            id: purchaseOrderId,
          },

          include: {
            items: {
              select: {
                receivedQuantity: true,
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
        purchaseOrder.status ===
        PurchaseOrderStatus.CANCELLED
      ) {
        return;
      }

      if (
        purchaseOrder.status ===
          PurchaseOrderStatus.APPROVED ||
        purchaseOrder.status ===
          PurchaseOrderStatus.PARTIALLY_RECEIVED ||
        purchaseOrder.status ===
          PurchaseOrderStatus.RECEIVED
      ) {
        throw new Error(
          "Onaylanmış veya mal kabul süreci başlamış satın alma siparişi iptal edilemez."
        );
      }

      const hasReceivedQuantity =
        purchaseOrder.items.some(
          (item) =>
            item.receivedQuantity > 0
        );

      if (hasReceivedQuantity) {
        throw new Error(
          "Teslim alınmış ürün bulunan satın alma siparişi iptal edilemez."
        );
      }

      await tx.purchaseOrder.update({
        where: {
          id: purchaseOrderId,
        },

        data: {
          status:
            PurchaseOrderStatus.CANCELLED,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  refreshPurchaseOrderPages(
    purchaseOrderId
  );

  redirect(
    `/admin/purchase-orders/${purchaseOrderId}`
  );
}