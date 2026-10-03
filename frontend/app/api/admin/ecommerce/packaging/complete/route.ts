import {
  FulfillmentProgressStatus,
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderStatus,
  OrderType,
  Prisma,
  ShippingHandlingUnitStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalize(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function createAutomaticShippingThm(orderId: number) {
  // "ETS" namespace'i fiziksel/manuel THM'lerden ayrıdır.
  // orderId veritabanında benzersiz olduğu için aynı sipariş için deterministiktir;
  // HandlingUnit.barcode UNIQUE constraint'i de global çakışmayı son savunma olarak engeller.
  return `ETS-${String(orderId).padStart(10, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = Number(body?.orderId);
    const requestedShippingThm = normalize(body?.shippingHandlingUnitBarcode);
    const boxCode = normalize(body?.boxCode);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, message: "Geçerli sipariş bulunamadı." }, { status: 400 });
    }
    if (!boxCode) {
      return NextResponse.json({ success: false, message: "Desi/koli barkodunu okutun." }, { status: 400 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            status: true,
            customerId: true,
            shippingAddressId: true,
            fulfillmentWarehouseId: true,
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
            shippingAddress: true,
            fulfillment: true,
            items: {
              orderBy: { id: "asc" },
              select: {
                id: true,
                productId: true,
                productCode: true,
                productName: true,
                quantity: true,
                pickedQuantity: true,
                packedQuantity: true,
                product: { select: { barcode: true } },
              },
            },
          },
        });

        if (!order || order.orderType !== OrderType.ECOMMERCE) {
          throw new Error("E-Ticaret siparişi bulunamadı.");
        }

        const orderedQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalQuantity = order.items.reduce((sum, item) => sum + item.pickedQuantity, 0);
        const shortageRows = await tx.pickingShortage.groupBy({
          by: ["orderItemId"],
          where: { orderId: order.id },
          _sum: { quantity: true },
        });
        const shortageByItem = new Map(shortageRows.map((row) => [row.orderItemId, row._sum.quantity ?? 0]));
        const pickingClosed = order.items.every(
          (item) => item.pickedQuantity + (shortageByItem.get(item.id) ?? 0) >= item.quantity,
        );
        if (!pickingClosed) throw new Error("Siparişin toplaması veya eksik toplama kapatma işlemi tamamlanmadan paketleme bitirilemez.");
        if (totalQuantity <= 0) throw new Error("Siparişte paketlenecek toplanmış ürün yok.");
        const singleOrder = order.items.length === 1 && orderedQuantity === 1 && totalQuantity === 1;

        let shippingUnit = requestedShippingThm
          ? await tx.shippingHandlingUnit.findFirst({
              where: { handlingUnit: { barcode: requestedShippingThm } },
              include: { handlingUnit: true },
            })
          : null;

        if (!shippingUnit) {
          if (!singleOrder) throw new Error("Bu sipariş için Sevk THM bulunamadı.");

          const barcode = createAutomaticShippingThm(order.id);
          const existing = await tx.handlingUnit.findUnique({
            where: { barcode },
            include: { shippingProfile: true },
          });

          if (existing && existing.assignedOrderId !== order.id) {
            throw new Error(`${barcode} başka bir kayıtta kullanılıyor. Sevk THM çakışması engellendi.`);
          }

          const address = order.shippingAddress;
          const hu = existing ?? await tx.handlingUnit.create({
            data: {
              barcode,
              unitType: "BOX",
              purpose: HandlingUnitPurpose.SHIPPING,
              status: HandlingUnitStatus.OPEN,
              warehouseId: order.fulfillmentWarehouseId,
              assignedOrderId: order.id,
              description: `E-Ticaret tekli sipariş otomatik Sevk THM - ${order.orderNumber}`,
            },
          });

          const profile = existing?.shippingProfile ?? await tx.shippingHandlingUnit.create({
            data: {
              handlingUnitId: hu.id,
              status: ShippingHandlingUnitStatus.OPEN,
              customerId: order.customerId,
              shippingAddressId: order.shippingAddressId,
              customerCode: order.customer.customerCode,
              customerName: order.customer.companyName,
              taxOffice: order.customer.taxOffice,
              taxNumber: order.customer.taxNumber,
              addressTitle: address?.title ?? null,
              contactName: address?.contactName ?? order.customer.contactName,
              phone: address?.phone ?? order.customer.phone,
              address: address?.address ?? order.customer.address ?? "-",
              city: address?.city ?? order.customer.city ?? "-",
              district: address?.district ?? order.customer.district ?? "-",
              postalCode: address?.postalCode ?? null,
              notes: "E-Ticaret tekli sipariş için sistem tarafından otomatik oluşturuldu.",
            },
          });

          shippingUnit = { ...profile, handlingUnit: hu } as any;
        }

        if (!shippingUnit) {
          throw new Error("Sevk THM oluşturulamadı veya bulunamadı.");
        }

        if (shippingUnit.handlingUnit.assignedOrderId && shippingUnit.handlingUnit.assignedOrderId !== order.id) {
          throw new Error("Sevk THM başka bir siparişe atanmış.");
        }

        const box = await tx.shippingBoxDefinition.findFirst({
          where: {
            tenantId: "tenant_etken",
            companyId: "company_etken_office",
            code: boxCode,
            isActive: true,
            ...(order.fulfillmentWarehouseId
              ? { warehouses: { some: { warehouseId: order.fulfillmentWarehouseId } } }
              : {}),
          },
          select: { id: true, code: true, boxType: true, dimensions: true, desi: true },
        });
        if (!box) throw new Error(`${boxCode} koli/desi tanımı bulunamadı veya pasif.`);

        const shippingOrder = await tx.shippingHandlingUnitOrder.upsert({
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
            plannedQuantity: totalQuantity,
            packedQuantity: totalQuantity,
          },
          update: { plannedQuantity: totalQuantity, packedQuantity: totalQuantity },
        });

        for (const item of order.items) {
          await tx.shippingHandlingUnitItem.upsert({
            where: {
              shipping_handling_unit_item_unique: {
                shippingHandlingUnitId: shippingUnit.id,
                orderItemId: item.id,
              },
            },
            create: {
              shippingHandlingUnitId: shippingUnit.id,
              shippingHandlingUnitOrderId: shippingOrder.id,
              orderId: order.id,
              orderItemId: item.id,
              productId: item.productId,
              productCode: item.productCode,
              productBarcode: item.product.barcode,
              productName: item.productName,
              quantity: item.pickedQuantity,
            },
            update: { quantity: item.pickedQuantity },
          });
          await tx.orderItem.update({
            where: { id: item.id },
            data: { packedQuantity: item.pickedQuantity },
          });
          await tx.handlingUnitItem.upsert({
            where: { handling_unit_product_unique: { handlingUnitId: shippingUnit.handlingUnit.id, productId: item.productId } },
            create: { handlingUnitId: shippingUnit.handlingUnit.id, productId: item.productId, quantity: item.pickedQuantity },
            update: { quantity: item.pickedQuantity },
          });
        }

        const now = new Date();
        await tx.shippingHandlingUnit.update({
          where: { id: shippingUnit.id },
          data: {
            status: ShippingHandlingUnitStatus.READY_TO_SHIP,
            closedAt: now,
            readyAt: now,
            boxDefinitionId: box.id,
            boxCode: box.code,
            boxType: box.boxType,
            boxDimensions: box.dimensions,
            desi: box.desi,
          },
        });
        await tx.handlingUnit.update({
          where: { id: shippingUnit.handlingUnit.id },
          data: { status: HandlingUnitStatus.CLOSED, purpose: HandlingUnitPurpose.SHIPPING, assignedOrderId: order.id },
        });
        // Paketleme tamamlanması siparişi tek başına sevke hazır yapmaz.
        // READY_TO_SHIP geçişi irsaliyenin ISSUED olduğu dispatch endpointinde yapılır.
        if (order.fulfillment) {
          await tx.orderFulfillment.update({
            where: { orderId: order.id },
            data: {
              packingStatus: FulfillmentProgressStatus.COMPLETED,
              packedQuantity: totalQuantity,
              packingCompletedAt: now,
            },
          });
        }

        return {
          orderNumber: order.orderNumber,
          shippingHandlingUnitBarcode: shippingUnit.handlingUnit.barcode,
          totalQuantity,
          boxCode: box.code,
          desi: box.desi,
          status: order.status,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      },
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Paketleme tamamlanamadı." },
      { status: 409 },
    );
  }
}
