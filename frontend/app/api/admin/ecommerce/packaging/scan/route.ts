import { OrderStatus, OrderType, ShippingHandlingUnitStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PACKING,
  OrderStatus.READY_TO_SHIP,
];

function normalize(value: string) {
  return value.trim().toUpperCase();
}

function orderPayload(order: any, shippingHandlingUnitBarcode: string | null, mode: "THM" | "FIFO_SINGLE") {
  const address = order.shippingAddress;
  const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.pickedQuantity, 0);
  const orderedQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return {
    mode,
    shippingHandlingUnitBarcode,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      placedBy: order.placedByUsername || order.customer.companyName,
      recipientName: address?.contactName || order.customer.contactName || order.customer.companyName,
      recipientAddress: address
        ? [address.address, address.district, address.city].filter(Boolean).join(" / ")
        : [order.customer.address, order.customer.district, order.customer.city].filter(Boolean).join(" / "),
      phone: address?.phone || order.customer.phone || "",
      totalQuantity,
      orderedQuantity,
      carrier: order.carrier ? `${order.carrier.code} - ${order.carrier.name}` : "-",
      gift: Boolean(order.customerNote?.trim()),
      giftNote: order.customerNote?.trim() || "",
      status: order.status,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        code: item.productCode,
        barcode: item.product.barcode,
        name: item.productName,
        ordered: item.quantity,
        packable: item.pickedQuantity,
        shortage: Math.max(0, item.quantity - item.pickedQuantity),
        alreadyPacked: item.packedQuantity,
        imageUrl: item.product.imageUrl,
      })),
    },
  };
}

const orderSelect = {
  id: true,
  orderNumber: true,
  orderDate: true,
  placedByUsername: true,
  status: true,
  cancellationStatus: true,
  customerNote: true,
  carrier: { select: { code: true, name: true } },
  customer: {
    select: {
      companyName: true,
      contactName: true,
      phone: true,
      address: true,
      city: true,
      district: true,
    },
  },
  shippingAddress: {
    select: {
      contactName: true,
      phone: true,
      address: true,
      city: true,
      district: true,
    },
  },
  fulfillment: {
    select: {
      pickingStatus: true,
      packingStatus: true,
    },
  },
  items: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      productId: true,
      productCode: true,
      productName: true,
      quantity: true,
      pickedQuantity: true,
      packedQuantity: true,
      product: {
        select: {
          barcode: true,
          imageUrl: true,
        },
      },
    },
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const barcode = normalize(String(body?.barcode ?? ""));

    if (!barcode) {
      return NextResponse.json({ success: false, message: "Barkod okutun." }, { status: 400 });
    }

    // 1) Önce Sevk THM olarak dene. Dağılımı tamamlanmış e-ticaret siparişi buradan açılır.
    const shippingUnit = await prisma.shippingHandlingUnit.findFirst({
      where: {
        handlingUnit: { barcode },
        status: {
          in: [
            ShippingHandlingUnitStatus.OPEN,
            ShippingHandlingUnitStatus.CLOSED,
            ShippingHandlingUnitStatus.READY_TO_SHIP,
          ],
        },
        orders: {
          some: {
            order: { orderType: OrderType.ECOMMERCE },
          },
        },
      },
      select: {
        handlingUnit: { select: { barcode: true } },
        orders: {
          where: { order: { orderType: OrderType.ECOMMERCE } },
          orderBy: { order: { orderDate: "asc" } },
          select: { order: { select: orderSelect } },
        },
      },
    });

    if (shippingUnit) {
      const orders = shippingUnit.orders.map((row) => row.order);
      const blockedOrder = orders.find((order) => Boolean(order.cancellationStatus));
      if (blockedOrder) {
        return NextResponse.json({ success: false, message: `${blockedOrder.orderNumber} siparişi iptal sürecinde. Paketleme yapılamaz.` }, { status: 409 });
      }

      if (orders.length !== 1) {
        return NextResponse.json(
          {
            success: false,
            message: `${barcode} Sevk THM içinde ${orders.length} e-ticaret siparişi var. E-Ticaret Paketleme ekranında bir Sevk THM yalnızca bir sipariş içermelidir.`,
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        ...orderPayload(orders[0], shippingUnit.handlingUnit.barcode, "THM"),
      });
    }

    // 2) THM değilse ürün barkodu olarak dene. Sadece tek kalem / tek adet,
    // toplaması tamamlanmış e-ticaret siparişlerinde FIFO uygulanır.
    const candidates = await prisma.order.findMany({
      where: {
        orderType: OrderType.ECOMMERCE,
        cancellationStatus: null,
        status: { in: ELIGIBLE_ORDER_STATUSES },
        items: {
          some: {
            product: { barcode },
            quantity: 1,
            pickedQuantity: { gte: 1 },
          },
        },
      },
      orderBy: [{ orderDate: "asc" }, { id: "asc" }],
      take: 50,
      select: orderSelect,
    });

    const fifoOrder = candidates.find(
      (order) =>
        order.items.length === 1 &&
        order.items[0].quantity === 1 &&
        order.items[0].pickedQuantity >= 1 &&
        order.items[0].product.barcode === barcode,
    );

    if (!fifoOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `${barcode} için paketlemeye hazır Sevk THM veya tek kalem/tek adet FIFO e-ticaret siparişi bulunamadı.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      ...orderPayload(fifoOrder, null, "FIFO_SINGLE"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Barkod işlenemedi.",
      },
      { status: 500 },
    );
  }
}
