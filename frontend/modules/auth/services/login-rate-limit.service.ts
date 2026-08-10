import { LoginRateLimitRepository } from "../repositories/login-rate-limit.repository";

const RATE_LIMIT_CONFIG = {
  WINDOW_MINUTES: 15,

  IP_MAX_ATTEMPTS: 20,

  IP_USER_MAX_ATTEMPTS: 7,

  BLOCK_MINUTES: 30,
} as const;

export type LoginRateLimitCheckResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
    };

type ScopeDefinition = {
  scopeKey: string;
  ipAddress: string;
  username: string | null;
  maxAttempts: number;
};

function addMinutes(
  date: Date,
  minutes: number,
) {
  return new Date(
    date.getTime() +
      minutes * 60 * 1000,
  );
}

function normalizeUsername(
  username: string,
) {
  return username
    .trim()
    .toLowerCase();
}

export class LoginRateLimitService {
  private static getScopes(
    ipAddress: string,
    username: string,
  ): ScopeDefinition[] {
    const normalizedUsername =
      normalizeUsername(
        username,
      );

    return [
      {
        scopeKey:
          `ip:${ipAddress}`,

        ipAddress,

        username: null,

        maxAttempts:
          RATE_LIMIT_CONFIG
            .IP_MAX_ATTEMPTS,
      },

      {
        scopeKey:
          `ip-user:${ipAddress}:${normalizedUsername}`,

        ipAddress,

        username:
          normalizedUsername,

        maxAttempts:
          RATE_LIMIT_CONFIG
            .IP_USER_MAX_ATTEMPTS,
      },
    ];
  }

  static async check(
    ipAddress: string | null,
    username: string,
  ): Promise<LoginRateLimitCheckResult> {
    /*
     * IP belirlenemezse kullanıcıyı tamamen
     * sistem dışına atmıyoruz.
     *
     * Kullanıcı bazlı mevcut lockout
     * koruması yine çalışmaya devam eder.
     */
    if (!ipAddress) {
      return {
        allowed: true,
      };
    }

    const now = new Date();

    const scopes =
      this.getScopes(
        ipAddress,
        username,
      );

    for (const scope of scopes) {
      const record =
        await LoginRateLimitRepository
          .findByScopeKey(
            scope.scopeKey,
          );

      if (
        !record?.blockedUntil
      ) {
        continue;
      }

      if (
        record.blockedUntil >
        now
      ) {
        const retryAfterSeconds =
          Math.max(
            1,
            Math.ceil(
              (
                record.blockedUntil
                  .getTime() -
                now.getTime()
              ) / 1000,
            ),
          );

        return {
          allowed: false,
          retryAfterSeconds,
        };
      }

      /*
       * Block süresi bitmiş kayıt yeni
       * başarısız denemede yeniden pencereye
       * alınacak.
       */
    }

    return {
      allowed: true,
    };
  }

  static async recordFailure(
    ipAddress: string | null,
    username: string,
  ): Promise<void> {
    if (!ipAddress) {
      return;
    }

    const now = new Date();

    const windowExpiresAt =
      addMinutes(
        now,
        -RATE_LIMIT_CONFIG
          .WINDOW_MINUTES,
      );

    const scopes =
      this.getScopes(
        ipAddress,
        username,
      );

    for (const scope of scopes) {
      let record =
        await LoginRateLimitRepository
          .findByScopeKey(
            scope.scopeKey,
          );

      if (!record) {
        await LoginRateLimitRepository
          .createScope({
            scopeKey:
              scope.scopeKey,

            ipAddress:
              scope.ipAddress,

            username:
              scope.username,

            now,
          });

        continue;
      }

      const windowExpired =
        record.windowStartedAt <
        windowExpiresAt;

      const blockExpired =
        Boolean(
          record.blockedUntil &&
            record.blockedUntil <=
              now,
        );

      if (
        windowExpired ||
        blockExpired
      ) {
        record =
          await LoginRateLimitRepository
            .resetWindow(
              scope.scopeKey,
              now,
            );
      } else {
        record =
          await LoginRateLimitRepository
            .incrementAttempt(
              scope.scopeKey,
              now,
            );
      }

      if (
        record.attemptCount >=
        scope.maxAttempts
      ) {
        await LoginRateLimitRepository
          .blockScope(
            scope.scopeKey,

            addMinutes(
              now,
              RATE_LIMIT_CONFIG
                .BLOCK_MINUTES,
            ),
          );
      }
    }
  }

  static async recordSuccess(
    ipAddress: string | null,
    username: string,
  ): Promise<void> {
    if (!ipAddress) {
      return;
    }

    const normalizedUsername =
      normalizeUsername(
        username,
      );

    /*
     * Başarılı girişte sadece
     * IP + kullanıcı kapsamını temizliyoruz.
     *
     * Genel IP sayacını temizlemiyoruz;
     * aksi halde saldırgan bir geçerli hesapla
     * giriş yaparak IP brute-force sayacını
     * sürekli sıfırlayabilir.
     */
    await LoginRateLimitRepository
      .clearScope(
        `ip-user:${ipAddress}:${normalizedUsername}`,
      );
  }
}