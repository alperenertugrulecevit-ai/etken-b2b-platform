"use server";

import { SessionService } from "../services/session.service";

export async function logoutAction() {
  await SessionService.logout();

  return {
    success: true,
  };
}