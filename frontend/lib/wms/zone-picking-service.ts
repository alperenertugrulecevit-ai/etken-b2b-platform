import { HandlingUnitPurpose, HandlingUnitStatus, Prisma, ZonePickTaskStatus } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const SOURCE_STATUSES: HandlingUnitStatus[] = [
  HandlingUnitStatus.OPEN,
  HandlingUnitStatus.CLOSED,
  HandlingUnitStatus.STORED,
];

export class ZonePickingService {
  static async buildTasksForOrders(tx: Tx, input: { orderIds: number[]; warehouseId: number; waveId?: string | null }) {
    const ids = Array.from(new Set(input.orderIds));
    const orders = await tx.order.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderNumber: true, items: { select: { productId: true, quantity: true, pickedQuantity: true } } },
    });
    if (orders.length !== ids.length) throw new Error("Zone görev planı için siparişlerden biri bulunamadı.");

    const productIds = Array.from(new Set(orders.flatMap(o => o.items.map(i => i.productId))));
    const stocks = await tx.handlingUnitItem.findMany({
      where: {
        productId: { in: productIds },
        quantity: { gt: 0 },
        handlingUnit: {
          purpose: HandlingUnitPurpose.STOCK,
          assignedOrderId: null,
          assignedWaveId: null,
          warehouseId: input.warehouseId,
          status: { in: SOURCE_STATUSES },
          location: { is: { isActive: true } },
        },
      },
      select: {
        productId: true,
        quantity: true,
        reservedStock: true,
        handlingUnit: { select: { location: { select: { id: true, code: true, zoneId: true, zone: { select: { id: true, code: true, isActive: true } } } } } },
      },
    });

    const byProduct = new Map<number, typeof stocks>();
    for (const stock of stocks) byProduct.set(stock.productId, [...(byProduct.get(stock.productId) ?? []), stock]);

    const plans: { orderId:number; zoneId:number; lines:Set<number>; quantity:number }[] = [];
    for (const order of orders) {
      const zoneMap = new Map<number, { lines:Set<number>; quantity:number }>();
      for (const item of order.items) {
        let need = Math.max(0, item.quantity - item.pickedQuantity);
        if (!need) continue;
        const candidates = (byProduct.get(item.productId) ?? []).filter(s => s.handlingUnit.location);
        const total = candidates.reduce((n,s)=>n+Math.max(0,s.quantity),0);
        if (total < need) throw new Error(`${order.orderNumber}: ürün ${item.productId} için seçilen depoda yeterli fiziksel stok yok.`);
        for (const stock of candidates) {
          if (!need) break;
          const loc = stock.handlingUnit.location!;
          if (!loc.zoneId || !loc.zone || !loc.zone.isActive) {
            throw new Error(`${order.orderNumber}: ${loc.code} lokasyonu aktif bir Zone'a atanmadığı için toplama başlatılamaz.`);
          }
          const take = Math.min(need, Math.max(0, stock.quantity));
          if (!take) continue;
          const z = zoneMap.get(loc.zoneId) ?? { lines:new Set<number>(), quantity:0 };
          z.lines.add(item.productId); z.quantity += take; zoneMap.set(loc.zoneId,z); need -= take;
        }
      }
      for (const [zoneId,p] of zoneMap) plans.push({ orderId:order.id, zoneId, lines:p.lines, quantity:p.quantity });
    }

    for (const p of plans) {
      await tx.zonePickTask.upsert({
        where: { order_zone_wave_task_unique: { orderId:p.orderId, zoneId:p.zoneId, waveId: input.waveId ?? null } },
        create: { warehouseId:input.warehouseId, zoneId:p.zoneId, orderId:p.orderId, waveId:input.waveId ?? null, status:ZonePickTaskStatus.OPEN, plannedLineCount:p.lines.size, plannedQuantity:p.quantity },
        update: { plannedLineCount:p.lines.size, plannedQuantity:p.quantity },
      });
    }
    return { taskCount:plans.length, zoneCount:new Set(plans.map(p=>p.zoneId)).size };
  }
}
