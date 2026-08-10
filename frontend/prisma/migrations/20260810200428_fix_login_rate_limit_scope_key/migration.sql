/*
  Warnings:

  - A unique constraint covering the columns `[scopeKey]` on the table `LoginRateLimit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `scopeKey` to the `LoginRateLimit` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LoginRateLimit_ipAddress_username_key";

-- AlterTable
ALTER TABLE "LoginRateLimit" ADD COLUMN     "scopeKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LoginRateLimit_scopeKey_key" ON "LoginRateLimit"("scopeKey");
