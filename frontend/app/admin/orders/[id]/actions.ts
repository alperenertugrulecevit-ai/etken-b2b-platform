"use server";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const reservationStatuses: OrderStatus[] = [
  OrderStatus.APPROVED,
  OrderStatus.PREPARING,
  OrderStatus.PICKING,
  OrderStatus.PACKING,
  OrderStatus.READY_TO_SHIP,
];

const stockDeductionStatuses: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export async function updateOrderStatus(
  orderId: number,
  formData: FormData
) {
  const statusValue = String(
    formData.get("status") ?? ""
  );

  const validStatuses = Object.values(OrderStatus);

  if (
    !validStatuses.includes(
      statusValue as OrderStatus
    )
  ) {
    throw new Error(
      "Geçersiz sipariş durumu seçildi."
    );
  }

  const newStatus = statusValue as OrderStatus;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },

      include: {
        items: {
          select: {
            productId: true,
            productCode: true,
            productName: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }

    /*
     * 1. ONAYLANDI VE SONRAKİ HAZIRLIK STATÜLERİ
     *
     * Sipariş henüz rezerve edilmediyse ürünleri rezerve eder.
     */
    if (
      reservationStatuses.includes(newStatus) &&
      !order.stockReserved &&
      !order.stockDeducted
    ) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },

          select: {
            id: true,
            name: true,
            stock: true,
            reservedStock: true,
            isActive: true,
          },
        });

        if (!product || !product.isActive) {
          throw new Error(
            `${item.productName} ürünü bulunamadı veya ürün pasif.`
          );
        }

        const availableStock =
          product.stock - product.reservedStock;

        if (availableStock < item.quantity) {
          throw new Error(
            `${item.productName} için yeterli kullanılabilir stok yok. ` +
              `Kullanılabilir stok: ${availableStock}, ` +
              `sipariş miktarı: ${item.quantity}.`
          );
        }

        await tx.product.update({
          where: {
            id: item.productId,
          },

          data: {
            reservedStock: {
              increment: item.quantity,
            },
          },
        });
      }

      await tx.order.update({
        where: {
          id: orderId,
        },

        data: {
          status: newStatus,
          stockReserved: true,
          stockReservedAt: new Date(),
        },
      });

      return;
    }

    /*
     * 2. SEVK EDİLDİ VEYA TESLİM EDİLDİ
     *
     * Sipariş rezerve edilmemişse önce stok yeterliliğini kontrol eder.
     * Ardından fiziksel stoktan düşer.
     * Rezerve edilen miktarı da kaldırır.
     */
    if (
      stockDeductionStatuses.includes(newStatus) &&
      !order.stockDeducted
    ) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },

          select: {
            id: true,
            name: true,
            stock: true,
            reservedStock: true,
          },
        });

        if (!product) {
          throw new Error(
            `${item.productName} ürünü bulunamadı.`
          );
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `${item.productName} için fiziksel stok yetersiz. ` +
              `Fiziksel stok: ${product.stock}, ` +
              `sipariş miktarı: ${item.quantity}.`
          );
        }

        const reservedQuantityToRelease =
          order.stockReserved
            ? Math.min(
                product.reservedStock,
                item.quantity
              )
            : 0;

        await tx.product.update({
          where: {
            id: item.productId,
          },

          data: {
            stock: {
              decrement: item.quantity,
            },

            reservedStock: {
              decrement: reservedQuantityToRelease,
            },
          },
        });
      }

      await tx.order.update({
        where: {
          id: orderId,
        },

        data: {
          status: newStatus,
          stockReserved: false,
          stockDeducted: true,
          stockDeductedAt: new Date(),
        },
      });

      return;
    }

    /*
     * 3. İPTAL
     *
     * Henüz sevk edilmemiş siparişin rezervasyonunu kaldırır.
     * Fiziksel stoktan düşülmüş siparişlerde otomatik stok iadesi yapmaz.
     */
    if (newStatus === OrderStatus.CANCELLED) {
      if (
        order.stockReserved &&
        !order.stockDeducted
      ) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },

            select: {
              reservedStock: true,
            },
          });

          if (!product) {
            continue;
          }

          const quantityToRelease = Math.min(
            product.reservedStock,
            item.quantity
          );

          await tx.product.update({
            where: {
              id: item.productId,
            },

            data: {
              reservedStock: {
                decrement: quantityToRelease,
              },
            },
          });
        }
      }

      await tx.order.update({
        where: {
          id: orderId,
        },

        data: {
          status: OrderStatus.CANCELLED,
          stockReserved: false,
        },
      });

      return;
    }

    /*
     * 4. DİĞER DURUMLAR
     *
     * Yalnızca sipariş durumunu günceller.
     * Stok daha önce düşülmüşse yeniden düşmez.
     */
    await tx.order.update({
      where: {
        id: orderId,
      },

      data: {
        status: newStatus,
      },
    });
  });

  const detailPath =
    `/admin/orders/${orderId}`;

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/new");
  revalidatePath(detailPath);

  redirect(detailPath);
}