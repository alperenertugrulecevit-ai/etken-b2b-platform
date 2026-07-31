"use server";

import {
  PasswordResetService,
} from "@/modules/auth/services/password-reset.service";

export async function resetPasswordAction(
  token: string,
  newPassword: string,
  confirmPassword: string,
) {
  return PasswordResetService.resetPassword({
    token,
    newPassword,
    confirmPassword,
  });
}
