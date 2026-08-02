import { NextResponse } from "next/server";

import { getPublicCompanyProfile } from "@/modules/b2b/services/company-profile.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const profile = await getPublicCompanyProfile();

  return NextResponse.json(profile, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
