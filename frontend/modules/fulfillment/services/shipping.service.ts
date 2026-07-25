import "server-only";

import {
  DispatchDocumentStatus,
  FulfillmentProgressStatus,
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderStatus,
  Prisma,
  ShippingHandlingUnitStatus,
  StockMovementType,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReadyShippingUnitSummary = {
  id: string;
  barcode: string;
  customerName: string;
  city: string;
  district: string;
  packageSequence: number;
  distributionCode: string | null;
  orderNumbers: string[];
  totalQuantity: number;
  itemCount: number;
  readyAt: string | null;
};

export type ShippingUnitDetail = {
  id: string;
  barcode: string;
  status: ShippingHandlingUnitStatus;
  customerName: string;
  address: string;
  city: string;
  district: string;
  packageSequence: number;
  distributionCode: string | null;
  orderNumbers: string[];
  totalQuantity: number;
  items: Array<{
    id: string;
    orderNumber: string;
    productCode: string;
    productBarcode: string;
    productName: string;
    quantity: number;
  }>;
};

export type ShipHandlingUnitInput = {
  barcode: string;
  carrierName?: string;
  vehiclePlate?: string;
  driverName?: string;
  driverIdentityNumber?: string;
  notes?: string;
  operatorId: string;
  operatorName: string;
};

export type ShipHandlingUnitResult = {
  barcode: string;
  dispatchNumber: string;
  customerName: string;
  totalQuantity: number;
  orderNumbers: string[];
};

function normalizeBarcode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeOptionalText(
  value: string | null | undefined
) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function createDispatchNumber(
  handlingUnitId: number,
  shipmentAt: Date
) {
  const datePart = [
    shipmentAt.getFullYear(),
    String(
      shipmentAt.getMonth() + 1
    ).padStart(2, "0"),
    String(
      shipmentAt.getDate()
    ).padStart(2, "0"),
  ].join("");

  return `SVK-${datePart}-${String(
    handlingUnitId
  ).padStart(8, "0")}`;
}

function getProgressStatus(
  completedQuantity: number,
  plannedQuantity: number
) {
  if (
    plannedQuantity > 0 &&
    completedQuantity >= plannedQuantity
  ) {
    return FulfillmentProgressStatus.COMPLETED;
  }

  if (completedQuantity > 0) {
    return FulfillmentProgressStatus.PARTIALLY_COMPLETED;
  }

  return FulfillmentProgressStatus.NOT_STARTED;
}

function getOrderStatus(
  items: Array<{
    quantity: number;
    pickedQuantity: number;
    packedQuantity: number;
    shippedQuantity: number;
  }>
) {
  const allShipped = items.every(
    (item) =>
      item.shippedQuantity >= item.quantity
  );

  if (allShipped) {
    return OrderStatus.SHIPPED;
  }

  const allPicked = items.every(
    (item) =>
      item.pickedQuantity >= item.quantity
  );

  if (!allPicked) {
    return OrderStatus.PICKING;
  }

  const allPacked = items.every(
    (item) =>
      item.packedQuantity >= item.quantity
  );

  return allPacked
    ? OrderStatus.READY_TO_SHIP
    : OrderStatus.PACKING;
}

function mapDetail(
  unit: {
    id: string;
    status: ShippingHandlingUnitStatus;
    packageSequence: number;
    customerName: string;
    address: string;
    city: string;
    district: string;
    handlingUnit: {
      barcode: string;
    };
    waveDistribution: {
      distributionCode: string;
    } | null;
    orders: Array<{
      orderNumber: string;
    }>;
    items: Array<{
      id: string;
      quantity: number;
      shippedQuantity: number;
      productCode: string;
      productBarcode: string;
      productName: string;
      shippingHandlingUnitOrder: {
        orderNumber: string;
      };
    }>;
  }
): ShippingUnitDetail {
  const items = unit.items
    .map((item) => ({
      id: item.id,
      orderNumber:
        item.shippingHandlingUnitOrder
          .orderNumber,
      productCode: item.productCode,
      productBarcode:
        item.productBarcode,
      productName: item.productName,
      quantity: Math.max(
        0,
        item.quantity -
          item.shippedQuantity
      ),
    }))
    .filter(
      (item) => item.quantity > 0
    );

  return {
    id: unit.id,
    barcode: unit.handlingUnit.barcode,
    status: unit.status,
    customerName: unit.customerName,
    address: unit.address,
    city: unit.city,
    district: unit.district,
    packageSequence:
      unit.packageSequence,
    distributionCode:
      unit.waveDistribution
        ?.distributionCode ?? null,
    orderNumbers: Array.from(
      new Set(
        unit.orders.map(
          (order) => order.orderNumber
        )
      )
    ),
    totalQuantity: items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    ),
    items,
  };
}

const shippingUnitDetailInclude = {
  handlingUnit: {
    select: {
      barcode: true,
    },
  },
  waveDistribution: {
    select: {
      distributionCode: true,
    },
  },
  orders: {
    orderBy: {
      orderNumber: "asc" as const,
    },
    select: {
      orderNumber: true,
    },
  },
  items: {
    orderBy: [
      {
        productCode: "asc" as const,
      },
      {
        orderId: "asc" as const,
      },
    ],
    select: {
      id: true,
      quantity: true,
      shippedQuantity: true,
      productCode: true,
      productBarcode: true,
      productName: true,
      shippingHandlingUnitOrder: {
        select: {
          orderNumber: true,
        },
      },
    },
  },
} satisfies Prisma.ShippingHandlingUnitInclude;

export class ShippingService {
  static async listReadyUnits():
    Promise<ReadyShippingUnitSummary[]> {
    const units =
      await prisma.shippingHandlingUnit.findMany({
        where: {
          status:
            ShippingHandlingUnitStatus.READY_TO_SHIP,
        },
        orderBy: [
          {
            readyAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        include:
          shippingUnitDetailInclude,
      });

    return units.map((unit) => {
      const detail =
        mapDetail(unit);

      return {
        id: detail.id,
        barcode: detail.barcode,
        customerName:
          detail.customerName,
        city: detail.city,
        district: detail.district,
        packageSequence:
          detail.packageSequence,
        distributionCode:
          detail.distributionCode,
        orderNumbers:
          detail.orderNumbers,
        totalQuantity:
          detail.totalQuantity,
        itemCount:
          detail.items.length,
        readyAt:
          unit.readyAt?.toISOString() ??
          null,
      };
    });
  }

  static async findReadyUnit(
    barcode: string
  ): Promise<ShippingUnitDetail> {
    const normalizedBarcode =
      normalizeBarcode(barcode);

    if (!normalizedBarcode) {
      throw new Error(
        "Sevk THM barkodunu okutun."
      );
    }

    const unit =
      await prisma.shippingHandlingUnit.findFirst({
        where: {
          handlingUnit: {
            barcode:
              normalizedBarcode,
          },
        },
        include:
          shippingUnitDetailInclude,
      });

    if (!unit) {
      throw new Error(
        `${normalizedBarcode} barkodlu Sevk THM bulunamadı.`
      );
    }

    if (
      unit.status !==
      ShippingHandlingUnitStatus.READY_TO_SHIP
    ) {
      const statusMessage =
        unit.status ===
        ShippingHandlingUnitStatus.SHIPPED
          ? "Bu Sevk THM daha önce sevk edilmiş."
          : "Sevk THM henüz sevkiyata hazır değil.";

      throw new Error(statusMessage);
    }

    const detail = mapDetail(unit);

    if (
      detail.totalQuantity <= 0
    ) {
      throw new Error(
        "Sevk THM içerisinde sevk edilecek ürün bulunmuyor."
      );
    }

    return detail;
  }

  static async ship(
    input: ShipHandlingUnitInput
  ): Promise<ShipHandlingUnitResult> {
    const barcode =
      normalizeBarcode(input.barcode);

    if (!barcode) {
      throw new Error(
        "Sevk THM barkodunu okutun."
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const shippingUnit =
          await tx.shippingHandlingUnit.findFirst({
            where: {
              handlingUnit: {
                barcode,
              },
            },
            include: {
              handlingUnit: {
                select: {
                  id: true,
                  barcode: true,
                  status: true,
                },
              },
              waveDistribution: {
                select: {
                  id: true,
                  waveId: true,
                  distributionCode: true,
                  plannedQuantity: true,
                  packedQuantity: true,
                  shippedQuantity: true,
                },
              },
              dispatchDocument: {
                select: {
                  id: true,
                  status: true,
                  dispatchNumber: true,
                },
              },
              orders: {
                select: {
                  id: true,
                  orderId: true,
                  orderNumber: true,
                  packedQuantity: true,
                  shippedQuantity: true,
                },
              },
              items: {
                orderBy: {
                  id: "asc",
                },
                select: {
                  id: true,
                  shippingHandlingUnitOrderId:
                    true,
                  orderId: true,
                  orderItemId: true,
                  productId: true,
                  productCode: true,
                  productBarcode: true,
                  productName: true,
                  quantity: true,
                  shippedQuantity: true,
                },
              },
            },
          });

        if (!shippingUnit) {
          throw new Error(
            `${barcode} barkodlu Sevk THM bulunamadı.`
          );
        }

        if (
          shippingUnit.status !==
          ShippingHandlingUnitStatus.READY_TO_SHIP
        ) {
          throw new Error(
            shippingUnit.status ===
              ShippingHandlingUnitStatus.SHIPPED
              ? "Bu Sevk THM daha önce sevk edilmiş."
              : "Sevk THM sevkiyata hazır durumda değil."
          );
        }

        if (
          shippingUnit.dispatchDocument
            ?.status ===
          DispatchDocumentStatus.ISSUED
        ) {
          throw new Error(
            "Bu Sevk THM için irsaliye daha önce oluşturulmuş."
          );
        }

        const pendingItems =
          shippingUnit.items
            .map((item) => ({
              ...item,
              pendingQuantity:
                item.quantity -
                item.shippedQuantity,
            }))
            .filter(
              (item) =>
                item.pendingQuantity >
                0
            );

        if (
          pendingItems.length === 0
        ) {
          throw new Error(
            "Sevk THM içerisinde bekleyen ürün bulunmuyor."
          );
        }

        const shipmentAt =
          new Date();

        const dispatchNumber =
          shippingUnit
            .dispatchDocument
            ?.dispatchNumber ??
          createDispatchNumber(
            shippingUnit
              .handlingUnit.id,
            shipmentAt
          );

        const quantitiesByProduct =
          new Map<
            number,
            {
              productCode: string;
              productName: string;
              quantity: number;
            }
          >();

        for (
          const item of pendingItems
        ) {
          const current =
            quantitiesByProduct.get(
              item.productId
            );

          quantitiesByProduct.set(
            item.productId,
            {
              productCode:
                item.productCode,
              productName:
                item.productName,
              quantity:
                (current?.quantity ??
                  0) +
                item.pendingQuantity,
            }
          );
        }

        const productIds =
          Array.from(
            quantitiesByProduct.keys()
          );

        const products =
          await tx.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
            select: {
              id: true,
              code: true,
              name: true,
              stock: true,
              reservedStock: true,
            },
          });

        const productMap =
          new Map(
            products.map(
              (product) => [
                product.id,
                product,
              ]
            )
          );

        for (
          const [
            productId,
            shipment,
          ] of quantitiesByProduct
        ) {
          const product =
            productMap.get(productId);

          if (!product) {
            throw new Error(
              `${shipment.productCode} ürünü bulunamadı.`
            );
          }

          if (
            product.stock <
            shipment.quantity
          ) {
            throw new Error(
              `${product.code} - ${product.name} için fiziksel stok yetersiz. ` +
                `Stok: ${product.stock}, sevk miktarı: ${shipment.quantity}.`
            );
          }

          if (
            product.reservedStock <
            shipment.quantity
          ) {
            throw new Error(
              `${product.code} - ${product.name} için rezervasyon bakiyesi yetersiz. ` +
                `Rezerve: ${product.reservedStock}, sevk miktarı: ${shipment.quantity}.`
            );
          }
        }

        const dispatchDocument =
          await tx.dispatchDocument.upsert({
            where: {
              shippingHandlingUnitId:
                shippingUnit.id,
            },
            create: {
              shippingHandlingUnitId:
                shippingUnit.id,
              status:
                DispatchDocumentStatus.ISSUED,
              dispatchNumber,
              documentDate:
                shipmentAt,
              shipmentAt,
              recipientCode:
                shippingUnit.customerCode,
              recipientName:
                shippingUnit.customerName,
              recipientTaxOffice:
                shippingUnit.taxOffice,
              recipientTaxNumber:
                shippingUnit.taxNumber,
              recipientAddress:
                shippingUnit.address,
              recipientCity:
                shippingUnit.city,
              recipientDistrict:
                shippingUnit.district,
              recipientPostalCode:
                shippingUnit.postalCode,
              carrierName:
                normalizeOptionalText(
                  input.carrierName
                ),
              vehiclePlate:
                normalizeOptionalText(
                  input.vehiclePlate
                )?.toUpperCase(),
              driverName:
                normalizeOptionalText(
                  input.driverName
                ),
              driverIdentityNumber:
                normalizeOptionalText(
                  input.driverIdentityNumber
                ),
              issuedAt: shipmentAt,
              createdById:
                input.operatorId,
              createdByName:
                input.operatorName,
              issuedById:
                input.operatorId,
              issuedByName:
                input.operatorName,
              notes:
                normalizeOptionalText(
                  input.notes
                ),
            },
            update: {
              status:
                DispatchDocumentStatus.ISSUED,
              dispatchNumber,
              documentDate:
                shipmentAt,
              shipmentAt,
              carrierName:
                normalizeOptionalText(
                  input.carrierName
                ),
              vehiclePlate:
                normalizeOptionalText(
                  input.vehiclePlate
                )?.toUpperCase(),
              driverName:
                normalizeOptionalText(
                  input.driverName
                ),
              driverIdentityNumber:
                normalizeOptionalText(
                  input.driverIdentityNumber
                ),
              issuedAt: shipmentAt,
              issuedById:
                input.operatorId,
              issuedByName:
                input.operatorName,
              notes:
                normalizeOptionalText(
                  input.notes
                ),
            },
            select: {
              id: true,
              dispatchNumber: true,
            },
          });

        const shippedByOrder =
          new Map<number, number>();

        for (
          const item of pendingItems
        ) {
          await tx.dispatchDocumentLine.create({
            data: {
              dispatchDocumentId:
                dispatchDocument.id,
              shippingHandlingUnitItemId:
                item.id,
              orderId:
                item.orderId,
              orderItemId:
                item.orderItemId,
              productId:
                item.productId,
              orderNumber:
                shippingUnit.orders.find(
                  (order) =>
                    order.orderId ===
                    item.orderId
                )?.orderNumber ??
                String(item.orderId),
              productCode:
                item.productCode,
              productBarcode:
                item.productBarcode,
              productName:
                item.productName,
              quantity:
                item.pendingQuantity,
            },
          });

          await tx.shippingHandlingUnitItem.update({
            where: {
              id: item.id,
            },
            data: {
              shippedQuantity:
                item.quantity,
            },
          });

          await tx.orderItem.update({
            where: {
              id: item.orderItemId,
            },
            data: {
              shippedQuantity: {
                increment:
                  item.pendingQuantity,
              },
            },
          });

          shippedByOrder.set(
            item.orderId,
            (shippedByOrder.get(
              item.orderId
            ) ?? 0) +
              item.pendingQuantity
          );

          if (
            shippingUnit
              .waveDistribution
          ) {
            await tx.waveDistributionLine.updateMany({
              where: {
                distributionId:
                  shippingUnit
                    .waveDistribution.id,
                orderItemId:
                  item.orderItemId,
              },
              data: {
                shippedQuantity: {
                  increment:
                    item.pendingQuantity,
                },
              },
            });
          }
        }

        for (
          const orderLink of
          shippingUnit.orders
        ) {
          const shippedQuantity =
            shippedByOrder.get(
              orderLink.orderId
            ) ?? 0;

          if (
            shippedQuantity <= 0
          ) {
            continue;
          }

          await tx.shippingHandlingUnitOrder.update({
            where: {
              id: orderLink.id,
            },
            data: {
              shippedQuantity: {
                increment:
                  shippedQuantity,
              },
            },
          });

          if (
            shippingUnit
              .waveDistribution
          ) {
            await tx.waveDistributionOrder.updateMany({
              where: {
                distributionId:
                  shippingUnit
                    .waveDistribution.id,
                orderId:
                  orderLink.orderId,
              },
              data: {
                shippedQuantity: {
                  increment:
                    shippedQuantity,
                },
              },
            });
          }

          const fulfillment =
            await tx.orderFulfillment.findUnique({
              where: {
                orderId:
                  orderLink.orderId,
              },
              select: {
                id: true,
                plannedQuantity: true,
                shippedQuantity: true,
                shippingStartedAt: true,
              },
            });

          if (fulfillment) {
            const nextShippedQuantity =
              fulfillment.shippedQuantity +
              shippedQuantity;

            const shippingStatus =
              getProgressStatus(
                nextShippedQuantity,
                fulfillment.plannedQuantity
              );

            await tx.orderFulfillment.update({
              where: {
                id: fulfillment.id,
              },
              data: {
                shippedQuantity:
                  nextShippedQuantity,
                shippingStatus,
                shippingStartedAt:
                  fulfillment.shippingStartedAt ??
                  shipmentAt,
                shippingCompletedAt:
                  shippingStatus ===
                  FulfillmentProgressStatus.COMPLETED
                    ? shipmentAt
                    : null,
              },
            });
          }

          const updatedOrderItems =
            await tx.orderItem.findMany({
              where: {
                orderId:
                  orderLink.orderId,
              },
              select: {
                quantity: true,
                pickedQuantity: true,
                packedQuantity: true,
                shippedQuantity: true,
              },
            });

          const nextOrderStatus =
            getOrderStatus(
              updatedOrderItems
            );

          const completelyShipped =
            nextOrderStatus ===
            OrderStatus.SHIPPED;

          await tx.order.update({
            where: {
              id:
                orderLink.orderId,
            },
            data: {
              status:
                nextOrderStatus,
              stockDeducted:
                completelyShipped,
              stockDeductedAt:
                completelyShipped
                  ? shipmentAt
                  : null,
              stockReserved:
                completelyShipped
                  ? false
                  : undefined,
            },
          });
        }

        for (
          const [
            productId,
            shipment,
          ] of quantitiesByProduct
        ) {
          const product =
            productMap.get(productId)!;

          const physicalBalanceAfter =
            product.stock -
            shipment.quantity;

          const reservedBalanceAfter =
            product.reservedStock -
            shipment.quantity;

          await tx.product.update({
            where: {
              id: productId,
            },
            data: {
              stock:
                physicalBalanceAfter,
              reservedStock:
                reservedBalanceAfter,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId,
              orderId: null,
              purchaseOrderId: null,
              shippingHandlingUnitId:
                shippingUnit.id,
              movementType:
                StockMovementType.SALE_SHIPMENT,
              physicalChange:
                -shipment.quantity,
              reservedChange:
                -shipment.quantity,
              physicalBalanceAfter,
              reservedBalanceAfter,
              availableBalanceAfter:
                physicalBalanceAfter -
                reservedBalanceAfter,
              documentNumber:
                dispatchNumber,
              description:
                `${barcode} Sevk THM çıkışı. ` +
                `Alıcı: ${shippingUnit.customerName}.`,
            },
          });
        }

        const totalQuantity =
          pendingItems.reduce(
            (total, item) =>
              total +
              item.pendingQuantity,
            0
          );

        if (
          shippingUnit
            .waveDistribution
        ) {
          const distribution =
            shippingUnit
              .waveDistribution;

          const nextShippedQuantity =
            distribution.shippedQuantity +
            totalQuantity;

          await tx.waveDistribution.update({
            where: {
              id: distribution.id,
            },
            data: {
              shippedQuantity:
                nextShippedQuantity,
              status:
                nextShippedQuantity >=
                distribution.plannedQuantity
                  ? "COMPLETED"
                  : "IN_PROGRESS",
              completedAt:
                nextShippedQuantity >=
                distribution.plannedQuantity
                  ? shipmentAt
                  : null,
            },
          });

          const distributions =
            await tx.waveDistribution.findMany({
              where: {
                waveId:
                  distribution.waveId,
              },
              select: {
                plannedQuantity: true,
                shippedQuantity: true,
              },
            });

          const plannedQuantity =
            distributions.reduce(
              (total, item) =>
                total +
                item.plannedQuantity,
              0
            );

          const shippedQuantity =
            distributions.reduce(
              (total, item) =>
                total +
                item.shippedQuantity,
              0
            );

          const shippingProgress =
            plannedQuantity > 0
              ? Math.min(
                  100,
                  Math.round(
                    (shippedQuantity /
                      plannedQuantity) *
                      100
                  )
                )
              : 0;

          await tx.wave.update({
            where: {
              id:
                distribution.waveId,
            },
            data: {
              shippingProgress,
            },
          });
        }

        await tx.shippingHandlingUnit.update({
          where: {
            id: shippingUnit.id,
          },
          data: {
            status:
              ShippingHandlingUnitStatus.SHIPPED,
            shippedAt:
              shipmentAt,
          },
        });

        await tx.handlingUnit.update({
          where: {
            id:
              shippingUnit
                .handlingUnit.id,
          },
          data: {
            purpose:
              HandlingUnitPurpose.SHIPPING,
            status:
              HandlingUnitStatus.IN_TRANSIT,
            warehouseId: null,
            locationId: null,
          },
        });

        const orderNumbers =
          Array.from(
            new Set(
              shippingUnit.orders.map(
                (order) =>
                  order.orderNumber
              )
            )
          );

        await tx.wmsOperationLog.create({
          data: {
            operationType:
              WmsOperationType.SHIPPING,
            module:
              "RF_SHIPPING",
            entityType:
              "HANDLING_UNIT",
            entityId:
              shippingUnit
                .handlingUnit.id,
            operatorId:
              input.operatorId,
            operatorName:
              input.operatorName,
            barcode,
            quantity:
              totalQuantity,
            previousStatus:
              ShippingHandlingUnitStatus.READY_TO_SHIP,
            newStatus:
              ShippingHandlingUnitStatus.SHIPPED,
            description:
              `${barcode} Sevk THM, ${dispatchNumber} belge numarasıyla sevk edildi.`,
            metadata: {
              shippingHandlingUnitId:
                shippingUnit.id,
              dispatchDocumentId:
                dispatchDocument.id,
              dispatchNumber,
              customerName:
                shippingUnit.customerName,
              orderNumbers,
              carrierName:
                normalizeOptionalText(
                  input.carrierName
                ),
              vehiclePlate:
                normalizeOptionalText(
                  input.vehiclePlate
                )?.toUpperCase(),
            },
          },
        });

        return {
          barcode,
          dispatchNumber:
            dispatchDocument.dispatchNumber ??
            dispatchNumber,
          customerName:
            shippingUnit.customerName,
          totalQuantity,
          orderNumbers,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,
      }
    );
  }
}
