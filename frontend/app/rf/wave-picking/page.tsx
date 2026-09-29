import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ZonePickingService } from "@/lib/wms/zone-picking-service";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

/*
 * Wave toplama ayrı menü/akış olarak kalır; görsel ve okutma motoru ortak
 * RF picking ekranıdır. flow=wave yalnız Wave Zone görevlerini gösterir.
 *
 * Eski Wave kayıtları Zone görev mimarisinden önce oluşturulmuş olabilir.
 * Bu giriş noktası yalnız hiç toplama görmemiş ve hiç Zone görevi olmayan
 * aktif Wave siparişlerini idempotent biçimde RF görev havuzuna hazırlar.
 */
export default async function RFWavePickingPage() {
  await AuthorizationService.requirePermission("PICKING_EXECUTE");

  const waves = await prisma.wave.findMany({
    where: {
      status: { in: ["RELEASED", "IN_PROGRESS", "PAUSED"] },
      warehouseId: { not: null },
      orders: {
        some: {
          order: {
            zonePickTasks: { none: {} },
            items: {
              every: {
                pickedQuantity: 0,
                pickingShortages: { none: { status: "ACTIVE" } },
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      warehouseId: true,
      orders: {
        where: {
          order: {
            zonePickTasks: { none: {} },
            items: {
              every: {
                pickedQuantity: 0,
                pickingShortages: { none: { status: "ACTIVE" } },
              },
            },
          },
        },
        select: { orderId: true },
      },
    },
  });

  for (const wave of waves) {
    if (!wave.warehouseId || wave.orders.length === 0) continue;
    const orderIds = wave.orders.map((row) => row.orderId);

    try {
      await prisma.$transaction(async (tx) => {
        await ZonePickingService.buildTasksForOrders(tx, {
          orderIds,
          warehouseId: wave.warehouseId!,
          waveId: wave.id,
        });
        await tx.order.updateMany({
          where: { id: { in: orderIds } },
          data: { stockReserved: true },
        });
      });
    } catch {
      // Bir eski Wave stok nedeniyle otomatik onarılamıyorsa diğer Wave'lerin
      // RF ekranına girişini engelleme. Operatör ekranındaki rezervasyon
      // yenileme işlemiyle ayrıca müdahale edilebilir.
    }
  }

  redirect("/rf/picking?flow=wave");
}
