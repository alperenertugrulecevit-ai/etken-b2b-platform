"use server";

import {
  PurchaseOrderStatus,
  type Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type PurchaseItemActionState = {
  success: boolean;
  message: string;
};

type TransactionClient =
  Prisma.TransactionClient;

async function recalculatePurchaseOrder(
  tx: TransactionClient,
  purchaseOrderId: number
) {
  const purchaseOrder =
    await tx.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },

      select: {
        id: true,
        discountRate: true,

        items: {
          select: {
            id: true,
            orderedQuantity: true,
            unitPrice: true,
            vatRate: true,
          },
        },
      },
    });

  if (!purchaseOrder) {
    throw new Error(
      "Satın alma siparişi bulunamadı."
    );
  }

  let subtotal = 0;
  let discountAmount = 0;
  let vatAmount = 0;

  for (const item of purchaseOrder.items) {
    const grossLine =
      item.unitPrice *
      item.orderedQuantity;

    const lineDiscount =
      grossLine *
      (purchaseOrder.discountRate / 100);

    const lineNet =
      grossLine -
      lineDiscount;

    const lineVat =
      lineNet *
      (item.vatRate / 100);

    const lineTotal =
      lineNet + lineVat;

    subtotal += grossLine;
    discountAmount += lineDiscount;
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
      subtotal,
      discountAmount,
      vatAmount,
      totalAmount,
    },
  });
}

export async function addPurchaseOrderItem(
  purchaseOrderId: number,
  _previousState: PurchaseItemActionState,
  formData: FormData
): Promise<PurchaseItemActionState> {
  const productId = Number(
    formData.get("productId")
  );

  const orderedQuantity = Number(
    formData.get("orderedQuantity")
  );

  const unitPrice = Number(
    formData.get("unitPrice")
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

  if (
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir ürün seçin.",
    };
  }

  if (
    !Number.isInteger(orderedQuantity) ||
    orderedQuantity <= 0
  ) {
    return {
      success: false,
      message:
        "Sipariş miktarı sıfırdan büyük bir tam sayı olmalıdır.",
    };
  }

  if (
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return {
      success: false,
      message:
        "KDV hariç alış fiyatı sıfırdan büyük olmalıdır.",
    };
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const purchaseOrder =
            await tx.purchaseOrder.findUnique({
              where: {
                id: purchaseOrderId,
              },

              select: {
                id: true,
                status: true,
                discountRate: true,

                items: {
                  where: {
                    productId,
                  },

                  select: {
                    id: true,
                  },
                },
              },
            });

          if (!purchaseOrder) {
            return {
              error:
                "Satın alma siparişi bulunamadı.",
              productName: null,
            };
          }

          if (
            purchaseOrder.status !==
            PurchaseOrderStatus.DRAFT
          ) {
            return {
              error:
                "Yalnızca Taslak durumundaki satın alma siparişlerine ürün eklenebilir.",
              productName: null,
            };
          }

          if (
            purchaseOrder.items.length > 0
          ) {
            return {
              error:
                "Seçilen ürün bu satın alma siparişinde zaten bulunuyor.",
              productName: null,
            };
          }

          const product =
            await tx.product.findFirst({
              where: {
                id: productId,
                isActive: true,
              },

              select: {
                id: true,
                code: true,
                name: true,
                vat: true,
              },
            });

          if (!product) {
            return {
              error:
                "Ürün bulunamadı veya ürün pasif durumda.",
              productName: null,
            };
          }

          const grossLine =
            unitPrice *
            orderedQuantity;

          const lineDiscount =
            grossLine *
            (
              purchaseOrder.discountRate /
              100
            );

          const lineNet =
            grossLine -
            lineDiscount;

          const vatAmount =
            lineNet *
            (product.vat / 100);

          const lineTotal =
            lineNet + vatAmount;

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId,
              productId: product.id,
              productCode: product.code,
              productName: product.name,
              orderedQuantity,
              receivedQuantity: 0,
              unitPrice,
              vatRate: product.vat,
              lineNet,
              vatAmount,
              lineTotal,
            },
          });

          await recalculatePurchaseOrder(
            tx,
            purchaseOrderId
          );

          return {
            error: null,
            productName: product.name,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    if (result.error) {
      return {
        success: false,
        message: result.error,
      };
    }

    revalidatePath(
      "/admin/purchase-orders"
    );

    revalidatePath(
      `/admin/purchase-orders/${purchaseOrderId}`
    );

    return {
      success: true,
      message:
        `${result.productName} satın alma siparişine eklendi.`,
    };
  } catch (error) {
    console.error(
      "Satın alma ürünü ekleme hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ürün eklenirken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function updatePurchaseOrderItem(
  purchaseOrderId: number,
  purchaseOrderItemId: number,
  _previousState: PurchaseItemActionState,
  formData: FormData
): Promise<PurchaseItemActionState> {
  const orderedQuantity = Number(
    formData.get("orderedQuantity")
  );

  const unitPrice = Number(
    formData.get("unitPrice")
  );

  if (
    !Number.isInteger(purchaseOrderId) ||
    purchaseOrderId <= 0 ||
    !Number.isInteger(
      purchaseOrderItemId
    ) ||
    purchaseOrderItemId <= 0
  ) {
    return {
      success: false,
      message:
        "Geçerli bir satın alma ürün satırı bulunamadı.",
    };
  }

  if (
    !Number.isInteger(orderedQuantity) ||
    orderedQuantity <= 0
  ) {
    return {
      success: false,
      message:
        "Sipariş miktarı sıfırdan büyük bir tam sayı olmalıdır.",
    };
  }

  if (
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return {
      success: false,
      message:
        "KDV hariç alış fiyatı sıfırdan büyük olmalıdır.",
    };
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const purchaseOrder =
            await tx.purchaseOrder.findUnique({
              where: {
                id: purchaseOrderId,
              },

              select: {
                id: true,
                status: true,
                discountRate: true,
              },
            });

          if (!purchaseOrder) {
            return {
              error:
                "Satın alma siparişi bulunamadı.",
              productName: null,
            };
          }

          if (
            purchaseOrder.status !==
            PurchaseOrderStatus.DRAFT
          ) {
            return {
              error:
                "Yalnızca Taslak durumundaki satın alma ürünleri güncellenebilir.",
              productName: null,
            };
          }

          const item =
            await tx.purchaseOrderItem.findFirst({
              where: {
                id:
                  purchaseOrderItemId,

                purchaseOrderId,
              },

              select: {
                id: true,
                productName: true,
                receivedQuantity: true,
                vatRate: true,
              },
            });

          if (!item) {
            return {
              error:
                "Satın alma ürün satırı bulunamadı.",
              productName: null,
            };
          }

          if (
            item.receivedQuantity > 0
          ) {
            return {
              error:
                "Mal kabul yapılmış ürün satırı güncellenemez.",
              productName: null,
            };
          }

          const grossLine =
            unitPrice *
            orderedQuantity;

          const lineDiscount =
            grossLine *
            (
              purchaseOrder.discountRate /
              100
            );

          const lineNet =
            grossLine -
            lineDiscount;

          const vatAmount =
            lineNet *
            (item.vatRate / 100);

          const lineTotal =
            lineNet + vatAmount;

          await tx.purchaseOrderItem.update({
            where: {
              id:
                purchaseOrderItemId,
            },

            data: {
              orderedQuantity,
              unitPrice,
              lineNet,
              vatAmount,
              lineTotal,
            },
          });

          await recalculatePurchaseOrder(
            tx,
            purchaseOrderId
          );

          return {
            error: null,
            productName:
              item.productName,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    if (result.error) {
      return {
        success: false,
        message: result.error,
      };
    }

    revalidatePath(
      "/admin/purchase-orders"
    );

    revalidatePath(
      `/admin/purchase-orders/${purchaseOrderId}`
    );

    return {
      success: true,
      message:
        `${result.productName} satırı güncellendi.`,
    };
  } catch (error) {
    console.error(
      "Satın alma ürün satırı güncelleme hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ürün satırı güncellenirken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function deletePurchaseOrderItem(
  purchaseOrderId: number,
  purchaseOrderItemId: number
) {
  if (
    !Number.isInteger(purchaseOrderId) ||
    purchaseOrderId <= 0 ||
    !Number.isInteger(
      purchaseOrderItemId
    ) ||
    purchaseOrderItemId <= 0
  ) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      const purchaseOrder =
        await tx.purchaseOrder.findUnique({
          where: {
            id: purchaseOrderId,
          },

          select: {
            status: true,
          },
        });

      if (
        !purchaseOrder ||
        purchaseOrder.status !==
          PurchaseOrderStatus.DRAFT
      ) {
        return;
      }

      await tx.purchaseOrderItem.deleteMany({
        where: {
          id: purchaseOrderItemId,
          purchaseOrderId,
          receivedQuantity: 0,
        },
      });

      await recalculatePurchaseOrder(
        tx,
        purchaseOrderId
      );
    }
  );

  revalidatePath(
    "/admin/purchase-orders"
  );

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}`
  );
}