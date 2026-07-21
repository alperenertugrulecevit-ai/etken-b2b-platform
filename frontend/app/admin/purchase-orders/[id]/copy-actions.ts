"use server";

import {
  Prisma,
  PurchaseOrderStatus,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function createPurchaseNumber(
  lastId: number
) {
  const nextNumber = lastId + 1;

  return `PO${String(
    nextNumber
  ).padStart(6, "0")}`;
}

function calculateExpectedDate(
  deliveryDays: number
) {
  const expectedDate = new Date();

  expectedDate.setHours(12, 0, 0, 0);

  expectedDate.setDate(
    expectedDate.getDate() +
      Math.max(0, deliveryDays)
  );

  return expectedDate;
}

export async function copyPurchaseOrder(
  sourcePurchaseOrderId: number,
  _formData: FormData
) {
  await AuthorizationService.requirePermission(
    "RECEIVING_EXECUTE"
  );

  if (
    !Number.isInteger(
      sourcePurchaseOrderId
    ) ||
    sourcePurchaseOrderId <= 0
  ) {
    throw new Error(
      "Geçerli bir satın alma siparişi bulunamadı."
    );
  }

  let newPurchaseOrderId: number;

  try {
    const createdPurchaseOrder =
      await prisma.$transaction(
        async (tx) => {
          const sourcePurchaseOrder =
            await tx.purchaseOrder.findUnique({
              where: {
                id:
                  sourcePurchaseOrderId,
              },

              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                    deliveryDays: true,
                  },
                },

                items: {
                  orderBy: {
                    id: "asc",
                  },
                },
              },
            });

          if (!sourcePurchaseOrder) {
            throw new Error(
              "Kopyalanacak satın alma siparişi bulunamadı."
            );
          }

          if (
            !sourcePurchaseOrder
              .supplier.isActive
          ) {
            throw new Error(
              `${sourcePurchaseOrder.supplier.name} tedarikçisi pasif olduğu için satın alma kopyalanamaz.`
            );
          }

          if (
            sourcePurchaseOrder.items
              .length === 0
          ) {
            throw new Error(
              "Ürün satırı bulunmayan satın alma siparişi kopyalanamaz."
            );
          }

          const lastPurchaseOrder =
            await tx.purchaseOrder.findFirst({
              orderBy: {
                id: "desc",
              },

              select: {
                id: true,
              },
            });

          const purchaseNumber =
            createPurchaseNumber(
              lastPurchaseOrder?.id ?? 0
            );

          const expectedDate =
            calculateExpectedDate(
              sourcePurchaseOrder.supplier
                .deliveryDays
            );

          return tx.purchaseOrder.create({
            data: {
              purchaseNumber,

              supplierId:
                sourcePurchaseOrder
                  .supplierId,

              status:
                PurchaseOrderStatus.DRAFT,

              expectedDate,

              paymentTermDays:
                sourcePurchaseOrder
                  .paymentTermDays,

              discountRate:
                sourcePurchaseOrder
                  .discountRate,

              subtotal:
                sourcePurchaseOrder
                  .subtotal,

              discountAmount:
                sourcePurchaseOrder
                  .discountAmount,

              vatAmount:
                sourcePurchaseOrder
                  .vatAmount,

              totalAmount:
                sourcePurchaseOrder
                  .totalAmount,

              supplierNote:
                sourcePurchaseOrder
                  .supplierNote,

              internalNote:
                sourcePurchaseOrder
                  .internalNote
                  ? `${sourcePurchaseOrder.purchaseNumber} numaralı satın alma kopyalandı.\n\n${sourcePurchaseOrder.internalNote}`
                  : `${sourcePurchaseOrder.purchaseNumber} numaralı satın alma kopyalandı.`,

              approvedAt: null,
              receivedAt: null,

              items: {
                create:
                  sourcePurchaseOrder.items.map(
                    (item) => ({
                      productId:
                        item.productId,

                      productCode:
                        item.productCode,

                      productName:
                        item.productName,

                      orderedQuantity:
                        item.orderedQuantity,

                      receivedQuantity: 0,

                      unitPrice:
                        item.unitPrice,

                      vatRate:
                        item.vatRate,

                      lineNet:
                        item.lineNet,

                      vatAmount:
                        item.vatAmount,

                      lineTotal:
                        item.lineTotal,
                    })
                  ),
              },
            },

            select: {
              id: true,
            },
          });
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    newPurchaseOrderId =
      createdPurchaseOrder.id;
  } catch (error) {
    console.error(
      "Satın alma kopyalama hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "Yeni satın alma numarası oluşturulamadı. Lütfen tekrar deneyin."
      );
    }

    throw error;
  }

  revalidatePath("/admin");

  revalidatePath(
    "/admin/purchase-orders"
  );

  revalidatePath(
    `/admin/purchase-orders/${sourcePurchaseOrderId}`
  );

  revalidatePath(
    `/admin/purchase-orders/${newPurchaseOrderId}`
  );

  redirect(
    `/admin/purchase-orders/${newPurchaseOrderId}`
  );
}