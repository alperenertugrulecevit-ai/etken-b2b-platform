import { DispatchDocumentStatus, OrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function nextDispatchNumber(id: string, date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `IRS-${y}${m}${d}-${id.slice(-8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const barcode = String(body?.shippingHandlingUnitBarcode ?? "").trim().toUpperCase();
    if (!barcode) return NextResponse.json({ success: false, message: "Sevk THM bulunamadı." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const unit = await tx.shippingHandlingUnit.findFirst({
        where: { handlingUnit: { barcode } },
        select: {
          id: true,
          status: true,
          customerCode: true,
          customerName: true,
          taxOffice: true,
          taxNumber: true,
          contactName: true,
          address: true,
          city: true,
          district: true,
          postalCode: true,
          dispatchDocument: { select: { id: true, status: true, dispatchNumber: true } },
          orders: {
            select: {
              orderId: true,
              orderNumber: true,
              order: { select: { customerNote: true } },
            },
          },
          items: {
            where: { quantity: { gt: 0 } },
            select: {
              id: true,
              orderId: true,
              orderItemId: true,
              productId: true,
              productCode: true,
              productBarcode: true,
              productName: true,
              quantity: true,
            },
          },
        },
      });
      if (!unit) throw new Error(`${barcode} Sevk THM bulunamadı.`);
      if (!["READY_TO_SHIP", "SHIPPED"].includes(unit.status)) throw new Error("Sevk THM irsaliye oluşturmaya hazır değil.");

      const now = new Date();
      let document = unit.dispatchDocument;

      if (!document) {
        const created = await tx.dispatchDocument.create({
          data: {
            shippingHandlingUnitId: unit.id,
            status: DispatchDocumentStatus.DRAFT,
            recipientCode: unit.customerCode,
            recipientName: unit.contactName || unit.customerName,
            recipientTaxOffice: unit.taxOffice,
            recipientTaxNumber: unit.taxNumber,
            recipientAddress: unit.address,
            recipientCity: unit.city,
            recipientDistrict: unit.district,
            recipientPostalCode: unit.postalCode,
            documentDate: now,
            lines: {
              create: unit.items.map((item) => ({
                shippingHandlingUnitItemId: item.id,
                orderId: item.orderId,
                orderItemId: item.orderItemId,
                productId: item.productId,
                orderNumber: unit.orders.find((o) => o.orderId === item.orderId)?.orderNumber ?? "-",
                productCode: item.productCode,
                productBarcode: item.productBarcode,
                productName: item.productName,
                quantity: item.quantity,
              })),
            },
          },
          select: { id: true, status: true, dispatchNumber: true },
        });
        document = created;
      }

      const dispatchNumber = document.dispatchNumber ?? nextDispatchNumber(document.id, now);
      if (document.status !== DispatchDocumentStatus.ISSUED) {
        document = await tx.dispatchDocument.update({
          where: { id: document.id },
          data: {
            status: DispatchDocumentStatus.ISSUED,
            dispatchNumber,
            documentDate: now,
            issuedAt: now,
          },
          select: { id: true, status: true, dispatchNumber: true },
        });
      }

      await tx.order.updateMany({
        where: { id: { in: unit.orders.map((row) => row.orderId) } },
        // Mevcut enum'da "İrsaliye Kesildi" ayrı bir OrderStatus değildir.
        // READY_TO_SHIP + ISSUED DispatchDocument birlikte bu iş durumunu temsil eder.
        data: { status: OrderStatus.READY_TO_SHIP },
      });

      const giftNotes = unit.orders
        .map((row) => ({ orderNumber: row.orderNumber, note: row.order.customerNote?.trim() ?? "" }))
        .filter((row) => row.note);

      return {
        dispatchDocumentId: document.id,
        dispatchNumber: document.dispatchNumber,
        status: document.status,
        giftNotes,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "İrsaliye oluşturulamadı." }, { status: 409 });
  }
}
