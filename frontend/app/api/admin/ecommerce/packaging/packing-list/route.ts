import { NextRequest, NextResponse } from "next/server";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { PackingListPrintService } from "@/modules/printing/services/packing-list-print.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const profile = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
    const body = await request.json();
    const barcode = String(body?.shippingHandlingUnitBarcode ?? "").trim().toUpperCase();
    const printerId = String(body?.printerId ?? "").trim();

    if (!barcode) return NextResponse.json({ success: false, message: "Sevk THM bulunamadı." }, { status: 400 });
    if (!printerId) return NextResponse.json({ success: false, message: "Barkod yazıcısı seçilmedi." }, { status: 400 });

    const displayName = profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

    const result = await PackingListPrintService.print({
      shippingHandlingUnitBarcode: barcode,
      printerId,
      forceReprint: Boolean(body?.forceReprint),
      actor: { userId: profile.id, displayName, terminalCode: "E-COMMERCE-PACKING" },
    });

    return NextResponse.json(result, { status: result.success ? 200 : result.requiresConfirmation ? 409 : 422 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Çeki listesi yazdırılamadı." }, { status: 500 });
  }
}
