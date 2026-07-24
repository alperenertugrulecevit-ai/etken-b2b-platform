import {
  FulfillmentProgressStatus,
  OrderFulfillmentFlow,
  Prisma,
  WaveStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

type Actor = {
  userId: string;
  displayName: string;
};

type AddressSnapshot = {
  customerId: number;
  shippingAddressId: number | null;
  customerCode: string | null;
  customerName: string;
  taxOffice: string | null;
  taxNumber: string | null;
  addressTitle: string | null;
  contactName: string | null;
  phone: string | null;
  address: string;
  city: string;
  district: string;
  postalCode: string | null;
};

const PLAN_ALLOWED_STATUSES: WaveStatus[] = [
  WaveStatus.DRAFT,
  WaveStatus.READY,
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
  WaveStatus.PAUSED,
];

function createAddressSnapshot(order: {
  customerId: number;
  shippingAddressId: number | null;
  customer: {
    customerCode: string;
    companyName: string;
    taxOffice: string | null;
    taxNumber: string | null;
    contactName: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
  };
  shippingAddress: {
    title: string;
    contactName: string | null;
    phone: string | null;
    address: string;
    city: string;
    district: string;
    postalCode: string | null;
  } | null;
}): AddressSnapshot {
  const address =
    order.shippingAddress?.address.trim() ||
    order.customer.address?.trim() ||
    "";

  const city =
    order.shippingAddress?.city.trim() ||
    order.customer.city?.trim() ||
    "";

  const district =
    order.shippingAddress?.district.trim() ||
    order.customer.district?.trim() ||
    "";

  if (!address || !city || !district) {
    throw new Error(
      `${order.customer.customerCode} - ${order.customer.companyName} için teslimat adresi, şehir veya ilçe bilgisi eksik.`,
    );
  }

  return {
    customerId: order.customerId,
    shippingAddressId:
      order.shippingAddressId,
    customerCode:
      order.customer.customerCode,
    customerName:
      order.customer.companyName,
    taxOffice:
      order.customer.taxOffice,
    taxNumber:
      order.customer.taxNumber,
    addressTitle:
      order.shippingAddress?.title ??
      null,
    contactName:
      order.shippingAddress
        ?.contactName ??
      order.customer.contactName,
    phone:
      order.shippingAddress?.phone ??
      order.customer.phone,
    address,
    city,
    district,
    postalCode:
      order.shippingAddress
        ?.postalCode ?? null,
  };
}

function createGroupKey(
  customerId: number,
  shippingAddressId: number | null,
) {
  return [
    customerId,
    shippingAddressId ??
      "CUSTOMER_ADDRESS",
  ].join(":");
}

export class WaveDistributionService {
  static async createOrRefreshPlan(
    waveId: string,
    actor: Actor,
  ) {
    const normalizedWaveId =
      waveId.trim();

    if (!normalizedWaveId) {
      throw new Error(
        "Dağılım planı oluşturulacak Wave bulunamadı.",
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const wave =
          await tx.wave.findUnique({
            where: {
              id: normalizedWaveId,
            },
            select: {
              id: true,
              waveNo: true,
              status: true,
              orders: {
                orderBy: {
                  createdAt: "asc",
                },
                select: {
                  id: true,
                  orderId: true,
                  orderNumber: true,
                  order: {
                    select: {
                      id: true,
                      orderNumber: true,
                      customerId: true,
                      shippingAddressId:
                        true,
                      customer: {
                        select: {
                          customerCode:
                            true,
                          companyName:
                            true,
                          taxOffice: true,
                          taxNumber: true,
                          contactName: true,
                          phone: true,
                          address: true,
                          city: true,
                          district: true,
                        },
                      },
                      shippingAddress: {
                        select: {
                          title: true,
                          contactName: true,
                          phone: true,
                          address: true,
                          city: true,
                          district: true,
                          postalCode: true,
                        },
                      },
                      items: {
                        orderBy: {
                          id: "asc",
                        },
                        select: {
                          id: true,
                          productId: true,
                          productCode: true,
                          productName: true,
                          quantity: true,
                          product: {
                            select: {
                              barcode: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              distributions: {
                select: {
                  id: true,
                  _count: {
                    select: {
                      packingRecords: true,
                      shippingUnits: true,
                    },
                  },
                },
              },
            },
          });

        if (!wave) {
          throw new Error(
            "Wave kaydı bulunamadı.",
          );
        }

        if (
          !PLAN_ALLOWED_STATUSES.includes(
            wave.status,
          )
        ) {
          throw new Error(
            `${wave.waveNo} Wave'i ${wave.status} durumundayken dağılım planı oluşturulamaz.`,
          );
        }

        if (wave.orders.length === 0) {
          throw new Error(
            "Dağılım planı için Wave üzerinde en az bir sipariş bulunmalıdır.",
          );
        }

        const planInUse =
          wave.distributions.some(
            (distribution) =>
              distribution._count
                .packingRecords > 0 ||
              distribution._count
                .shippingUnits > 0,
          );

        if (planInUse) {
          throw new Error(
            "Dağılım planına bağlı paketleme veya Sevk THM kaydı bulunduğu için plan yeniden oluşturulamaz.",
          );
        }

        const groups = new Map<
          string,
          {
            snapshot: AddressSnapshot;
            orders: typeof wave.orders;
          }
        >();

        for (
          const waveOrder of
          wave.orders
        ) {
          if (
            waveOrder.order.items
              .length === 0
          ) {
            throw new Error(
              `${waveOrder.orderNumber} siparişinde ürün satırı bulunmuyor.`,
            );
          }

          const snapshot =
            createAddressSnapshot(
              waveOrder.order,
            );

          const groupKey =
            createGroupKey(
              snapshot.customerId,
              snapshot.shippingAddressId,
            );

          const group =
            groups.get(groupKey);

          if (group) {
            group.orders.push(
              waveOrder,
            );
          } else {
            groups.set(groupKey, {
              snapshot,
              orders: [waveOrder],
            });
          }
        }

        const orderedGroups =
          Array.from(
            groups.entries(),
          ).sort((left, right) => {
            const customerCompare =
              (
                left[1].snapshot
                  .customerCode ?? ""
              ).localeCompare(
                right[1].snapshot
                  .customerCode ?? "",
                "tr",
              );

            if (customerCompare !== 0) {
              return customerCompare;
            }

            const nameCompare =
              left[1].snapshot
                .customerName.localeCompare(
                  right[1].snapshot
                    .customerName,
                  "tr",
                );

            if (nameCompare !== 0) {
              return nameCompare;
            }

            return (
              left[1].snapshot
                .addressTitle ?? ""
            ).localeCompare(
              right[1].snapshot
                .addressTitle ?? "",
              "tr",
            );
          });

        await tx.waveDistribution.deleteMany({
          where: {
            waveId: wave.id,
          },
        });

        let totalLineCount = 0;
        let totalQuantity = 0;

        for (
          const [
            index,
            [
              groupKey,
              group,
            ],
          ] of orderedGroups.entries()
        ) {
          const sequenceNumber =
            index + 1;

          const plannedLineCount =
            group.orders.reduce(
              (sum, waveOrder) =>
                sum +
                waveOrder.order.items
                  .length,
              0,
            );

          const plannedQuantity =
            group.orders.reduce(
              (sum, waveOrder) =>
                sum +
                waveOrder.order.items.reduce(
                  (
                    itemSum,
                    item,
                  ) =>
                    itemSum +
                    item.quantity,
                  0,
                ),
              0,
            );

          const distribution =
            await tx.waveDistribution.create({
              data: {
                waveId: wave.id,
                sequenceNumber,
                distributionCode:
                  `${wave.waveNo}-${sequenceNumber
                    .toString()
                    .padStart(3, "0")}`,
                groupKey,
                ...group.snapshot,
                plannedOrderCount:
                  group.orders.length,
                plannedLineCount,
                plannedQuantity,
                createdById:
                  actor.userId,
                createdByName:
                  actor.displayName,
              },
              select: {
                id: true,
              },
            });

          for (
            const waveOrder of
            group.orders
          ) {
            const orderPlannedQuantity =
              waveOrder.order.items.reduce(
                (sum, item) =>
                  sum + item.quantity,
                0,
              );

            const distributionOrder =
              await tx.waveDistributionOrder.create({
                data: {
                  distributionId:
                    distribution.id,
                  waveOrderId:
                    waveOrder.id,
                  orderId:
                    waveOrder.orderId,
                  orderNumber:
                    waveOrder.orderNumber,
                  plannedQuantity:
                    orderPlannedQuantity,
                },
                select: {
                  id: true,
                },
              });

            await tx.waveDistributionLine.createMany({
              data:
                waveOrder.order.items.map(
                  (item) => ({
                    distributionId:
                      distribution.id,
                    distributionOrderId:
                      distributionOrder.id,
                    orderId:
                      waveOrder.orderId,
                    orderItemId:
                      item.id,
                    productId:
                      item.productId,
                    productCode:
                      item.productCode,
                    productBarcode:
                      item.product
                        .barcode,
                    productName:
                      item.productName,
                    plannedQuantity:
                      item.quantity,
                  }),
                ),
            });

            await tx.orderFulfillment.upsert({
              where: {
                orderId:
                  waveOrder.orderId,
              },
              create: {
                orderId:
                  waveOrder.orderId,
                waveId: wave.id,
                flowType:
                  OrderFulfillmentFlow.WAVE,
                plannedQuantity:
                  orderPlannedQuantity,
                pickingStatus:
                  FulfillmentProgressStatus.NOT_STARTED,
                packingStatus:
                  FulfillmentProgressStatus.NOT_STARTED,
                shippingStatus:
                  FulfillmentProgressStatus.NOT_STARTED,
              },
              update: {
                waveId: wave.id,
                flowType:
                  OrderFulfillmentFlow.WAVE,
                plannedQuantity:
                  orderPlannedQuantity,
              },
            });
          }

          totalLineCount +=
            plannedLineCount;

          totalQuantity +=
            plannedQuantity;
        }

        await tx.wave.update({
          where: {
            id: wave.id,
          },
          data: {
            plannedOrderCount:
              wave.orders.length,
            plannedLineCount:
              totalLineCount,
            plannedQuantity:
              totalQuantity,
            updatedBy:
              actor.displayName,
          },
        });

        return {
          waveId: wave.id,
          waveNo: wave.waveNo,
          distributionCount:
            orderedGroups.length,
          orderCount:
            wave.orders.length,
          lineCount:
            totalLineCount,
          plannedQuantity:
            totalQuantity,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,
        maxWait: 10000,
        timeout: 30000,
      },
    );
  }
}
