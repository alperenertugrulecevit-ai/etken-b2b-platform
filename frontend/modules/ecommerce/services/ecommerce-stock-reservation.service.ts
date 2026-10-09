import "server-only";

import { OrderSource, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Safely release an unpicked ecommerce order's global product reservations.
 * This intentionally refuses picked/shipped orders: those require the WMS
 * physical stock and handling-unit reversal workflow.
 */
export class EcommerceStockReservationService {
  static async releaseUnpickedOrder(orderId: number, reason: string): Promise<boolean> {
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || !reason.trim()) {
      throw new Error("Geçersiz rezervasyon serbest bırakma isteği.");
    }
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true, source: true, status: true, stockReserved: true,
          stockDeducted: true,
          pickingRecords: { select: { id: true }, take: 1 },
          assignedHandlingUnits: { select: { id: true }, take: 1 },
          zonePickTasks: { select: { id: true }, take: 1 },
          shippingHandlingUnitOrders: { select: { id: true }, take: 1 },
          stockMovements: { select: { id: true }, take: 1 },
          items: {
            select: {
              productId: true, quantity: true, pickedQuantity: true,
              packedQuantity: true, shippedQuantity: true, cancelledQuantity: true,
            },
          },
        },
      });
      if (!order || order.source !== OrderSource.ECOMMERCE) {
        throw new Error("E-ticaret siparişi bulunamadı.");
      }
      if (!order.stockReserved) return false;
      // An unpaid order is not necessarily expired: bank-transfer matching can
      // arrive late. Only an explicit cancellation decision may release stock.
      // This helper deliberately does not infer expiry from paymentTermDays.

      if (order.items.length === 0) {
        throw new Error("Sipariş kalemleri olmadan rezervasyon bırakılamaz.");
      }
      if (
        order.stockDeducted ||
        order.pickingRecords.length > 0 ||
        order.assignedHandlingUnits.length > 0 ||
        order.zonePickTasks.length > 0 ||
        order.shippingHandlingUnitOrders.length > 0 ||
        order.stockMovements.length > 0 ||
        (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CANCELLED) ||
        order.items.some((item) =>
          item.pickedQuantity !== 0 || item.packedQuantity !== 0 ||
          item.shippedQuantity !== 0 || item.cancelledQuantity !== 0
        )
      ) {
        throw new Error("WMS işlemi başlamış siparişin rezervasyonu otomatik bırakılamaz.");
      }

      // Compare-and-swap the order flag to make a repeated release idempotent.
      // The transaction rollback restores this flag if any product update fails.
      const claim = await tx.order.updateMany({
        where: {
          id: orderId, stockReserved: true, stockDeducted: false,
          status: { in: [OrderStatus.PENDING, OrderStatus.CANCELLED] },
        },
        data: { stockReserved: false, stockReservedAt: null },
      });
      if (claim.count !== 1) return false;

      const quantities = new Map<number, number>();
      for (const item of order.items) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
          throw new Error("Sipariş stok miktarı geçersiz.");
        }
        const aggregate = (quantities.get(item.productId) ?? 0) + item.quantity;
        if (!Number.isSafeInteger(aggregate) || aggregate > 2147483647) {
          throw new Error("Rezervasyon miktarı veritabanı sınırını aşıyor.");
        }
        quantities.set(item.productId, aggregate);
      }
      for (const [productId, quantity] of [...quantities].sort(([a], [b]) => a - b)) {
        const released = await tx.product.updateMany({
          where: { id: productId, reservedStock: { gte: quantity } },
          data: { reservedStock: { decrement: quantity } },
        });
        if (released.count !== 1) {
          throw new Error("Rezervasyon tutarsızlığı: stok serbest bırakılamadı.");
        }
      }
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
