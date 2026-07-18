import bcrypt from "bcryptjs";

import { AUTH_CONSTANTS } from "../constants/auth.constants";

export class PasswordService {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(
      password,
      AUTH_CONSTANTS.PASSWORD_HASH_ROUNDS
    );
  }

  static async verify(
    password: string,
    passwordHash: string
  ): Promise<boolean> {
    if (!password || !passwordHash) {
      return false;
    }

    return bcrypt.compare(password, passwordHash);
  }
}