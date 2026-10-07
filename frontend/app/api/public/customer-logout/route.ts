import { NextRequest, NextResponse } from "next/server";

import { SessionService } from "@/modules/auth/services/session.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await SessionService.logout();

  const response = NextResponse.redirect(
    new URL("/customer-login", request.url),
    303,
  );

  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/customer-login", request.url), 303);
}
