import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderFulfillmentFlow,
  OrderType,
  Prisma,
  ShippingHandlingUnitStatus,
  WaveDistributionStatus,
  WaveStatus,
  WmsOperationType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  FulfillmentService,
} from "./fulfillment.service";

type Actor = {
  userId: string;
  displayName: string;
  terminalCode?: string | null;
};

type PackInput = {
  distributionCode: string;
  sourceBarcode: string;
  targetBarcode: string;
  productBarcode: string;
  quantity: number;
  actor: Actor;
};

const PACKABLE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.IN_PROGRESS,
];

const SOURCE_STATUSES: HandlingUnitStatus[] = [
  HandlingUnitStatus.OPEN,
  HandlingUnitStatus.CLOSED,
  HandlingUnitStatus.STORED,
];

const TARGET_STATUSES: HandlingUnitStatus[] = [
  HandlingUnitStatus.OPEN,
  HandlingUnitStatus.EMPTY,
  HandlingUnitStatus.STORED,
];

function normalize(value: string) {
  return value.trim().toUpperCase();
}

export class WavePackingService {
  static async packItem(
    input: PackInput,
  ) {
    const distributionCode =
      normalize(
        input.distributionCode,
      );

    const sourceBarcode =
      normalize(
        input.sourceBarcode,
      );

    const targetBarcode =
      normalize(
        input.targetBarcode,
      );

    const productBarcode =
      normalize(
        input.productBarcode,
      );

    if (
      !distributionCode ||
      !sourceBarcode ||
      !targetBarcode ||
      !productBarcode
    ) {
      throw new Error(
        "Dağılım, kaynak THM, Sevk THM ve ürün barkodu zorunludur.",
      );
    }

    if (
      !Number.isInteger(
        input.quantity,
      ) ||
      input.quantity <= 0
    ) {
      throw new Error(
        "Paketleme miktarı sıfırdan büyük bir tam sayı olmalıdır.",
      );
    }

    if (
      sourceBarcode ===
      targetBarcode
    ) {
      throw new Error(
        "Kaynak Toplama THM ile hedef Sevk THM aynı olamaz.",
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const distribution =
          await tx.waveDistribution.findUnique({
            where: {
              distributionCode,
            },
            select: {
              id: true,
              waveId: true,
              distributionCode: true,
              status: true,
              customerId: true,
              shippingAddressId: true,
              customerCode: true,
              customerName: true,
              taxOffice: true,
              taxNumber: true,
              addressTitle: true,
              contactName: true,
              phone: true,
              address: true,
              city: true,
              district: true,
              postalCode: true,
              plannedQuantity: true,
              packedQuantity: true,
              wave: {
                select: {
                  id: true,
                  waveNo: true,
                  status: true,
                },
              },
              lines: {
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
                orderBy: [
                  {
                    orderId: "asc",
                  },
                  {
                    orderItemId: "asc",
                  },
                ],
                select: {
                  id: true,
                  distributionOrderId:
                    true,
                  orderId: true,
                  orderItemId: true,
                  productId: true,
                  productCode: true,
                  productBarcode: true,
                  productName: true,
                  plannedQuantity: true,
                  packedQuantity: true,
                  distributionOrder: {
                    select: {
                      orderNumber: true,
                    },
                  },
                  order: {
                    select: {
                      orderType: true,
                    },
                  },
                  orderItem: {
                    select: {
                      pickedQuantity:
                        true,
                    },
                  },
                },
              },
            },
          });

        if (!distribution) {
          throw new Error(
            `${distributionCode} dağılım sırası bulunamadı.`,
          );
        }

        if (
          !PACKABLE_WAVE_STATUSES.includes(
            distribution.wave.status,
          )
        ) {
          throw new Error(
            `${distribution.wave.waveNo} Wave'i paketleme işlemine açık değildir.`,
          );
        }

        if (
          distribution.status ===
          WaveDistributionStatus.COMPLETED ||
          distribution.status ===
          WaveDistributionStatus.CANCELLED
        ) {
          throw new Error(
            `${distribution.distributionCode} dağılımı paketlemeye kapalıdır.`,
          );
        }

        if (
          distribution.lines.length ===
          0
        ) {
          throw new Error(
            `${productBarcode} ürünü ${distribution.distributionCode} dağılımında bulunmuyor.`,
          );
        }

        const availableLines =
          distribution.lines
            .map((line) => ({
              ...line,
              availableQuantity:
                Math.max(
                  0,
                  Math.min(
                    line.plannedQuantity,
                    line.orderItem
                      .pickedQuantity,
                  ) -
                    line.packedQuantity,
                ),
            }))
            .filter(
              (line) =>
                line.availableQuantity >
                0,
            );

        const ecommerceOrderIds =
          Array.from(
            new Set(
              availableLines
                .filter(
                  (line) =>
                    line.order.orderType ===
                    OrderType.ECOMMERCE,
                )
                .map(
                  (line) => line.orderId,
                ),
            ),
          );

        if (
          ecommerceOrderIds.length > 1
        ) {
          throw new Error(
            "E-Ticaret Wave paketlemede siparişler birleştirilemez. Dağılım planını yenileyin; her E-Ticaret siparişi ayrı paketlenmelidir.",
          );
        }

        const availableQuantity =
          availableLines.reduce(
            (total, line) =>
              total +
              line.availableQuantity,
            0,
          );

        if (
          input.quantity >
          availableQuantity
        ) {
          throw new Error(
            `${distribution.distributionCode} için paketlenebilir ${availableLines[0]?.productCode ?? productBarcode} miktarı ${availableQuantity}, girilen miktar ${input.quantity}.`,
          );
        }

        const [
          sourceUnit,
          targetUnit,
        ] = await Promise.all([
          tx.handlingUnit.findUnique({
            where: {
              barcode:
                sourceBarcode,
            },
            select: {
              id: true,
              barcode: true,
              purpose: true,
              warehouseId: true,
              status: true,
              assignedOrderId: true,
              assignedWaveId: true,
              items: {
                where: {
                  productId:
                    availableLines[0]
                      .productId,
                },
                select: {
                  id: true,
                  quantity: true,
                },
              },
            },
          }),
          tx.handlingUnit.findUnique({
            where: {
              barcode:
                targetBarcode,
            },
            select: {
              id: true,
              barcode: true,
              purpose: true,
              status: true,
              parentUnitId: true,
              assignedOrderId: true,
              assignedWaveId: true,
              items: {
                select: {
                  quantity: true,
                },
              },
              shippingProfile: {
                select: {
                  id: true,
                  status: true,
                  waveDistributionId:
                    true,
                  packageSequence:
                    true,
                },
              },
            },
          }),
        ]);

        if (!sourceUnit) {
          throw new Error(
            `${sourceBarcode} barkodlu kaynak Toplama THM bulunamadı.`,
          );
        }

        if (
          sourceUnit.purpose !==
            HandlingUnitPurpose.PICKING ||
          sourceUnit.assignedWaveId !==
            distribution.waveId ||
          sourceUnit.assignedOrderId !==
            null
        ) {
          throw new Error(
            `${sourceBarcode}, ${distribution.wave.waveNo} Wave'ine ait bir Toplama THM değildir.`,
          );
        }

        if (
          !SOURCE_STATUSES.includes(
            sourceUnit.status,
          )
        ) {
          throw new Error(
            `${sourceBarcode} kaynak THM paketleme işlemine uygun değildir.`,
          );
        }

        const sourceItem =
          sourceUnit.items[0];

        if (
          !sourceItem ||
          sourceItem.quantity <
            input.quantity
        ) {
          throw new Error(
            `${sourceBarcode} Toplama THM içinde yeterli ürün bulunmuyor. Mevcut: ${sourceItem?.quantity ?? 0}.`,
          );
        }

        if (!targetUnit) {
          throw new Error(
            `${targetBarcode} barkodlu Sevk THM bulunamadı.`,
          );
        }

        if (
          targetUnit.purpose !==
          HandlingUnitPurpose.SHIPPING
        ) {
          throw new Error(
            `${targetBarcode} bir Sevk THM değildir.`,
          );
        }

        if (
          !TARGET_STATUSES.includes(
            targetUnit.status,
          ) ||
          targetUnit.parentUnitId !==
            null
        ) {
          throw new Error(
            `${targetBarcode} ürün kabul etmeye uygun değildir.`,
          );
        }

        if (
          targetUnit.assignedOrderId !==
          null
        ) {
          throw new Error(
            `${targetBarcode} doğrudan sipariş toplamasına ayrılmıştır.`,
          );
        }

        if (
          targetUnit.assignedWaveId !==
            null &&
          targetUnit.assignedWaveId !==
            distribution.waveId
        ) {
          throw new Error(
            `${targetBarcode} başka bir Wave'e atanmıştır.`,
          );
        }

        const targetCurrentQuantity =
          targetUnit.items.reduce(
            (total, item) =>
              total + item.quantity,
            0,
          );

        if (
          !targetUnit.shippingProfile &&
          targetCurrentQuantity > 0
        ) {
          throw new Error(
            `${targetBarcode} içinde ürün bulunuyor ancak Sevk THM profili yok.`,
          );
        }

        if (
          targetUnit.shippingProfile &&
          (
            targetUnit.shippingProfile
              .status !==
              ShippingHandlingUnitStatus.OPEN ||
            targetUnit.shippingProfile
              .waveDistributionId !==
              distribution.id
          )
        ) {
          throw new Error(
            `${targetBarcode} farklı bir dağılıma aittir veya paketlemeye kapalıdır.`,
          );
        }

        const existingPackageCount =
          await tx.shippingHandlingUnit.count({
            where: {
              waveDistributionId:
                distribution.id,
            },
          });

        const shippingUnit =
          targetUnit.shippingProfile ??
          await tx.shippingHandlingUnit.create({
            data: {
              handlingUnitId:
                targetUnit.id,
              status:
                ShippingHandlingUnitStatus.OPEN,
              packageSequence:
                existingPackageCount +
                1,
              waveDistributionId:
                distribution.id,
              customerId:
                distribution.customerId,
              shippingAddressId:
                distribution.shippingAddressId,
              customerCode:
                distribution.customerCode,
              customerName:
                distribution.customerName,
              taxOffice:
                distribution.taxOffice,
              taxNumber:
                distribution.taxNumber,
              addressTitle:
                distribution.addressTitle,
              contactName:
                distribution.contactName,
              phone:
                distribution.phone,
              address:
                distribution.address,
              city:
                distribution.city,
              district:
                distribution.district,
              postalCode:
                distribution.postalCode,
              createdById:
                input.actor.userId,
              createdByName:
                input.actor.displayName,
            },
            select: {
              id: true,
              status: true,
              waveDistributionId:
                true,
              packageSequence: true,
            },
          });

        await tx.handlingUnit.update({
          where: {
            id: targetUnit.id,
          },
          data: {
            assignedOrderId: null,
            assignedWaveId:
              distribution.waveId,
            purpose:
              HandlingUnitPurpose.SHIPPING,
            warehouseId:
              sourceUnit.warehouseId,
            status:
              HandlingUnitStatus.OPEN,
          },
        });

        const sourceQuantityAfter =
          sourceItem.quantity -
          input.quantity;

        await tx.handlingUnitItem.update({
          where: {
            id: sourceItem.id,
          },
          data: {
            quantity:
              sourceQuantityAfter,
          },
        });

        const targetItem =
          await tx.handlingUnitItem.upsert({
            where: {
              handling_unit_product_unique:
                {
                  handlingUnitId:
                    targetUnit.id,
                  productId:
                    availableLines[0]
                      .productId,
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
                availableLines[0]
                  .productId,
              quantity:
                input.quantity,
              reservedStock: 0,
            },
            select: {
              quantity: true,
            },
          });

        let remainingToAllocate =
          input.quantity;

        const affectedOrderIds =
          new Set<number>();

        for (
          const line of
          availableLines
        ) {
          if (
            remainingToAllocate <= 0
          ) {
            break;
          }

          const allocatedQuantity =
            Math.min(
              remainingToAllocate,
              line.availableQuantity,
            );

          const shippingOrder =
            await tx.shippingHandlingUnitOrder.upsert({
              where: {
                shipping_handling_unit_order_unique:
                  {
                    shippingHandlingUnitId:
                      shippingUnit.id,
                    orderId:
                      line.orderId,
                  },
              },
              create: {
                shippingHandlingUnitId:
                  shippingUnit.id,
                orderId:
                  line.orderId,
                orderNumber:
                  line.distributionOrder
                    .orderNumber,
                plannedQuantity:
                  allocatedQuantity,
                packedQuantity:
                  allocatedQuantity,
              },
              update: {
                plannedQuantity: {
                  increment:
                    allocatedQuantity,
                },
                packedQuantity: {
                  increment:
                    allocatedQuantity,
                },
              },
              select: {
                id: true,
              },
            });

          await tx.shippingHandlingUnitItem.upsert({
            where: {
              shipping_handling_unit_item_unique:
                {
                  shippingHandlingUnitId:
                    shippingUnit.id,
                  orderItemId:
                    line.orderItemId,
                },
            },
            create: {
              shippingHandlingUnitId:
                shippingUnit.id,
              shippingHandlingUnitOrderId:
                shippingOrder.id,
              orderId:
                line.orderId,
              orderItemId:
                line.orderItemId,
              productId:
                line.productId,
              productCode:
                line.productCode,
              productBarcode:
                line.productBarcode,
              productName:
                line.productName,
              quantity:
                allocatedQuantity,
            },
            update: {
              quantity: {
                increment:
                  allocatedQuantity,
              },
            },
          });

          await Promise.all([
            tx.waveDistributionLine.update({
              where: {
                id: line.id,
              },
              data: {
                packedQuantity: {
                  increment:
                    allocatedQuantity,
                },
              },
            }),
            tx.waveDistributionOrder.update({
              where: {
                id:
                  line.distributionOrderId,
              },
              data: {
                packedQuantity: {
                  increment:
                    allocatedQuantity,
                },
              },
            }),
            tx.orderItem.update({
              where: {
                id:
                  line.orderItemId,
              },
              data: {
                packedQuantity: {
                  increment:
                    allocatedQuantity,
                },
              },
            }),
            tx.packingRecord.create({
              data: {
                waveDistributionId:
                  distribution.id,
                waveDistributionLineId:
                  line.id,
                shippingHandlingUnitId:
                  shippingUnit.id,
                orderId:
                  line.orderId,
                orderItemId:
                  line.orderItemId,
                productId:
                  line.productId,
                sourceHandlingUnitId:
                  sourceUnit.id,
                targetHandlingUnitId:
                  targetUnit.id,
                quantity:
                  allocatedQuantity,
                sourceQuantityAfter:
                  sourceQuantityAfter,
                targetQuantityAfter:
                  targetItem.quantity,
                operatorId:
                  input.actor.userId,
                operatorName:
                  input.actor.displayName,
                terminalCode:
                  input.actor
                    .terminalCode ??
                  null,
              },
            }),
          ]);

          affectedOrderIds.add(
            line.orderId,
          );

          remainingToAllocate -=
            allocatedQuantity;
        }

        const packedQuantity =
          distribution.packedQuantity +
          input.quantity;

        const distributionCompleted =
          packedQuantity >=
          distribution.plannedQuantity;

        await tx.waveDistribution.update({
          where: {
            id: distribution.id,
          },
          data: {
            packedQuantity: {
              increment:
                input.quantity,
            },
            status:
              distributionCompleted
                ? WaveDistributionStatus.COMPLETED
                : WaveDistributionStatus.IN_PROGRESS,
            startedAt:
              distribution.status ===
              WaveDistributionStatus.PLANNED
                ? new Date()
                : undefined,
            completedAt:
              distributionCompleted
                ? new Date()
                : null,
          },
        });

        for (
          const orderId of
          affectedOrderIds
        ) {
          await FulfillmentService.refreshOrderProgress(
            tx,
            {
              orderId,
              flowType:
                OrderFulfillmentFlow.WAVE,
              waveId:
                distribution.waveId,
            },
          );
        }

        const waveTotals =
          await tx.waveDistribution.aggregate({
            where: {
              waveId:
                distribution.waveId,
            },
            _sum: {
              plannedQuantity: true,
              packedQuantity: true,
            },
          });

        const wavePlanned =
          waveTotals._sum
            .plannedQuantity ?? 0;

        const wavePacked =
          waveTotals._sum
            .packedQuantity ?? 0;

        await tx.wave.update({
          where: {
            id:
              distribution.waveId,
          },
          data: {
            packingProgress:
              wavePlanned > 0
                ? Math.min(
                    100,
                    Math.round(
                      (
                        wavePacked /
                        wavePlanned
                      ) * 100,
                    ),
                  )
                : 0,
          },
        });

        const sourceRemaining =
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
            sourceRemaining._sum
              .quantity ?? 0
          ) <= 0
        ) {
          await tx.handlingUnit.update({
            where: {
              id: sourceUnit.id,
            },
            data: {
              status:
                HandlingUnitStatus.EMPTY,
            },
          });
        }

        await tx.wmsOperationLog.create({
          data: {
            operationType:
              WmsOperationType.PACKING,
            module:
              "RF_WAVE_PACKING",
            entityType:
              "WAVE_DISTRIBUTION",
            operatorId:
              input.actor.userId,
            operatorName:
              input.actor.displayName,
            terminalCode:
              input.actor
                .terminalCode ?? null,
            barcode:
              distribution.distributionCode,
            sourceBarcode:
              sourceUnit.barcode,
            targetBarcode:
              targetUnit.barcode,
            productId:
              availableLines[0]
                .productId,
            productCode:
              availableLines[0]
                .productCode,
            productName:
              availableLines[0]
                .productName,
            quantity:
              input.quantity,
            description:
              `${distribution.distributionCode} dağılımı için Toplama THM'den Sevk THM'ye paketleme yapıldı.`,
            metadata: {
              waveId:
                distribution.waveId,

              waveNo:
                distribution.wave.waveNo,

              distributionId:
                distribution.id,

              distributionCode:
                distribution.distributionCode,

              customerName:
                distribution.customerName,

              orderNumbers:
                Array.from(
                  new Set(
                    availableLines.map(
                      (line) =>
                        line.distributionOrder
                          .orderNumber
                    )
                  )
                ),

              shippingHandlingUnitId:
                shippingUnit.id,

              shippingHandlingUnitBarcode:
                targetUnit.barcode,

              packageSequence:
                shippingUnit.packageSequence,

              sourceQuantityAfter,

              targetQuantityAfter:
                targetItem.quantity,
            },
          },
        });

        return {
          distributionCode:
            distribution.distributionCode,
          waveNo:
            distribution.wave.waveNo,
          customerName:
            distribution.customerName,
          sourceBarcode:
            sourceUnit.barcode,
          sourceQuantityAfter,
          targetBarcode:
            targetUnit.barcode,
          targetQuantityAfter:
            targetItem.quantity,
          packageSequence:
            shippingUnit.packageSequence,
          productCode:
            availableLines[0]
              .productCode,
          productName:
            availableLines[0]
              .productName,
          packedQuantity:
            input.quantity,
          distributionPackedQuantity:
            packedQuantity,
          distributionPlannedQuantity:
            distribution.plannedQuantity,
          distributionCompleted,
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

  static async closeShippingUnit(
    targetBarcodeValue: string,
    actor: Actor,
    boxCodeValue: string,
  ) {
    const targetBarcode =
      normalize(
        targetBarcodeValue,
      );

    if (!targetBarcode) {
      throw new Error(
        "Kapatılacak Sevk THM barkodu bulunamadı.",
      );
    }
    const boxCode=normalize(boxCodeValue);
    if(!boxCode) throw new Error("Desi barkodunu okutun.");

    return prisma.$transaction(
      async (tx) => {
        const targetUnit =
          await tx.handlingUnit.findUnique({
            where: {
              barcode:
                targetBarcode,
            },
            select: {
              id: true,
              barcode: true,
              purpose: true,
              warehouseId: true,
              items: {
                select: {
                  quantity: true,
                },
              },
              shippingProfile: {
                select: {
                  id: true,
                  status: true,
                  packageSequence:
                    true,
                  customerName: true,
                  waveDistribution: {
                    select: {
                      distributionCode:
                        true,
                      wave: {
                        select: {
                          warehouseId: true,
                        },
                      },
                    },
                  },
                  packingRecords: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    select: {
                      sourceHandlingUnit: {
                        select: {
                          warehouseId: true,
                        },
                      },
                    },
                  },
                  orders: {
                    select: {
                      order: {
                        select: {
                          fulfillmentWarehouseId: true,
                          zonePickTasks: {
                            select: {
                              warehouseId: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          });

        if (
          !targetUnit ||
          targetUnit.purpose !==
            HandlingUnitPurpose.SHIPPING ||
          !targetUnit.shippingProfile
        ) {
          throw new Error(
            `${targetBarcode} geçerli bir Sevk THM değildir.`,
          );
        }

        if (
          targetUnit.shippingProfile
            .status !==
          ShippingHandlingUnitStatus.OPEN
        ) {
          throw new Error(
            `${targetBarcode} Sevk THM zaten kapalıdır.`,
          );
        }

        const packingWarehouseIds =
          targetUnit.shippingProfile.packingRecords
            .map(
              (record) =>
                record.sourceHandlingUnit.warehouseId,
            )
            .filter(
              (warehouseId): warehouseId is number =>
                warehouseId !== null,
            );

        const distinctPackingWarehouseIds =
          Array.from(
            new Set(packingWarehouseIds),
          );

        if (
          distinctPackingWarehouseIds.length > 1
        ) {
          throw new Error(
            "Sevk THM birden fazla kaynak depodan paketlenmiş görünüyor. Depo otomatik belirlenemedi.",
          );
        }

        const orderWarehouseIds =
          targetUnit.shippingProfile.orders.flatMap(
            ({ order }) => [
              order.fulfillmentWarehouseId,
              ...order.zonePickTasks.map(
                (task) => task.warehouseId,
              ),
            ],
          ).filter(
            (warehouseId): warehouseId is number =>
              warehouseId !== null,
          );

        const distinctOrderWarehouseIds =
          Array.from(
            new Set(orderWarehouseIds),
          );

        if (
          distinctOrderWarehouseIds.length > 1
        ) {
          throw new Error(
            "Sevk THM sipariş/toplama kayıtlarında birden fazla depo görünüyor. Depo otomatik belirlenemedi.",
          );
        }

        const resolvedWarehouseId =
          targetUnit.warehouseId ??
          targetUnit.shippingProfile.waveDistribution?.wave.warehouseId ??
          distinctPackingWarehouseIds[0] ??
          distinctOrderWarehouseIds[0];

        if (!resolvedWarehouseId) {
          throw new Error(
            "Sevk THM depo bilgisi THM, Wave, paketleme kaynağı, sipariş ve toplama görevi kayıtlarından çözülemedi.",
          );
        }

        if (!targetUnit.warehouseId) {
          await tx.handlingUnit.update({
            where: { id: targetUnit.id },
            data: { warehouseId: resolvedWarehouseId },
          });
        }

        const boxDefinition=await tx.shippingBoxDefinition.findFirst({
          where:{tenantId:"tenant_etken",companyId:"company_etken_office",code:boxCode,isActive:true,warehouses:{some:{warehouseId:resolvedWarehouseId}}},
          select:{id:true,code:true,boxType:true,dimensions:true,desi:true},
        });
        if(!boxDefinition) throw new Error(`${boxCode} koli/desi tanımı bu depo için bulunamadı veya pasif.`);

        const totalQuantity =
          targetUnit.items.reduce(
            (total, item) =>
              total + item.quantity,
            0,
          );

        if (totalQuantity <= 0) {
          throw new Error(
            "Boş Sevk THM kapatılamaz.",
          );
        }

        const now = new Date();

        await Promise.all([
          tx.shippingHandlingUnit.update({
            where: {
              id:
                targetUnit
                  .shippingProfile.id,
            },
            data: {
              status:
                ShippingHandlingUnitStatus.READY_TO_SHIP,
              closedAt: now,
              readyAt: now,
              closedById:
                actor.userId,
              closedByName:
                actor.displayName,
              boxDefinitionId: boxDefinition.id,
              boxCode: boxDefinition.code,
              boxType: boxDefinition.boxType,
              boxDimensions: boxDefinition.dimensions,
              desi: boxDefinition.desi,
            },
          }),
          tx.handlingUnit.update({
            where: {
              id: targetUnit.id,
            },
            data: {
              status:
                HandlingUnitStatus.CLOSED,
            },
          }),
          tx.wmsOperationLog.create({
            data: {
              operationType:
                WmsOperationType.PACKING,
              module:
                "RF_WAVE_PACKING",
              entityType:
                "SHIPPING_HANDLING_UNIT",
              entityId:
                targetUnit.id,
              operatorId:
                actor.userId,
              operatorName:
                actor.displayName,
              terminalCode:
                actor.terminalCode ??
                null,
              barcode:
                targetUnit.barcode,
              quantity:
                totalQuantity,
              previousStatus:
                ShippingHandlingUnitStatus.OPEN,
              newStatus:
                ShippingHandlingUnitStatus.READY_TO_SHIP,
              description:
                `${targetUnit.barcode} Sevk THM kapatıldı ve sevke hazırlandı. Koli: ${boxDefinition.code}, Tip: ${boxDefinition.boxType}, Desi: ${boxDefinition.desi}.`,
              metadata:{boxCode:boxDefinition.code,boxType:boxDefinition.boxType,boxDimensions:boxDefinition.dimensions,desi:boxDefinition.desi},
            },
          }),
        ]);

        return {
          targetBarcode:
            targetUnit.barcode,
          distributionCode:
            targetUnit
              .shippingProfile
              .waveDistribution
              ?.distributionCode ??
            "",
          customerName:
            targetUnit
              .shippingProfile
              .customerName,
          packageSequence:
            targetUnit
              .shippingProfile
              .packageSequence,
          totalQuantity,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }
}
