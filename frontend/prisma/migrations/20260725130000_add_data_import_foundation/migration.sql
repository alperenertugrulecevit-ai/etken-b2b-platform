-- CreateEnum
CREATE TYPE "DataImportType" AS ENUM (
  'PRODUCT',
  'SUPPLIER',
  'CUSTOMER',
  'PURCHASE_ORDER',
  'SALES_ORDER'
);

-- CreateEnum
CREATE TYPE "DataImportMode" AS ENUM (
  'CREATE_ONLY',
  'UPSERT'
);

-- CreateEnum
CREATE TYPE "DataImportStatus" AS ENUM (
  'VALIDATING',
  'READY',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "DataImportRowStatus" AS ENUM (
  'VALID',
  'INVALID',
  'IMPORTED',
  'UPDATED',
  'SKIPPED',
  'FAILED'
);

-- CreateTable
CREATE TABLE "DataImportJob" (
  "id" TEXT NOT NULL,
  "importNumber" TEXT NOT NULL,
  "importType" "DataImportType" NOT NULL,
  "mode" "DataImportMode" NOT NULL DEFAULT 'CREATE_ONLY',
  "status" "DataImportStatus" NOT NULL DEFAULT 'VALIDATING',
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "insertedRows" INTEGER NOT NULL DEFAULT 0,
  "updatedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "summary" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DataImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataImportRow" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "externalKey" TEXT,
  "status" "DataImportRowStatus" NOT NULL,
  "rawData" JSONB NOT NULL,
  "normalizedData" JSONB,
  "errors" JSONB,
  "resultRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DataImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataImportJob_importNumber_key"
ON "DataImportJob"("importNumber");

-- CreateIndex
CREATE INDEX "DataImportJob_importType_status_createdAt_idx"
ON "DataImportJob"("importType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DataImportJob_createdById_createdAt_idx"
ON "DataImportJob"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "DataImportJob_fileHash_idx"
ON "DataImportJob"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "DataImportRow_jobId_sheetName_rowNumber_key"
ON "DataImportRow"("jobId", "sheetName", "rowNumber");

-- CreateIndex
CREATE INDEX "DataImportRow_jobId_status_idx"
ON "DataImportRow"("jobId", "status");

-- CreateIndex
CREATE INDEX "DataImportRow_externalKey_idx"
ON "DataImportRow"("externalKey");

-- AddForeignKey
ALTER TABLE "DataImportRow"
ADD CONSTRAINT "DataImportRow_jobId_fkey"
FOREIGN KEY ("jobId")
REFERENCES "DataImportJob"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
