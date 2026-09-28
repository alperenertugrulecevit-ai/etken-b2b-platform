import { DispatchDocumentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function page(title: string, body: string) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#111;font-size:12px}h1{font-size:20px;margin:0 0 14px}.row{display:flex;justify-content:space-between;gap:24px}.box{border:1px solid #bbb;border-radius:8px;padding:12px;margin:10px 0}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #bbb;padding:7px;text-align:left}th{background:#eee}.note{font-size:18px;line-height:1.55;white-space:pre-wrap}.no-print{margin:0 0 12px;padding:8px;background:#fff3cd}@media print{.no-print{display:none}}</style>
  </head><body><div class="no-print">Bu belge paketleme istasyonunun laser yazıcısına gönderilmek üzere açıldı.</div>${body}
  <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),150));</script></body></html>`;
}

export async function GET(request: NextRequest) {
  try {
    const barcode = String(request.nextUrl.searchParams.get("thm") ?? "").trim().toUpperCase();
    const kind = request.nextUrl.searchParams.get("kind") === "gift" ? "gift" : "dispatch";
    if (!barcode) return new NextResponse("Sevk THM bulunamadı.", { status: 400 });

    const unit = await prisma.shippingHandlingUnit.findFirst({
      where: { handlingUnit: { barcode } },
      select: {
        handlingUnit: { select: { barcode: true } },
        customerName: true, contactName: true, address: true, city: true, district: true,
        dispatchDocument: {
          select: {
            status: true, dispatchNumber: true, documentDate: true,
            recipientName: true, recipientAddress: true, recipientCity: true, recipientDistrict: true,
            lines: { orderBy: [{ orderNumber: "asc" }, { productCode: "asc" }], select: { orderNumber: true, productCode: true, productName: true, quantity: true } },
          },
        },
        orders: { orderBy: { orderNumber: "asc" }, select: { orderNumber: true, order: { select: { customerNote: true } } } },
      },
    });

    if (!unit) return new NextResponse("Sevk THM bulunamadı.", { status: 404 });
    if (!unit.dispatchDocument || unit.dispatchDocument.status !== DispatchDocumentStatus.ISSUED) {
      return new NextResponse("İrsaliye henüz kesilmedi.", { status: 409 });
    }

    if (kind === "gift") {
      const notes = unit.orders.map((o) => ({ no: o.orderNumber, note: o.order.customerNote?.trim() ?? "" })).filter((x) => x.note);
      if (!notes.length) return new NextResponse("Hediye notu bulunmuyor.", { status: 404 });
      return new NextResponse(page("Hediye Notu", `<h1>Hediye Notu</h1>${notes.map((n)=>`<div class="box"><div class="note">${esc(n.note)}</div><p>Sipariş: ${esc(n.no)}</p></div>`).join("")}`), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }

    const d = unit.dispatchDocument;
    const rows = d.lines.map((line) => `<tr><td>${esc(line.orderNumber)}</td><td>${esc(line.productCode)}</td><td>${esc(line.productName)}</td><td>${line.quantity}</td></tr>`).join("");
    const html = page(`İrsaliye ${d.dispatchNumber ?? ""}`, `
      <div class="row"><h1>İrsaliye</h1><strong>${esc(d.dispatchNumber)}</strong></div>
      <div class="box"><strong>Sevk THM:</strong> ${esc(unit.handlingUnit.barcode)}<br><strong>Alıcı:</strong> ${esc(d.recipientName)}<br><strong>Adres:</strong> ${esc(d.recipientAddress)}, ${esc(d.recipientDistrict)} / ${esc(d.recipientCity)}<br><strong>Tarih:</strong> ${esc(d.documentDate?.toLocaleString("tr-TR") ?? "")}</div>
      <table><thead><tr><th>Sipariş No</th><th>Ürün Kodu</th><th>Ürün</th><th>Adet</th></tr></thead><tbody>${rows}</tbody></table>`);
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Belge oluşturulamadı.", { status: 500 });
  }
}
