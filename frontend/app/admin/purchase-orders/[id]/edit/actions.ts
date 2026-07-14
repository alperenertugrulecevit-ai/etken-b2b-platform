"use server";

import {
  PurchaseOrderStatus,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export type UpdatePurchaseOrderState = {
  success: boolean;
  message: string;
};

export async function updatePurchaseOrder(
  purchaseOrderId: number,
  _previousState: UpdatePurchaseOrderState,
  formData: FormData
): Promise<UpdatePurchaseOrderState> {
  const supplierId = Number(
    formData.get("supplierId")
  );

  const expectedDateValue = String(
    formData.get("expectedDate") ?? ""
  ).trim();

  const supplierNote =
    String(
      formData.get("supplierNote") ?? ""
    ).trim() || null;

  const internalNote =
    String(
      formData.get("internalNote") ?? ""
    ).trim() || null;

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

  if (
    !Number.isInteger(supplierId) ||
    supplierId <= 0
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir tedarikçi seçin.",
    };
  }

  let expectedDate: Date | null = null;

  if (expectedDateValue) {
    expectedDate = new Date(
      `${expectedDateValue}T12:00:00`
    );

    if (
      Number.isNaN(
        expectedDate.getTime()
      )
    ) {
      return {
        success: false,
        message:
          "Beklenen teslim tarihi geçerli değil.",
      };
    }
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
          PurchaseOrderStatus.DRAFT
        ) {
          throw new Error(
            "Yalnızca Taslak durumundaki satın alma siparişi güncellenebilir."
          );
        }

        const hasReceivedQuantity =
          purchaseOrder.items.some(
            (item) =>
              item.receivedQuantity > 0
          );

        if (hasReceivedQuantity) {
          throw new Error(
            "Mal kabul yapılmış satın alma siparişi güncellenemez."
          );
        }

        const supplier =
          await tx.supplier.findFirst({
            where: {
              id: supplierId,
              isActive: true,
            },

            select: {
              id: true,
              name: true,
              paymentTermDays: true,
              discountRate: true,
            },
          });

        if (!supplier) {
          throw new Error(
            "Tedarikçi bulunamadı veya pasif durumda."
          );
        }

        let subtotal = 0;
        let discountAmount = 0;
        let vatAmount = 0;

        for (
          const item of
          purchaseOrder.items
        ) {
          const grossLine =
            item.unitPrice *
            item.orderedQuantity;

          const lineDiscount =
            grossLine *
            (
              supplier.discountRate /
              100
            );

          const lineNet =
            grossLine -
            lineDiscount;

          const lineVat =
            lineNet *
            (item.vatRate / 100);

          const lineTotal =
            lineNet + lineVat;

          subtotal += grossLine;
          discountAmount +=
            lineDiscount;
          vatAmount += lineVat;

          await tx.purchaseOrderItem.update({
            where: {
              id: item.id,
            },

            data: {
              lineNet,
              vatAmount: lineVat,
              lineTotal,
            },
          });
        }

        const totalAmount =
          subtotal -
          discountAmount +
          vatAmount;

        await tx.purchaseOrder.update({
          where: {
            id: purchaseOrderId,
          },

          data: {
            supplierId:
              supplier.id,

            expectedDate,

            paymentTermDays:
              supplier.paymentTermDays,

            discountRate:
              supplier.discountRate,

            subtotal,

            discountAmount,

            vatAmount,

            totalAmount,

            supplierNote,

            internalNote,
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
      "Satın alma güncelleme hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Satın alma siparişi güncellenirken beklenmeyen bir hata oluştu.",
    };
  }

  revalidatePath("/admin");
  revalidatePath(
    "/admin/purchase-orders"
  );

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}`
  );

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}/edit`
  );

  redirect(
    `/admin/purchase-orders/${purchaseOrderId}`
  );
}