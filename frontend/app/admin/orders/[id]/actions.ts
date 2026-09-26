"use server";

import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  OrderStatus,
  Prisma,
  StockMovementType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import {
  createStockMovementWithTransaction,
} from "@/lib/stock/stock-service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

import { getWmsPickableStock } from "@/lib/stock/wms-pickable-stock";

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

async function getOrderReservationWarehouseIds(
  tx: Prisma.TransactionClient,
  orderId: number,
  productId: number
) {
  const movements =
    await tx.stockMovement.findMany({
      where: {
        orderId,
        productId,
        movementType: {
          in: [
            StockMovementType.RESERVATION_CREATE,
            StockMovementType.RESERVATION_RELEASE,
          ],
        },
        warehouseId: {
          not: null,
        },
      },
      select: {
        warehouseId: true,
        reservedChange: true,
      },
    });

  const reservationByWarehouse =
    new Map<number, number>();

  for (const movement of movements) {
    if (movement.warehouseId === null) {
      continue;
    }

    reservationByWarehouse.set(
      movement.warehouseId,
      (
        reservationByWarehouse.get(
          movement.warehouseId
        ) ?? 0
      ) + movement.reservedChange
    );
  }

  return Array.from(
    reservationByWarehouse.entries()
  )
    .filter(
      ([, reservedQuantity]) =>
        reservedQuantity > 0
    )
    .map(([warehouseId]) => warehouseId);
}

export async function updateOrderStatus(
  orderId: number,
  formData: FormData
) {
  const user =
    await AuthorizationService.requirePermission(
      "ORDER_MANAGE"
    );

  const context =
    await WmsContextService.requireActiveContext(
      user.id,
      user.isAdminUser
    );

  const statusValue = String(
    formData.get("status") ?? ""
  ).trim();

  const validStatuses =
    Object.values(OrderStatus);

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

  const statusNote =
    String(
      formData.get(
        "statusNote"
      ) ?? ""
    )
      .trim()
      .slice(0, 500) ||
    null;

  await prisma.$transaction(
    async (tx) => {
      const order =
        await tx.order.findUnique({
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
    product: {
      select: {
        ownStock: true,
      },
    },
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
       * Aynı durum yeniden seçilmiş olsa bile,
       * rezervasyon durumundaki fakat henüz
       * rezerve edilmemiş sipariş için stok
       * rezervasyonu tekrar denenebilir.
       */
      const shouldRepairReservation =
        order.status === newStatus &&
        reservationStatuses.includes(
          newStatus
        ) &&
        !order.stockReserved &&
        !order.stockDeducted;

      if (
        order.status === newStatus &&
        !shouldRepairReservation
      ) {
        return;
      }

      if (
        order.status ===
          OrderStatus.CANCELLED
      ) {
        throw new Error(
          "İptal edilmiş sipariş yeniden açılamaz. Yeni bir sipariş oluşturmalısınız."
        );
      }

      const statusHistory = {
        create: {
          status: newStatus,
          note: statusNote,
          visibleToCustomer:
            true,
        },
      };



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
      const reservableItems = [];

      for (const item of order.items) {
        const wmsStock =
          await getWmsPickableStock(
            tx,
            {
              tenantId:
                context.tenantId,
              companyId:
                context.companyId,
              productId:
                item.productId,
            }
          );

        if (
          wmsStock.availableQuantity <
          item.quantity
        ) {
          throw new Error(
            `${item.productCode} - ${item.productName} için ` +
              `WMS'de yeterli toplanabilir stok bulunmuyor. ` +
              `Sipariş miktarı: ${item.quantity}, ` +
              `toplanabilir stok: ${wmsStock.availableQuantity}.`
          );
        }

        const reservationWarehouse =
          wmsStock.warehouses.find(
            (warehouse) =>
              warehouse.availableQuantity >=
              item.quantity
          );

        if (!reservationWarehouse) {
          throw new Error(
            `${item.productCode} - ${item.productName} için ` +
              `sipariş miktarını tek depodan karşılayacak yeterli WMS stoğu bulunmuyor.`
          );
        }

        reservableItems.push({
          item,
          warehouseId:
            reservationWarehouse.warehouseId,
          warehouseCode:
            reservationWarehouse.warehouseCode,
        });
      }

        for (
          const reservation of reservableItems
        ) {
          const item =
            reservation.item;

          await createStockMovementWithTransaction(
            tx,
            {
              productId:
                item.productId,

              orderId: order.id,

              warehouseId:
                reservation.warehouseId,

              movementType:
                StockMovementType.RESERVATION_CREATE,

              physicalChange: 0,

              reservedChange:
                item.quantity,

              documentNumber:
                order.orderNumber,

              description:
                `${order.orderNumber} numaralı sipariş için ${reservation.warehouseCode} deposunda stok rezervasyonu oluşturuldu.`,
            }
          );
        }

        await tx.order.update({
          where: {
            id: order.id,
          },

          data: {
            status: newStatus,
            statusHistory,
            stockReserved:
              reservableItems.length > 0,

            stockReservedAt:
              reservableItems.length > 0
                ? order.stockReservedAt ??
                  new Date()
                : null,
            fulfillmentWarehouseId:
              new Set(reservableItems.map((reservation) => reservation.warehouseId)).size === 1
                ? reservableItems[0]?.warehouseId ?? null
                : null,
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
          const warehouseIds =
            await getOrderReservationWarehouseIds(
              tx,
              order.id,
              item.productId
            );

          if (
            order.stockReserved &&
            warehouseIds.length !== 1
          ) {
            throw new Error(
              `${item.productCode} için rezervasyon deposu tekil olarak belirlenemedi.`
            );
          }

          await createStockMovementWithTransaction(
            tx,
            {
              productId:
                item.productId,

              orderId: order.id,

              warehouseId:
                warehouseIds[0] ??
                context.warehouseId,

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
            statusHistory,
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
            const warehouseIds =
              await getOrderReservationWarehouseIds(
                tx,
                order.id,
                item.productId
              );

            if (warehouseIds.length !== 1) {
              throw new Error(
                `${item.productCode} için rezervasyon deposu tekil olarak belirlenemedi.`
              );
            }

            await createStockMovementWithTransaction(
              tx,
              {
                productId:
                  item.productId,

                orderId: order.id,

                warehouseId:
                  warehouseIds[0],

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

        const orderDebit =
          await tx.customerAccountEntry.findFirst({
            where: {
              orderId:
                order.id,
              direction:
                CustomerAccountEntryDirection.DEBIT,
              entryType:
                CustomerAccountEntryType.ORDER,
            },
            select: {
              id: true,
              amount: true,
            },
          });

        const existingCancellation =
          await tx.customerAccountEntry.findFirst({
            where: {
              orderId:
                order.id,
              direction:
                CustomerAccountEntryDirection.CREDIT,
              entryType:
                CustomerAccountEntryType.CANCELLATION,
            },
            select: {
              id: true,
            },
          });

        if (
          orderDebit &&
          !existingCancellation
        ) {
          await tx.customerAccountEntry.create({
            data: {
              customerId:
                order.customerId,
              orderId:
                order.id,
              direction:
                CustomerAccountEntryDirection.CREDIT,
              entryType:
                CustomerAccountEntryType.CANCELLATION,
              amount:
                orderDebit.amount,
              description:
                order.orderNumber +
                " numaralı sipariş iptal ters kaydı",
              referenceNo:
                order.orderNumber,
              createdByUsername:
                "Yönetim Paneli",
            },
          });
        }

        await tx.order.update({
          where: {
            id: order.id,
          },

          data: {
            status:
              OrderStatus.CANCELLED,
            statusHistory,

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
          const warehouseIds =
            await getOrderReservationWarehouseIds(
              tx,
              order.id,
              item.productId
            );

          if (warehouseIds.length !== 1) {
            throw new Error(
              `${item.productCode} için rezervasyon deposu tekil olarak belirlenemedi.`
            );
          }

          await createStockMovementWithTransaction(
            tx,
            {
              productId:
                item.productId,

              orderId: order.id,

              warehouseId:
                warehouseIds[0],

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
            statusHistory,
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
            statusHistory,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  const detailPath =
    `/admin/orders/${orderId}`;

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/new");
  revalidatePath("/admin/waves");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath(
    `/account/orders/${orderId}`
  );
  revalidatePath(detailPath);

  redirect(detailPath);
}