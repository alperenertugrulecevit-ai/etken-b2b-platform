import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
    const path = typeof body.path === "string" ? body.path : "";
    if (!/^[a-f0-9-]{36}$/i.test(visitorId) || !path.startsWith("/") || path.length > 500 || path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ error: "Invalid visit" }, { status: 400 });
    }
    await prisma.siteVisit.create({ data: { visitorId, path: path.split("?")[0] } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Visit tracking unavailable" }, { status: 503 });
  }
}
