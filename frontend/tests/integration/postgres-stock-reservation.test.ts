import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Runs only when explicitly enabled against an isolated PostgreSQL database.
 * Never run this suite against production credentials.
 */
const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";
const prisma = enabled ? new PrismaClient() : null;

describe.skipIf(!enabled)("PostgreSQL atomic stock reservation", () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("allows only one competing reservation for the last unit", async () => {
    const db = prisma!;
    const unique = `CI-STOCK-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantId = `tenant-${unique}`;
    const companyId = `company-${unique}`;
    const tenant = await db.wmsTenant.create({
      data: { id: tenantId, code: unique, name: unique },
    });
    await db.wmsCompany.create({
      data: { id: companyId, tenantId: tenant.id, code: unique, name: unique },
    });
    const product = await db.product.create({
      data: {
        tenantId, companyId, code: unique, barcode: unique, name: "Concurrent stock test",
        brand: "CI", category: "CI", supplier: "CI", price: 1,
        stock: 1, reservedStock: 0, vat: 0, ownStock: true,
      },
    });
    try {
      const reserve = () => db.product.updateMany({
        where: {
          id: product.id,
          tenantId,
          companyId,
          stock: { gte: 1 },
          reservedStock: { lte: 0 },
        },
        data: { reservedStock: { increment: 1 } },
      });
      const outcomes = await Promise.all([reserve(), reserve()]);
      expect(outcomes.map((x) => x.count).sort()).toEqual([0, 1]);
      const persisted = await db.product.findUniqueOrThrow({ where: { id: product.id } });
      expect(persisted.stock).toBe(1);
      expect(persisted.reservedStock).toBe(1);
    } finally {
      await db.product.delete({ where: { id: product.id } });
      await db.wmsCompany.delete({ where: { id: companyId } });
      await db.wmsTenant.delete({ where: { id: tenantId } });
    }
  });
});
