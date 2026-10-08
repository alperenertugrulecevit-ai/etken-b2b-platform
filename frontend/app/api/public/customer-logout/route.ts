import { NextRequest, NextResponse } from "next/server";

import { SessionService } from "@/modules/auth/services/session.service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await SessionService.logout();
    return NextResponse.json(
      { success: true },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Customer logout failed:", error);
    return NextResponse.json(
      { success: false, error: "LOGOUT_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url), 303);
}
