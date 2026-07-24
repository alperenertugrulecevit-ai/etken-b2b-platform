import {
  FulfillmentProgressStatus,
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderFulfillmentFlow,
  OrderStatus,
  Prisma,
  ShippingHandlingUnitStatus,
  WaveStatus,
} from "@prisma/client";

import type {
  DirectShippingItemInput,
  DirectShippingUnitInput,
  ResolvedPickingFlow,
  WavePickingUnitInput,
} from "../types/fulfillment.types";

type TransactionClient = Prisma.TransactionClient;

const OPEN_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.READY,
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
  WaveStatus.PAUSED,
];

const PICKABLE_WAVE_STATUSES: WaveStatus[] = [
  WaveStatus.RELEASED,
  WaveStatus.IN_PROGRESS,
];

const TARGET_UNIT_STATUSES: HandlingUnitStatus[] = [
  HandlingUnitStatus.OPEN,
  HandlingUnitStatus.EMPTY,
  HandlingUnitStatus.STORED,
];

function normalizeBarcode(value: string) {
  return value.trim().toUpperCase();
}

function getProgressStatus(completedQuantity: number, plannedQuantity: number) {
  if (plannedQuantity > 0 && completedQuantity >= plannedQuantity) {
    return FulfillmentProgressStatus.COMPLETED;
  }

  if (completedQuantity > 0) {
    return FulfillmentProgressStatus.IN_PROGRESS;
  }

  return FulfillmentProgressStatus.NOT_STARTED;
}

function getRequiredAddress(order: {
  shippingAddress: {
    title: string;
    contactName: string | null;
    phone: string | null;
    address: string;
    city: string;
    district: string;
    postalCode: string | null;
  } | null;
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
}) {
  const address =
    order.shippingAddress?.address.trim() ||
    order.customer.address?.trim() ||
    "";

  const city =
    order.shippingAddress?.city.trim() || order.customer.city?.trim() || "";

  const district =
    order.shippingAddress?.district.trim() ||
    order.customer.district?.trim() ||
    "";

  if (!address || !city || !district) {
    throw new Error(
      "Siparişin sevk adresi, şehir veya ilçe bilgisi eksik. Sevk THM oluşturulmadan önce teslimat adresini tamamlayın.",
    );
  }

  return {
    customerCode: order.customer.customerCode,
    customerName: order.customer.companyName,
    taxOffice: order.customer.taxOffice,
    taxNumber: order.customer.taxNumber,
    addressTitle: order.shippingAddress?.title ?? null,
    contactName:
      order.shippingAddress?.contactName ?? order.customer.contactName,
    phone: order.shippingAddress?.phone ?? order.customer.phone,
    address,
    city,
    district,
    postalCode: order.shippingAddress?.postalCode ?? null,
  };
}

export class FulfillmentService {
  static async resolvePickingFlow(
    tx: TransactionClient,
    orderId: number,
  ): Promise<ResolvedPickingFlow> {
    const activeWaveOrder = await tx.waveOrder.findFirst({
      where: {
        orderId,
        isCompleted: false,
        wave: {
          status: {
            in: OPEN_WAVE_STATUSES,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        waveId: true,
        wave: {
          select: {
            waveNo: true,
          },
        },
      },
    });

    if (activeWaveOrder) {
      return {
        flowType: OrderFulfillmentFlow.WAVE,
        waveId: activeWaveOrder.waveId,
        waveNo: activeWaveOrder.wave.waveNo,
      };
    }

    return {
      flowType: OrderFulfillmentFlow.DIRECT_ORDER,
      waveId: null,
      waveNo: null,
    };
  }

  static async ensureOrderFulfillment(
    tx: TransactionClient,
    input: {
      orderId: number;
      flowType: OrderFulfillmentFlow;
      waveId: string | null;
    },
  ) {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }

    const plannedQuantity = order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    const existing = await tx.orderFulfillment.findUnique({
      where: {
        orderId: order.id,
      },
    });

    if (
      existing &&
      (existing.pickedQuantity > 0 ||
        existing.packedQuantity > 0 ||
        existing.shippedQuantity > 0) &&
      (existing.flowType !== input.flowType || existing.waveId !== input.waveId)
    ) {
      throw new Error(
        `${order.orderNumber} siparişinin gerçekleştirme akışı başladıktan sonra doğrudan sipariş/Wave tipi değiştirilemez.`,
      );
    }

    return tx.orderFulfillment.upsert({
      where: {
        orderId: order.id,
      },
      create: {
        orderId: order.id,
        flowType: input.flowType,
        waveId: input.waveId,
        plannedQuantity,
      },
      update: {
        flowType: input.flowType,
        waveId: input.waveId,
        plannedQuantity,
      },
    });
  }

  static async prepareWavePickingUnit(
    tx: TransactionClient,
    input: WavePickingUnitInput,
  ) {
    const targetBarcode = normalizeBarcode(input.targetBarcode);

    const [wave, targetUnit] = await Promise.all([
      tx.wave.findUnique({
        where: {
          id: input.waveId,
        },
        select: {
          id: true,
          waveNo: true,
          status: true,
        },
      }),
      tx.handlingUnit.findUnique({
        where: {
          barcode: targetBarcode,
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
        },
      }),
    ]);

    if (!wave) {
      throw new Error("Wave kaydı bulunamadı.");
    }

    if (!PICKABLE_WAVE_STATUSES.includes(wave.status)) {
      throw new Error(`${wave.waveNo} Wave'i toplama işlemine açık değildir.`);
    }

    if (!targetUnit) {
      throw new Error(
        `${targetBarcode} barkodlu hedef Toplama THM bulunamadı.`,
      );
    }

    if (targetUnit.purpose !== HandlingUnitPurpose.PICKING) {
      throw new Error(`${targetUnit.barcode} bir Toplama THM değildir.`);
    }

    if (!TARGET_UNIT_STATUSES.includes(targetUnit.status)) {
      throw new Error(
        `${targetUnit.barcode} ürün kabul etmeye uygun durumda değildir.`,
      );
    }

    if (targetUnit.parentUnitId !== null) {
      throw new Error(`${targetUnit.barcode} başka bir THM'ye bağlıdır.`);
    }

    if (targetUnit.assignedOrderId !== null) {
      throw new Error(
        `${targetUnit.barcode} doğrudan bir siparişe atanmıştır ve Wave toplamasında kullanılamaz.`,
      );
    }

    if (
      targetUnit.assignedWaveId !== null &&
      targetUnit.assignedWaveId !== wave.id
    ) {
      throw new Error(`${targetUnit.barcode} başka bir Wave'e atanmıştır.`);
    }

    const currentQuantity = targetUnit.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    if (targetUnit.assignedWaveId === null && currentQuantity > 0) {
      throw new Error(
        `${targetUnit.barcode} içinde ürün bulunuyor ancak herhangi bir Wave'e atanmamış. Güvenlik nedeniyle kullanılamaz.`,
      );
    }

    return tx.handlingUnit.update({
      where: {
        id: targetUnit.id,
      },
      data: {
        assignedOrderId: null,
        assignedWaveId: wave.id,
        purpose: HandlingUnitPurpose.PICKING,
        status: HandlingUnitStatus.OPEN,
      },
      select: {
        id: true,
        barcode: true,
        assignedWaveId: true,
      },
    });
  }

  static async prepareDirectShippingUnit(
    tx: TransactionClient,
    input: DirectShippingUnitInput,
  ) {
    const targetBarcode = normalizeBarcode(input.targetBarcode);

    const [order, targetUnit] = await Promise.all([
      tx.order.findUnique({
        where: {
          id: input.orderId,
        },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          shippingAddressId: true,
          customer: {
            select: {
              customerCode: true,
              companyName: true,
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
        },
      }),
      tx.handlingUnit.findUnique({
        where: {
          barcode: targetBarcode,
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
              packageSequence: true,
              customerId: true,
              shippingAddressId: true,
              orders: {
                select: {
                  orderId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }

    if (!targetUnit) {
      throw new Error(`${targetBarcode} barkodlu Sevk THM bulunamadı.`);
    }

    if (targetUnit.purpose !== HandlingUnitPurpose.SHIPPING) {
      throw new Error(`${targetUnit.barcode} bir Sevk THM değildir.`);
    }

    if (!TARGET_UNIT_STATUSES.includes(targetUnit.status)) {
      throw new Error(
        `${targetUnit.barcode} ürün kabul etmeye uygun durumda değildir.`,
      );
    }

    if (targetUnit.parentUnitId !== null) {
      throw new Error(`${targetUnit.barcode} başka bir THM'ye bağlıdır.`);
    }

    if (targetUnit.assignedWaveId !== null) {
      throw new Error(
        `${targetUnit.barcode} bir Wave'e atanmıştır ve doğrudan sipariş toplamasında kullanılamaz.`,
      );
    }

    if (
      targetUnit.assignedOrderId !== null &&
      targetUnit.assignedOrderId !== order.id
    ) {
      throw new Error(`${targetUnit.barcode} başka bir siparişe atanmıştır.`);
    }

    const currentQuantity = targetUnit.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    if (!targetUnit.shippingProfile && currentQuantity > 0) {
      throw new Error(
        `${targetUnit.barcode} içinde ürün bulunuyor ancak Sevk THM kaydı yok. Güvenlik nedeniyle kullanılamaz.`,
      );
    }

    if (
      targetUnit.shippingProfile &&
      targetUnit.shippingProfile.status !== ShippingHandlingUnitStatus.OPEN
    ) {
      throw new Error(
        `${targetUnit.barcode} Sevk THM kapatılmış veya sevk edilmiştir.`,
      );
    }

    if (
      targetUnit.shippingProfile &&
      (targetUnit.shippingProfile.customerId !== order.customerId ||
        targetUnit.shippingProfile.shippingAddressId !==
          order.shippingAddressId)
    ) {
      throw new Error(
        `${targetUnit.barcode} farklı bir alıcı veya teslimat adresine aittir.`,
      );
    }

    const hasDifferentOrder =
      targetUnit.shippingProfile?.orders.some(
        (item) => item.orderId !== order.id,
      ) ?? false;

    if (hasDifferentOrder) {
      throw new Error(
        `${targetUnit.barcode} başka bir doğrudan siparişe aittir.`,
      );
    }

    const addressSnapshot = getRequiredAddress(order);

    const existingPackageCount = await tx.shippingHandlingUnit.count({
      where: {
        orders: {
          some: {
            orderId: order.id,
          },
        },
      },
    });

    const shippingUnit =
      targetUnit.shippingProfile ??
      (await tx.shippingHandlingUnit.create({
        data: {
          handlingUnitId: targetUnit.id,
          status: ShippingHandlingUnitStatus.OPEN,
          packageSequence: existingPackageCount + 1,
          customerId: order.customerId,
          shippingAddressId: order.shippingAddressId,
          ...addressSnapshot,
          createdById: input.actor.userId,
          createdByName: input.actor.displayName,
          orders: {
            create: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          },
        },
      }));

    if (targetUnit.shippingProfile) {
      await tx.shippingHandlingUnitOrder.upsert({
        where: {
          shipping_handling_unit_order_unique: {
            shippingHandlingUnitId: shippingUnit.id,
            orderId: order.id,
          },
        },
        create: {
          shippingHandlingUnitId: shippingUnit.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        update: {},
      });
    }

    await tx.handlingUnit.update({
      where: {
        id: targetUnit.id,
      },
      data: {
        assignedOrderId: order.id,
        assignedWaveId: null,
        purpose: HandlingUnitPurpose.SHIPPING,
        status: HandlingUnitStatus.OPEN,
      },
    });

    return {
      id: shippingUnit.id,
      handlingUnitId: targetUnit.id,
      barcode: targetUnit.barcode,
      packageSequence: shippingUnit.packageSequence,
    };
  }

  static async recordDirectShippingItem(
    tx: TransactionClient,
    input: DirectShippingItemInput,
  ) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error(
        "Sevk THM ürün miktarı sıfırdan büyük bir tam sayı olmalıdır.",
      );
    }

    const [shippingOrder, orderItem] = await Promise.all([
      tx.shippingHandlingUnitOrder.findUnique({
        where: {
          shipping_handling_unit_order_unique: {
            shippingHandlingUnitId: input.shippingHandlingUnitId,
            orderId: input.orderId,
          },
        },
        select: {
          id: true,
        },
      }),
      tx.orderItem.findFirst({
        where: {
          id: input.orderItemId,
          orderId: input.orderId,
          productId: input.productId,
        },
        select: {
          productCode: true,
          productName: true,
          product: {
            select: {
              barcode: true,
            },
          },
        },
      }),
    ]);

    if (!shippingOrder) {
      throw new Error("Sevk THM ile sipariş bağlantısı bulunamadı.");
    }

    if (!orderItem) {
      throw new Error("Sipariş ürünü bulunamadı.");
    }

    const shippingItem = await tx.shippingHandlingUnitItem.upsert({
      where: {
        shipping_handling_unit_item_unique: {
          shippingHandlingUnitId: input.shippingHandlingUnitId,
          orderItemId: input.orderItemId,
        },
      },
      create: {
        shippingHandlingUnitId: input.shippingHandlingUnitId,
        shippingHandlingUnitOrderId: shippingOrder.id,
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        productId: input.productId,
        productCode: orderItem.productCode,
        productBarcode: orderItem.product.barcode,
        productName: orderItem.productName,
        quantity: input.quantity,
      },
      update: {
        quantity: {
          increment: input.quantity,
        },
      },
    });

    await Promise.all([
      tx.shippingHandlingUnitOrder.update({
        where: {
          id: shippingOrder.id,
        },
        data: {
          plannedQuantity: {
            increment: input.quantity,
          },
          packedQuantity: {
            increment: input.quantity,
          },
        },
      }),
      tx.orderItem.update({
        where: {
          id: input.orderItemId,
        },
        data: {
          packedQuantity: {
            increment: input.quantity,
          },
        },
      }),
    ]);

    return shippingItem;
  }

  static async refreshOrderProgress(
    tx: TransactionClient,
    input: {
      orderId: number;
      flowType: OrderFulfillmentFlow;
      waveId: string | null;
    },
  ) {
    const fulfillment = await this.ensureOrderFulfillment(tx, input);

    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        status: true,
        items: {
          select: {
            quantity: true,
            pickedQuantity: true,
            packedQuantity: true,
            shippedQuantity: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }

    const totals = order.items.reduce(
      (result, item) => ({
        planned: result.planned + item.quantity,
        picked: result.picked + Math.min(item.pickedQuantity, item.quantity),
        packed: result.packed + Math.min(item.packedQuantity, item.quantity),
        shipped: result.shipped + Math.min(item.shippedQuantity, item.quantity),
      }),
      {
        planned: 0,
        picked: 0,
        packed: 0,
        shipped: 0,
      },
    );

    const now = new Date();

    const pickingStatus = getProgressStatus(totals.picked, totals.planned);

    const packingStatus = getProgressStatus(totals.packed, totals.planned);

    const shippingStatus = getProgressStatus(totals.shipped, totals.planned);

    await tx.orderFulfillment.update({
      where: {
        id: fulfillment.id,
      },
      data: {
        plannedQuantity: totals.planned,
        pickedQuantity: totals.picked,
        packedQuantity: totals.packed,
        shippedQuantity: totals.shipped,
        pickingStatus,
        packingStatus,
        shippingStatus,
        pickingStartedAt:
          totals.picked > 0
            ? (fulfillment.pickingStartedAt ?? now)
            : fulfillment.pickingStartedAt,
        pickingCompletedAt:
          pickingStatus === FulfillmentProgressStatus.COMPLETED
            ? (fulfillment.pickingCompletedAt ?? now)
            : null,
        packingStartedAt:
          totals.packed > 0
            ? (fulfillment.packingStartedAt ?? now)
            : fulfillment.packingStartedAt,
        packingCompletedAt:
          packingStatus === FulfillmentProgressStatus.COMPLETED
            ? (fulfillment.packingCompletedAt ?? now)
            : null,
        shippingStartedAt:
          totals.shipped > 0
            ? (fulfillment.shippingStartedAt ?? now)
            : fulfillment.shippingStartedAt,
        shippingCompletedAt:
          shippingStatus === FulfillmentProgressStatus.COMPLETED
            ? (fulfillment.shippingCompletedAt ?? now)
            : null,
      },
    });

    if (
      order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      let nextStatus = order.status;

      if (totals.shipped >= totals.planned && totals.planned > 0) {
        nextStatus = OrderStatus.SHIPPED;
      } else if (totals.packed >= totals.planned && totals.planned > 0) {
        nextStatus = OrderStatus.READY_TO_SHIP;
      } else if (
        input.flowType === OrderFulfillmentFlow.WAVE &&
        totals.picked >= totals.planned &&
        totals.planned > 0
      ) {
        nextStatus = OrderStatus.PACKING;
      } else if (totals.picked > 0) {
        nextStatus = OrderStatus.PICKING;
      }

      await tx.order.update({
        where: {
          id: input.orderId,
        },
        data: {
          status: nextStatus,
          stockDeducted: totals.planned > 0 && totals.shipped >= totals.planned,
          ...(totals.planned > 0 && totals.shipped >= totals.planned
            ? {
                stockDeductedAt: now,
              }
            : {}),
        },
      });
    }

    return {
      ...totals,
      pickingStatus,
      packingStatus,
      shippingStatus,
    };
  }
}
