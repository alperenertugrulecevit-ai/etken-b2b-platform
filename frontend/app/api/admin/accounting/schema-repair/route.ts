import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const dynamic = "force-dynamic";

const statements = [
  `DO $$ BEGIN CREATE TYPE "AccountingDocumentType" AS ENUM ('MEAL','FUEL','ENERGY','TELECOMMUNICATION','CONSUMABLE','WATER','OTHER_INCOME','OTHER_EXPENSE','PAYMENT_RECEIPT','INCOME_RECEIPT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AccountingMovementType" AS ENUM ('EXPENSE','INCOME','PAYMENT_OUT','PAYMENT_IN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AccountingPaymentType" AS ENUM ('CASH','DEFERRED','BANK_TRANSFER','CREDIT_CARD','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN CREATE TYPE "AccountingPartyType" AS ENUM ('CUSTOMER','SUPPLIER','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "AccountingEntry" (
    "id" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT NOT NULL,
    "partyType" "AccountingPartyType" NOT NULL DEFAULT 'OTHER',
    "customerId" INTEGER,
    "supplierId" INTEGER,
    "documentType" "AccountingDocumentType" NOT NULL,
    "movementType" "AccountingMovementType" NOT NULL,
    "documentNo" TEXT,
    "paymentType" "AccountingPaymentType",
    "netAmount" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "bankName" TEXT,
    "bankReference" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingEntry_pkey" PRIMARY KEY ("id")
  );`,
  `DO $$ BEGIN ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_transactionDate_idx" ON "AccountingEntry"("transactionDate");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_companyName_idx" ON "AccountingEntry"("companyName");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_partyType_idx" ON "AccountingEntry"("partyType");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_customerId_transactionDate_idx" ON "AccountingEntry"("customerId","transactionDate");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_supplierId_transactionDate_idx" ON "AccountingEntry"("supplierId","transactionDate");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_documentType_idx" ON "AccountingEntry"("documentType");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_movementType_idx" ON "AccountingEntry"("movementType");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_paymentType_idx" ON "AccountingEntry"("paymentType");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_documentNo_idx" ON "AccountingEntry"("documentNo");`,
  `CREATE INDEX IF NOT EXISTS "AccountingEntry_bankReference_idx" ON "AccountingEntry"("bankReference");`,
];

export async function POST() {
  const profile = await AuthorizationService.requireAdminPortalAccess();

  if (!profile.isAdminUser) {
    return NextResponse.json({ error: "Bu işlem yalnız sistem yöneticisi tarafından çalıştırılabilir." }, { status: 403 });
  }

  try {
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }

    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'AccountingEntry'
    `;

    return NextResponse.json({
      ok: rows.length === 1,
      table: rows[0]?.table_name ?? null,
      message: rows.length === 1 ? "AccountingEntry şeması hazır." : "AccountingEntry tablosu doğrulanamadı.",
    });
  } catch (error) {
    console.error("Accounting schema repair failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Muhasebe şeması oluşturulamadı." },
      { status: 500 },
    );
  }
}
