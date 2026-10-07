import { UserType } from "@prisma/client";
import { NextResponse } from "next/server";

import { SessionService } from "@/modules/auth/services/session.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await SessionService.getCurrentUser();

  const isCustomerLoggedIn =
    user?.userType === UserType.CUSTOMER &&
    Boolean(user.customerId) &&
    Boolean(user.customer?.isActive);

  const accountName = isCustomerLoggedIn
    ? user?.customer?.companyName?.trim() || user?.fullName?.trim() || null
    : null;

  return NextResponse.json(
    { isCustomerLoggedIn, accountName },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
