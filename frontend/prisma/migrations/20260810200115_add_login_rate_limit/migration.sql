-- CreateTable
CREATE TABLE "LoginRateLimit" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "username" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginRateLimit_ipAddress_idx" ON "LoginRateLimit"("ipAddress");

-- CreateIndex
CREATE INDEX "LoginRateLimit_username_idx" ON "LoginRateLimit"("username");

-- CreateIndex
CREATE INDEX "LoginRateLimit_blockedUntil_idx" ON "LoginRateLimit"("blockedUntil");

-- CreateIndex
CREATE INDEX "LoginRateLimit_lastAttemptAt_idx" ON "LoginRateLimit"("lastAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginRateLimit_ipAddress_username_key" ON "LoginRateLimit"("ipAddress", "username");
