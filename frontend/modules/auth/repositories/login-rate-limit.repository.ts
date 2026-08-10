import { prisma } from "@/lib/prisma";

type CreateScopeInput = {
  scopeKey: string;
  ipAddress: string;
  username: string | null;
  now: Date;
};

export class LoginRateLimitRepository {
  static async findByScopeKey(
    scopeKey: string,
  ) {
    return prisma.loginRateLimit.findUnique({
      where: {
        scopeKey,
      },
    });
  }

  static async createScope({
    scopeKey,
    ipAddress,
    username,
    now,
  }: CreateScopeInput) {
    return prisma.loginRateLimit.create({
      data: {
        scopeKey,
        ipAddress,
        username,

        attemptCount: 1,

        windowStartedAt: now,
        lastAttemptAt: now,

        blockedUntil: null,
      },
    });
  }

  static async resetWindow(
    scopeKey: string,
    now: Date,
  ) {
    return prisma.loginRateLimit.update({
      where: {
        scopeKey,
      },

      data: {
        attemptCount: 1,
        windowStartedAt: now,
        lastAttemptAt: now,
        blockedUntil: null,
      },
    });
  }

  static async incrementAttempt(
    scopeKey: string,
    now: Date,
  ) {
    return prisma.loginRateLimit.update({
      where: {
        scopeKey,
      },

      data: {
        attemptCount: {
          increment: 1,
        },

        lastAttemptAt: now,
      },
    });
  }

  static async blockScope(
    scopeKey: string,
    blockedUntil: Date,
  ) {
    return prisma.loginRateLimit.update({
      where: {
        scopeKey,
      },

      data: {
        blockedUntil,
      },
    });
  }

  static async clearScope(
    scopeKey: string,
  ) {
    await prisma.loginRateLimit.deleteMany({
      where: {
        scopeKey,
      },
    });
  }
}