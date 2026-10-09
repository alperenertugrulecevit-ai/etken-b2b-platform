import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processExpiredBankTransferOrders } from "@/modules/ecommerce/services/bank-transfer-expiry.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const configured = process.env.BANK_TRANSFER_EXPIRY_CRON_SECRET;
  if (!configured || configured.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(configured);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const execute = url.searchParams.get("execute") === "true";
  if (execute && process.env.BANK_TRANSFER_EXPIRY_ENABLED !== "true") {
    return NextResponse.json({ error: "Automatic cancellation disabled" }, { status: 409 });
  }
  try {
    const report = await processExpiredBankTransferOrders({
      dryRun: !execute,
      maxOrders: 100,
    });
    console.info("bank-transfer-expiry", JSON.stringify(report));
    return NextResponse.json(report, { status: report.errors > 0 ? 207 : 200 });
  } catch (error) {
    console.error("bank-transfer-expiry failed", error);
    return NextResponse.json({ error: "Expiry job failed" }, { status: 500 });
  }
}
