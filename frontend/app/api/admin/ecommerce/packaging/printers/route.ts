import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const printers = await prisma.barcodePrinter.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true },
  });
  return NextResponse.json({ success: true, printers });
}
