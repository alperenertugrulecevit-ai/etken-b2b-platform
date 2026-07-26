import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderFulfillmentFlow,
  OrderStatus,
  Prisma,
  WaveDistributionStatus,
  WaveStatus,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { FulfillmentService } from "./fulfillment.service";

const PICKABLE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
];

const SOURCE_UNIT_STATUSES: HandlingUnitStatus[] = [
  HandlingUnitStatus.OPEN,
  HandlingUnitStatus.CLOSED,
  HandlingUnitStatus.STORED,
];

export type WavePoolPickingInput = {
  waveId: string;
  sourceBarcode: string;
  targetBarcode: string;
  productBarcode: string;
  quantity: number;

  operatorId: string;
  operatorName: string;
  terminalCode?: string | null;
};

export type WavePoolPickingAllocation = {
  orderId: number;
  orderNumber: string;
  orderItemId: number;
  distributionCode: string;
  quantity: number;
};

export type WavePoolPickingResult = {
  waveId: string;
  waveNo: string;

  productId: number;
  productCode: string;
  productName: string;

  sourceBarcode: string;
  targetBarcode: string;

  pickedQuantity: number;
  sourceQuantityAfter: number;
  targetQuantityAfter: number;
  waveRemainingQuantity: number;

  allocations: WavePoolPickingAllocation[];
};

function normalizeRequiredText(
  value: string,
  fieldLabel: string
) {
  const normalized = value
    .trim()
    .toUpperCase();

  if (!normalized) {
    throw new Error(
      `${fieldLabel} gereklidir.`
    );
  }

  return normalized;
}

function validateQuantity(
  quantity: number
) {
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Toplama miktarı sıfırdan büyük bir tam sayı olmalıdır."
    );
  }
}

function calculateProgress(
  completed: number,
  planned: number
) {
  if (planned <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (completed / planned) *
          100
      )
    )
  );
}

export class WavePoolPickingService {
  static async execute(
    input: WavePoolPickingInput
  ): Promise<WavePoolPickingResult> {
    const waveId =
      input.waveId.trim();

    if (!waveId) {
      throw new Error(
        "Toplama yapılacak Wave seçilmelidir."
      );
    }

    const sourceBarcode =
      normalizeRequiredText(
        input.sourceBarcode,
        "Kaynak THM barkodu"
      );

    const targetBarcode =
      normalizeRequiredText(
        input.targetBarcode,
        "Toplama THM barkodu"
      );

    const productBarcode =
      normalizeRequiredText(
        input.productBarcode,
        "Ürün barkodu"
      );

    validateQuantity(
      input.quantity
    );

    if (
      sourceBarcode ===
      targetBarcode
    ) {
      throw new Error(
        "Kaynak THM ile hedef Toplama THM aynı olamaz."
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const wave =
          await tx.wave.findUnique({
            where: {
              id: waveId,
            },

            select: {
              id: true,
              waveNo: true,
              status: true,
              startedAt: true,
            },
          });

        if (!wave) {
          throw new Error(
            "Wave kaydı bulunamadı."
          );
        }

        if (
          !PICKABLE_WAVE_STATUSES.includes(
            wave.status
          )
        ) {
          throw new Error(
            `${wave.waveNo} Wave'i havuz toplamaya açık değildir.`
          );
        }

        const sourceUnit =
          await tx.handlingUnit.findUnique({
            where: {
              barcode:
                sourceBarcode,
            },

            select: {
              id: true,
              barcode: true,
              purpose: true,
              status: true,
              parentUnitId: true,
              assignedOrderId: true,
              assignedWaveId: true,

              childUnits: {
                select: {
                  id: true,
                },
              },

              items: {
                where: {
                  product: {
                    OR: [
                      {
                        barcode:
                          productBarcode,
                      },
                      {
                        code:
                          productBarcode,
                      },
                    ],
                  },
                },

                select: {
                  id: true,
                  productId: true,
                  quantity: true,
                  reservedStock: true,

                  product: {
                    select: {
                      id: true,
                      code: true,
                      barcode: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

        if (!sourceUnit) {
          throw new Error(
            `${sourceBarcode} barkodlu kaynak THM bulunamadı.`
          );
        }

        if (
          sourceUnit.purpose !==
          HandlingUnitPurpose.STOCK
        ) {
          throw new Error(
            `${sourceUnit.barcode} stok amaçlı bir kaynak THM değildir.`
          );
        }

        if (
          !SOURCE_UNIT_STATUSES.includes(
            sourceUnit.status
          )
        ) {
          throw new Error(
            `${sourceUnit.barcode} toplama kaynağı olarak kullanılamaz.`
          );
        }

        if (
          sourceUnit.parentUnitId !==
          null
        ) {
          throw new Error(
            `${sourceUnit.barcode} başka bir THM'ye bağlıdır. Bağımsız kaynak THM okutun.`
          );
        }

        if (
          sourceUnit.assignedOrderId !==
          null
        ) {
          throw new Error(
            `${sourceUnit.barcode} bir siparişe atanmıştır.`
          );
        }

        if (
          sourceUnit.assignedWaveId !==
          null
        ) {
          throw new Error(
            `${sourceUnit.barcode} bir Wave'e atanmıştır.`
          );
        }

        const sourceItem =
          sourceUnit.items[0];

        if (!sourceItem) {
          throw new Error(
            `${productBarcode} barkodlu ürün ${sourceUnit.barcode} içinde bulunamadı.`
          );
        }

        const sourceAvailableQuantity =
          sourceItem.quantity -
          sourceItem.reservedStock;

        if (
          sourceAvailableQuantity <= 0
        ) {
          throw new Error(
            `${sourceUnit.barcode} içinde kullanılabilir ürün miktarı bulunmuyor.`
          );
        }

        if (
          input.quantity >
          sourceAvailableQuantity
        ) {
          throw new Error(
            `Kaynak THM'de yeterli kullanılabilir miktar yok. ` +
              `Fiziksel: ${sourceItem.quantity}, ` +
              `THM rezerve: ${sourceItem.reservedStock}, ` +
              `kullanılabilir: ${sourceAvailableQuantity}.`
          );
        }

        const targetUnit =
          await FulfillmentService.prepareWavePickingUnit(
            tx,
            {
              waveId:
                wave.id,
              targetBarcode,
            }
          );

        if (
          targetUnit.id ===
          sourceUnit.id
        ) {
          throw new Error(
            "Kaynak THM ile hedef Toplama THM aynı olamaz."
          );
        }

        const distributionLines =
          await tx.waveDistributionLine.findMany({
            where: {
              productId:
                sourceItem.productId,

              distribution: {
                waveId:
                  wave.id,

                status: {
                  not:
                    WaveDistributionStatus.CANCELLED,
                },
              },

              order: {
                status: {
                  not:
                    OrderStatus.CANCELLED,
                },
              },
            },

            select: {
              id: true,
              orderId: true,
              orderItemId: true,
              plannedQuantity: true,
              createdAt: true,

              distribution: {
                select: {
                  sequenceNumber: true,
                  distributionCode: true,
                },
              },

              distributionOrder: {
                select: {
                  orderNumber: true,
                },
              },

              orderItem: {
                select: {
                  quantity: true,
                  pickedQuantity: true,
                },
              },
            },
          });

        distributionLines.sort(
          (left, right) => {
            const sequenceDifference =
              left.distribution
                .sequenceNumber -
              right.distribution
                .sequenceNumber;

            if (
              sequenceDifference !==
              0
            ) {
              return sequenceDifference;
            }

            const orderDifference =
              left.distributionOrder
                .orderNumber.localeCompare(
                  right
                    .distributionOrder
                    .orderNumber,
                  "tr"
                );

            if (
              orderDifference !== 0
            ) {
              return orderDifference;
            }

            return (
              left.createdAt.getTime() -
              right.createdAt.getTime()
            );
          }
        );

        if (
          distributionLines.length ===
          0
        ) {
          throw new Error(
            `${sourceItem.product.code} ürünü için ${wave.waveNo} Wave'inde açık dağılım satırı bulunamadı. Önce Wave dağılım planını oluşturun.`
          );
        }

        const totalWaveRemaining =
          distributionLines.reduce(
            (
              total,
              line
            ) => {
              const orderItemRemaining =
                Math.max(
                  0,
                  line.orderItem
                    .quantity -
                    line.orderItem
                      .pickedQuantity
                );

              return (
                total +
                Math.min(
                  line.plannedQuantity,
                  orderItemRemaining
                )
              );
            },
            0
          );

        if (
          totalWaveRemaining <= 0
        ) {
          throw new Error(
            `${sourceItem.product.code} ürünü ${wave.waveNo} Wave'i için tamamen toplanmış.`
          );
        }

        if (
          input.quantity >
          totalWaveRemaining
        ) {
          throw new Error(
            `Toplama miktarı Wave ihtiyacından fazla. ` +
              `Kalan ihtiyaç: ${totalWaveRemaining}.`
          );
        }

        const targetProductItem =
          await tx.handlingUnitItem.findUnique({
            where: {
                           handling_unit_product_unique:
                {
                  handlingUnitId:
                    targetUnit.id,

                  productId:
                    sourceItem.productId,
                },
            },

            select: {
              id: true,
              quantity: true,
            },
          });

        const targetQuantityBefore =
          targetProductItem?.quantity ??
          0;

        const sourceQuantityAfter =
          sourceItem.quantity -
          input.quantity;

        const targetQuantityAfter =
          targetQuantityBefore +
          input.quantity;

        if (
          sourceQuantityAfter === 0 &&
          sourceItem.reservedStock ===
            0
        ) {
          await tx.handlingUnitItem.delete({
            where: {
              id:
                sourceItem.id,
            },
          });
        } else {
          await tx.handlingUnitItem.update({
            where: {
              id:
                sourceItem.id,
            },

            data: {
              quantity:
                sourceQuantityAfter,
            },
          });
        }

        await tx.handlingUnitItem.upsert({
          where: {
            handling_unit_product_unique:
              {
                handlingUnitId:
                  targetUnit.id,

                productId:
                  sourceItem.productId,
              },
          },

          update: {
            quantity: {
              increment:
                input.quantity,
            },
          },

          create: {
            handlingUnitId:
              targetUnit.id,

            productId:
              sourceItem.productId,

            quantity:
              input.quantity,

            reservedStock: 0,
          },
        });

        const allocations:
          WavePoolPickingAllocation[] =
          [];

        const affectedOrderIds =
          new Set<number>();

        let quantityToAllocate =
          input.quantity;

        let allocatedQuantity = 0;

        for (
          const line of
          distributionLines
        ) {
          if (
            quantityToAllocate <= 0
          ) {
            break;
          }

          const lineRemaining =
            Math.max(
              0,
              Math.min(
                line.plannedQuantity,
                line.orderItem
                  .quantity -
                  line.orderItem
                    .pickedQuantity
              )
            );

          if (
            lineRemaining <= 0
          ) {
            continue;
          }

          const allocationQuantity =
            Math.min(
              lineRemaining,
              quantityToAllocate
            );

          await tx.orderItem.update({
            where: {
              id:
                line.orderItemId,
            },

            data: {
              pickedQuantity: {
                increment:
                  allocationQuantity,
              },
            },
          });

          allocatedQuantity +=
            allocationQuantity;

          quantityToAllocate -=
            allocationQuantity;

          const pickingRecord =
            await tx.pickingRecord.create({
              data: {
                orderId:
                  line.orderId,

                orderItemId:
                  line.orderItemId,

                productId:
                  sourceItem.productId,

                sourceHandlingUnitId:
                  sourceUnit.id,

                targetHandlingUnitId:
                  targetUnit.id,

                waveId:
                  wave.id,

                flowType:
                  OrderFulfillmentFlow.WAVE,

                quantity:
                  allocationQuantity,

                sourceQuantityAfter:
                  sourceItem.quantity -
                  allocatedQuantity,

                targetQuantityAfter:
                  targetQuantityBefore +
                  allocatedQuantity,
              },
            });

          await tx.wmsOperationLog.create({
            data: {
              operationType:
                WmsOperationType.PICKING,

              module:
                "RF_WAVE_POOL_PICKING",

              entityType:
                "PICKING_RECORD",

              entityId:
                pickingRecord.id,

              operatorId:
                input.operatorId,

              operatorName:
                input.operatorName,

              terminalCode:
                input.terminalCode ??
                null,

              barcode:
                targetUnit.barcode,

              sourceBarcode:
                sourceUnit.barcode,

              targetBarcode:
                targetUnit.barcode,

              orderId:
                line.orderId,

              orderNumber:
                line
                  .distributionOrder
                  .orderNumber,

              productId:
                sourceItem.product.id,

              productCode:
                sourceItem.product.code,

              productName:
                sourceItem.product.name,

              quantity:
                allocationQuantity,

              description:
                `${wave.waveNo} Wave havuz toplama işlemi. ` +
                `${sourceItem.product.code} ürünü ortak Toplama THM'e aktarıldı.`,

              metadata: {
                waveId:
                  wave.id,

                waveNo:
                  wave.waveNo,

                distributionCode:
                  line.distribution
                    .distributionCode,

                sourceQuantityAfter:
                  sourceItem.quantity -
                  allocatedQuantity,

                targetQuantityAfter:
                  targetQuantityBefore +
                  allocatedQuantity,
              },
            },
          });

          allocations.push({
            orderId:
              line.orderId,

            orderNumber:
              line
                .distributionOrder
                .orderNumber,

            orderItemId:
              line.orderItemId,

            distributionCode:
              line.distribution
                .distributionCode,

            quantity:
              allocationQuantity,
          });

          affectedOrderIds.add(
            line.orderId
          );
        }

        if (
          quantityToAllocate !== 0
        ) {
          throw new Error(
            "Toplanan miktarın tamamı Wave siparişlerine dağıtılamadı."
          );
        }

        const sourceTotal =
          await tx.handlingUnitItem.aggregate({
            where: {
              handlingUnitId:
                sourceUnit.id,
            },

            _sum: {
              quantity: true,
            },
          });

        if (
          (
            sourceTotal._sum
              .quantity ?? 0
          ) === 0 &&
          sourceUnit.childUnits
            .length === 0
        ) {
          await tx.handlingUnit.update({
            where: {
              id:
                sourceUnit.id,
            },

            data: {
              status:
                HandlingUnitStatus.EMPTY,
            },
          });
        }

        for (
          const orderId of
          affectedOrderIds
        ) {
          const orderItems =
            await tx.orderItem.findMany({
              where: {
                orderId,
              },

              select: {
                quantity: true,
                pickedQuantity: true,
              },
            });

          const plannedQuantity =
            orderItems.reduce(
              (
                total,
                item
              ) =>
                total +
                item.quantity,
              0
            );

          const pickedQuantity =
            orderItems.reduce(
              (
                total,
                item
              ) =>
                total +
                Math.min(
                  item.quantity,
                  item.pickedQuantity
                ),
              0
            );

          const isCompleted =
            plannedQuantity > 0 &&
            pickedQuantity >=
              plannedQuantity;

          await tx.waveOrder.update({
            where: {
              wave_order_unique: {
                waveId:
                  wave.id,

                orderId,
              },
            },

            data: {
              completedQuantity:
                pickedQuantity,

              isCompleted,

              completedAt:
                isCompleted
                  ? new Date()
                  : null,
            },
          });

          await FulfillmentService.refreshOrderProgress(
            tx,
            {
              orderId,

              flowType:
                OrderFulfillmentFlow.WAVE,

              waveId:
                wave.id,
            }
          );
        }

        const currentWave =
          await tx.wave.findUnique({
            where: {
              id:
                wave.id,
            },

            select: {
              orders: {
                select: {
                  order: {
                    select: {
                      items: {
                        select: {
                          quantity: true,
                          pickedQuantity: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

        const waveItems =
          currentWave?.orders.flatMap(
            (waveOrder) =>
              waveOrder.order.items
          ) ?? [];

        const wavePlannedQuantity =
          waveItems.reduce(
            (
              total,
              item
            ) =>
              total +
              item.quantity,
            0
          );

        const wavePickedQuantity =
          waveItems.reduce(
            (
              total,
              item
            ) =>
              total +
              Math.min(
                item.quantity,
                item.pickedQuantity
              ),
            0
          );

        const waveCompletedLineCount =
          waveItems.filter(
            (item) =>
              item.quantity > 0 &&
              item.pickedQuantity >=
                item.quantity
          ).length;

        const waveCompletedOrderCount =
          currentWave?.orders.filter(
            (waveOrder) =>
              waveOrder.order.items
                .length > 0 &&
              waveOrder.order.items.every(
                (item) =>
                  item.pickedQuantity >=
                  item.quantity
              )
          ).length ?? 0;

        await tx.wave.update({
          where: {
            id:
              wave.id,
          },

          data: {
            status:
              wave.status ===
              WaveStatus.RELEASED
                ? WaveStatus.IN_PROGRESS
                : wave.status,

            startedAt:
              wave.startedAt ??
              new Date(),

            completedQuantity:
              wavePickedQuantity,

            completedLineCount:
              waveCompletedLineCount,

            completedOrderCount:
              waveCompletedOrderCount,

            pickingProgress:
              calculateProgress(
                wavePickedQuantity,
                wavePlannedQuantity
              ),
          },
        });

        return {
          waveId:
            wave.id,

          waveNo:
            wave.waveNo,

          productId:
            sourceItem.product.id,

          productCode:
            sourceItem.product.code,

          productName:
            sourceItem.product.name,

          sourceBarcode:
            sourceUnit.barcode,

          targetBarcode:
            targetUnit.barcode,

          pickedQuantity:
            input.quantity,

          sourceQuantityAfter,

          targetQuantityAfter,

          waveRemainingQuantity:
            Math.max(
              0,
              wavePlannedQuantity -
                wavePickedQuantity
            ),

          allocations,
        };
      },
      {
        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      }
    );
  }
}