"use server";

import {
  OrderStatus,
  StockMovementType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

const reservationStatuses: OrderStatus[] = [
  OrderStatus.APPROVED,
  OrderStatus.PREPARING,
  OrderStatus.PICKING,
  OrderStatus.PACKING,
  OrderStatus.READY_TO_SHIP,
];

const shipmentStatuses: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export async function updateOrderStatus(
  orderId: number,
  formData: FormData
) {
  const statusValue = String(
    formData.get("status") ?? ""
  ).trim();

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

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    throw new Error(
      "Geçerli bir sipariş kimliği gereklidir."
    );
  }

  const newStatus =
    statusValue as OrderStatus;

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
      throw new Error(
        "Sipariş bulunamadı."
      );
    }

    /*
     * Aynı durum yeniden seçildiyse
     * stok hareketi üretmeden işlemi bitir.
     */
    if (order.status === newStatus) {
      return;
    }

    /*
     * 1. REZERVASYON OLUŞTURMA
     *
     * Sipariş Onaylandı, Hazırlanıyor,
     * Toplanıyor, Paketleniyor veya
     * Sevke Hazır durumlarından birine alınırsa
     * ve henüz rezervasyon yoksa stok rezerve edilir.
     */
    if (
      reservationStatuses.includes(
        newStatus
      ) &&
      !order.stockReserved &&
      !order.stockDeducted
    ) {
      for (const item of order.items) {
        await createStockMovementWithTransaction(
          tx,
          {
            productId: item.productId,
            orderId: order.id,

            movementType:
              StockMovementType.RESERVATION_CREATE,

            physicalChange: 0,
            reservedChange:
              item.quantity,

            documentNumber:
              order.orderNumber,

            description:
              `${order.orderNumber} numaralı sipariş için stok rezervasyonu oluşturuldu.`,
          }
        );
      }

      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          status: newStatus,
          stockReserved: true,
          stockReservedAt:
            order.stockReservedAt ??
            new Date(),
        },
      });

      return;
    }

    /*
     * 2. SEVKİYAT
     *
     * Sipariş Sevk Edildi veya doğrudan
     * Teslim Edildi durumuna alınırsa:
     *
     * - Fiziksel stok düşer.
     * - Mevcut rezervasyon kaldırılır.
     * - SALE_SHIPMENT hareketi oluşur.
     */
    if (
      shipmentStatuses.includes(
        newStatus
      ) &&
      !order.stockDeducted
    ) {
      for (const item of order.items) {
        await createStockMovementWithTransaction(
          tx,
          {
            productId: item.productId,
            orderId: order.id,

            movementType:
              StockMovementType.SALE_SHIPMENT,

            physicalChange:
              -item.quantity,

            reservedChange:
              order.stockReserved
                ? -item.quantity
                : 0,

            documentNumber:
              order.orderNumber,

            description:
              `${order.orderNumber} numaralı sipariş için satış sevkiyatı yapıldı.`,
          }
        );
      }

      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          status: newStatus,
          stockReserved: false,
          stockDeducted: true,
          stockDeductedAt:
            order.stockDeductedAt ??
            new Date(),
        },
      });

      return;
    }

    /*
     * 3. İPTAL
     *
     * Sipariş rezerve edilmiş fakat henüz
     * fiziksel stoktan düşülmemişse rezervasyon çözülür.
     *
     * Sevk edilmiş siparişlerde bu işlem fiziksel
     * stoğu otomatik geri eklemez. Daha sonra ayrı
     * satış iadesi süreci oluşturacağız.
     */
    if (
      newStatus ===
      OrderStatus.CANCELLED
    ) {
      if (
        order.stockReserved &&
        !order.stockDeducted
      ) {
        for (const item of order.items) {
          await createStockMovementWithTransaction(
            tx,
            {
              productId: item.productId,
              orderId: order.id,

              movementType:
                StockMovementType.RESERVATION_RELEASE,

              physicalChange: 0,
              reservedChange:
                -item.quantity,

              documentNumber:
                order.orderNumber,

              description:
                `${order.orderNumber} numaralı sipariş iptal edildiği için rezervasyon kaldırıldı.`,
            }
          );
        }
      }

      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          status:
            OrderStatus.CANCELLED,

          stockReserved: false,
        },
      });

      return;
    }

    /*
     * 4. REZERVASYON DURUMUNDAN GERİYE DÖNÜŞ
     *
     * Rezerve edilmiş sipariş Taslak veya
     * Bekliyor durumuna alınırsa rezervasyon kaldırılır.
     *
     * Fiziksel stok daha önce düşmüşse otomatik
     * stok iadesi yapılmaz.
     */
    if (
      (
        newStatus ===
          OrderStatus.DRAFT ||
        newStatus ===
          OrderStatus.PENDING
      ) &&
      order.stockReserved &&
      !order.stockDeducted
    ) {
      for (const item of order.items) {
        await createStockMovementWithTransaction(
          tx,
          {
            productId: item.productId,
            orderId: order.id,

            movementType:
              StockMovementType.RESERVATION_RELEASE,

            physicalChange: 0,
            reservedChange:
              -item.quantity,

            documentNumber:
              order.orderNumber,

            description:
              `${order.orderNumber} numaralı sipariş başlangıç durumuna döndürüldüğü için rezervasyon kaldırıldı.`,
          }
        );
      }

      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          status: newStatus,
          stockReserved: false,
        },
      });

      return;
    }

    /*
     * 5. DİĞER DURUMLAR
     *
     * Stok etkisi gerekmiyorsa yalnızca
     * sipariş durumu güncellenir.
     */
    await tx.order.update({
      where: {
        id: order.id,
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