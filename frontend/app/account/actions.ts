"use server";

import { redirect } from "next/navigation";

import { SessionService } from "@/modules/auth/services/session.service";

export async function customerLogoutAction() {
  await SessionService.logout();
  redirect("/customer-login");
}
