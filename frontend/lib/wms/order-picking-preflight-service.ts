import { HandlingUnitPurpose, HandlingUnitStatus, OrderStatus, PickingShortageReason, Prisma, PrismaClient, StockMovementType, WmsOperationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";
import { ZonePickingService } from "@/lib/wms/zone-picking-service";

type Db = PrismaClient | Prisma.TransactionClient;
const SOURCE_STATUSES: HandlingUnitStatus[] = [HandlingUnitStatus.OPEN, HandlingUnitStatus.CLOSED, HandlingUnitStatus.STORED];


async function releaseOrderReservation(
  tx: Prisma.TransactionClient,
  input: { orderId: number; orderNumber: string; productId: number; warehouseId: number; quantity: number; description: string },
) {
  if (input.quantity <= 0) return;
  const [warehouseStock, product] = await Promise.all([
    tx.warehouseProductStock.findUnique({
      where: { warehouse_product_stock_unique: { warehouseId: input.warehouseId, productId: input.productId } },
      select: { physicalStock: true, reservedStock: true },
    }),
    tx.product.findUnique({
      where: { id: input.productId },
      select: { tenantId: true, companyId: true, stock: true, reservedStock: true },
    }),
  ]);
  if (!product) throw new Error("Rezervasyonu çözülecek ürün bulunamadı.");

  const releasable = Math.min(
    input.quantity,
    Math.max(0, warehouseStock?.reservedStock ?? 0),
    Math.max(0, product.reservedStock),
  );

  if (releasable > 0) {
    await createStockMovementWithTransaction(tx, {
      productId: input.productId,
      orderId: input.orderId,
      warehouseId: input.warehouseId,
      movementType: StockMovementType.RESERVATION_RELEASE,
      physicalChange: 0,
      reservedChange: -releasable,
      documentNumber: input.orderNumber,
      description: input.description,
    });
  }

  const reconciliation = input.quantity - releasable;
  if (reconciliation > 0) {
    const current = await tx.warehouseProductStock.findUnique({
      where: { warehouse_product_stock_unique: { warehouseId: input.warehouseId, productId: input.productId } },
      select: { physicalStock: true, reservedStock: true },
    });
    await tx.stockMovement.create({
      data: {
        tenantId: product.tenantId,
        companyId: product.companyId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        orderId: input.orderId,
        movementType: StockMovementType.RESERVATION_RELEASE,
        physicalChange: 0,
        reservedChange: -reconciliation,
        physicalBalanceAfter: current?.physicalStock ?? 0,
        reservedBalanceAfter: current?.reservedStock ?? 0,
        availableBalanceAfter: Math.max(0, (current?.physicalStock ?? 0) - (current?.reservedStock ?? 0)),
        documentNumber: input.orderNumber,
        description: `${input.description} Kayıp/uzlaştırma nedeniyle stok özetinde daha önce çözülmüş ${reconciliation} adet sipariş rezervasyonu hareket bazında kapatıldı.`,
      },
    });
  }
}

export type PickingStockShortage = {
  orderId: number; orderNumber: string; orderItemId: number; productId: number;
  productCode: string; productName: string; requestedQuantity: number;
  availableQuantity: number; shortageQuantity: number;
};

export type PickingStockPreflight = {
  ok: boolean; warehouseId: number; shortages: PickingStockShortage[];
};

export class OrderPickingPreflightService {
  static async check(db: Db, input: { orderIds: number[]; warehouseId: number }): Promise<PickingStockPreflight> {
    const orderIds = [...new Set(input.orderIds)];
    if (!orderIds.length) throw new Error("En az bir sipariş seçmelisiniz.");

    const orders = await db.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true, orderNumber: true, status: true, orderDate: true, requestedDate: true, fulfillmentWarehouseId: true,
        items: { orderBy: { id: "asc" }, select: {
          id: true, productId: true, productCode: true, productName: true, quantity: true, pickedQuantity: true,
        } },
      },
    });
    if (orders.length !== orderIds.length) throw new Error("Seçilen siparişlerden biri bulunamadı.");

    orders.sort((a, b) =>
      (a.requestedDate?.getTime() ?? a.orderDate.getTime()) - (b.requestedDate?.getTime() ?? b.orderDate.getTime()) ||
      a.orderDate.getTime() - b.orderDate.getTime() || a.id - b.id
    );

    for (const order of orders) {
      if (order.status !== OrderStatus.APPROVED) throw new Error(`${order.orderNumber} artık Onaylandı durumunda değil.`);
      if (order.fulfillmentWarehouseId !== null && order.fulfillmentWarehouseId !== input.warehouseId) {
        throw new Error(`${order.orderNumber} farklı bir depoya atanmış.`);
      }
    }

    const productIds = [...new Set(orders.flatMap(order => order.items.map(item => item.productId)))];
    const rows = await db.handlingUnitItem.findMany({
      where: {
        productId: { in: productIds }, quantity: { gt: 0 },
        handlingUnit: {
          purpose: HandlingUnitPurpose.STOCK, assignedOrderId: null, assignedWaveId: null,
          warehouseId: input.warehouseId, status: { in: SOURCE_STATUSES },
          warehouse: { isActive: true, code: { not: "KYP001" } },
          location: { is: { isActive: true } },
        },
      },
      select: { productId: true, quantity: true, reservedStock: true },
    });

    const availableByProduct = new Map<number, number>();
    for (const row of rows) {
      availableByProduct.set(row.productId, (availableByProduct.get(row.productId) ?? 0) + Math.max(0, row.quantity - row.reservedStock));
    }

    const shortages: PickingStockShortage[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        const need = Math.max(0, item.quantity - item.pickedQuantity);
        if (!need) continue;
        const available = Math.max(0, availableByProduct.get(item.productId) ?? 0);
        const allocated = Math.min(need, available);
        const shortage = need - allocated;
        availableByProduct.set(item.productId, available - allocated);
        if (shortage > 0) shortages.push({
          orderId: order.id, orderNumber: order.orderNumber, orderItemId: item.id, productId: item.productId,
          productCode: item.productCode, productName: item.productName, requestedQuantity: need,
          availableQuantity: allocated, shortageQuantity: shortage,
        });
      }
    }
    return { ok: shortages.length === 0, warehouseId: input.warehouseId, shortages };
  }

  static async applyConfirmedShortages(
    tx: Prisma.TransactionClient,
    shortages: PickingStockShortage[],
    actor: { userId: string; userName: string; source: string },
  ) {
    for (const shortage of shortages) {
      const existing = await tx.pickingShortage.aggregate({
        where: { orderItemId: shortage.orderItemId, status: "ACTIVE" },
        _sum: { quantity: true },
      });
      const alreadyClosed = existing._sum.quantity ?? 0;
      const quantity = Math.max(0, shortage.shortageQuantity - alreadyClosed);
      if (!quantity) continue;

      await tx.pickingShortage.create({
        data: {
          orderId: shortage.orderId,
          orderItemId: shortage.orderItemId,
          productId: shortage.productId,
          quantity,
          reason: PickingShortageReason.STOCK_DIFFERENCE,
          status: "ACTIVE",
          note: "Sipariş Gruplama stok ön kontrolünde eksik stokla başlatma onayı verildi.",
          createdByUserId: actor.userId,
          createdByName: actor.userName,
        },
      });

      const movements = await tx.stockMovement.findMany({
        where: {
          orderId: shortage.orderId,
          productId: shortage.productId,
          movementType: { in: [StockMovementType.RESERVATION_CREATE, StockMovementType.RESERVATION_RELEASE] },
          warehouseId: { not: null },
        },
        select: { warehouseId: true, reservedChange: true },
      });
      const byWarehouse = new Map<number, number>();
      for (const movement of movements) {
        if (movement.warehouseId === null) continue;
        byWarehouse.set(movement.warehouseId, (byWarehouse.get(movement.warehouseId) ?? 0) + movement.reservedChange);
      }

      let remainingRelease = quantity;
      for (const [warehouseId, netReserved] of byWarehouse.entries()) {
        if (remainingRelease <= 0) break;
        const release = Math.min(remainingRelease, Math.max(0, netReserved));
        if (!release) continue;
        await releaseOrderReservation(tx, {
          productId: shortage.productId,
          orderId: shortage.orderId,
          warehouseId,
          quantity: release,
          orderNumber: shortage.orderNumber,
          description: `Eksik stokla toplama başlatıldı; ${release} adet sipariş rezervasyonu serbest bırakıldı.`,
        });
        remainingRelease -= release;
      }

      await tx.wmsOperationLog.create({
        data: {
          operationType: WmsOperationType.PICKING,
          module: actor.source,
          entityType: "PICKING_SHORTAGE",
          entityId: shortage.orderItemId,
          operatorId: actor.userId,
          operatorName: actor.userName,
          orderId: shortage.orderId,
          orderNumber: shortage.orderNumber,
          productId: shortage.productId,
          productCode: shortage.productCode,
          productName: shortage.productName,
          quantity,
          description: `${shortage.productCode} için ${quantity} adet stok farkı, operatör onayıyla eksik toplama olarak açıldı.`,
          metadata: {
            requestedQuantity: shortage.requestedQuantity,
            availableQuantity: shortage.availableQuantity,
            shortageQuantity: quantity,
          },
        },
      });
    }

    const affectedOrderIds = [...new Set(shortages.map(row => row.orderId))];
    for (const orderId of affectedOrderIds) {
      const items = await tx.orderItem.findMany({
        where: { orderId },
        select: {
          quantity: true,
          pickedQuantity: true,
          pickingShortages: { where: { status: "ACTIVE" }, select: { quantity: true } },
        },
      });
      const planned = items.reduce((sum, item) => sum + item.quantity, 0);
      const picked = items.reduce((sum, item) => sum + Math.min(item.quantity, item.pickedQuantity), 0);
      const closed = items.reduce(
        (sum, item) => sum + Math.min(item.quantity, item.pickedQuantity + item.pickingShortages.reduce((n, row) => n + row.quantity, 0)),
        0,
      );
      await tx.orderFulfillment.updateMany({
        where: { orderId },
        data: {
          pickedQuantity: picked,
          pickingStatus: closed >= planned ? "COMPLETED" : "IN_PROGRESS",
          ...(closed >= planned ? { pickingCompletedAt: new Date() } : {}),
        },
      });
      if (closed >= planned) {
        await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.PICKING } });
      }
    }
  }

  static async holdOrders(input: { orderIds: number[]; actorId: string; actorName: string }) {
    const orderIds = [...new Set(input.orderIds)];
    if (!orderIds.length) throw new Error("Bekletilecek sipariş bulunamadı.");

    return prisma.$transaction(async tx => {
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true, orderNumber: true, status: true, stockReserved: true, stockDeducted: true,
          waveOrders: { select: { id: true } },
          zonePickTasks: { select: { id: true, pickedQuantity: true } },
          pickingAssignment: { select: { id: true, cancelledAt: true } },
        },
      });
      if (orders.length !== orderIds.length) throw new Error("Bekletilecek siparişlerden biri bulunamadı.");

      for (const order of orders) {
        if (order.status !== OrderStatus.APPROVED) throw new Error(`${order.orderNumber} artık bekletme işlemine uygun değil.`);
        if (order.stockDeducted) throw new Error(`${order.orderNumber} siparişinin stoğu daha önce düşülmüş.`);
        if (order.waveOrders.length || order.zonePickTasks.some(task => task.pickedQuantity > 0) || (order.pickingAssignment && !order.pickingAssignment.cancelledAt)) {
          throw new Error(`${order.orderNumber} için toplama operasyonu başladığından Bekliyor durumuna alınamaz.`);
        }

        await ZonePickingService.releaseOrderPlan(tx, order.id);
        await tx.orderPickingAssignment.deleteMany({ where: { orderId: order.id } });
        await tx.orderFulfillment.deleteMany({ where: { orderId: order.id } });

        const movements = await tx.stockMovement.findMany({
          where: {
            orderId: order.id,
            movementType: { in: [StockMovementType.RESERVATION_CREATE, StockMovementType.RESERVATION_RELEASE] },
            warehouseId: { not: null },
          },
          select: { productId: true, warehouseId: true, reservedChange: true },
        });
        const net = new Map<string, { productId: number; warehouseId: number; quantity: number }>();
        for (const movement of movements) {
          if (movement.warehouseId === null) continue;
          const key = `${movement.productId}:${movement.warehouseId}`;
          const current = net.get(key) ?? { productId: movement.productId, warehouseId: movement.warehouseId, quantity: 0 };
          current.quantity += movement.reservedChange;
          net.set(key, current);
        }
        for (const reservation of net.values()) {
          if (reservation.quantity <= 0) continue;
          await releaseOrderReservation(tx, {
            productId: reservation.productId,
            orderId: order.id,
            warehouseId: reservation.warehouseId,
            quantity: reservation.quantity,
            orderNumber: order.orderNumber,
            description: `${order.orderNumber} stok yetersizliği nedeniyle Bekliyor durumuna alındı; açık rezervasyon çözüldü.`,
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PENDING, stockReserved: false, stockReservedAt: null, fulfillmentWarehouseId: null,
            statusHistory: { create: {
              status: OrderStatus.PENDING,
              note: "Sipariş Gruplama ekranında stok yetersizliği nedeniyle operatör tarafından Bekliyor durumuna alındı.",
              changedByUserId: input.actorId, changedByUsername: input.actorName, visibleToCustomer: false,
            } },
          },
        });
      }
      return { count: orders.length };
    }, { maxWait: 10000, timeout: 30000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
