import { createHash, randomBytes } from "node:crypto";

import { SESSION_CONSTANTS } from "../constants/session.constants";

export class TokenService {
  static generateSessionToken(): string {
    return randomBytes(
      SESSION_CONSTANTS.TOKEN_BYTE_LENGTH
    ).toString("base64url");
  }

  static hashSessionToken(token: string): string {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }
}