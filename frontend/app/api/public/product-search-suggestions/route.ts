import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeQuery(value: string) {
  return value.trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const q = normalizeQuery(request.nextUrl.searchParams.get("q") ?? "");

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { code: true, name: true, brand: true, imageUrl: true },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: 8,
  });

  return NextResponse.json(
    { suggestions: products },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
