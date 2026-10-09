// Runs only inside the isolated Docker network, against a disposable PostgreSQL.
// This checks actual Prisma transaction persistence/rollback, not the checkout HTTP action.
const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL || '';
if (!/^postgresql:\/\/etken_test:[a-f0-9]{48}@etken-lt-[0-9]+-db:5432\/etken_loadtest$/.test(url) ||
    process.env.DIRECT_URL !== url ||
    process.env.NODE_ENV !== 'test') {
  throw new Error('Integration writes require the isolated ephemeral test database.');
}
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { code: 'LT-PRODUCT-0001', tenantId: 'tenant_etken', companyId: 'company_etken_office' },
    select: { id: true, stock: true, reservedStock: true },
  });
  if (!product || product.stock !== 1000 || product.reservedStock !== 0) {
    throw new Error('Unexpected synthetic product baseline.');
  }
  const before = await prisma.order.count();
  if (before !== 0) throw new Error('Test database already has orders.');

  // Deliberately roll back a real PostgreSQL write. No permanent order is created.
  let rolledBack = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: { reservedStock: { increment: 1 } },
      });
      const inside = await tx.product.findUnique({
        where: { id: product.id },
        select: { reservedStock: true },
      });
      if (inside.reservedStock !== 1) throw new Error('Transactional reservation not visible.');
      throw new Error('EXPECTED_SYNTHETIC_ROLLBACK');
    });
  } catch (error) {
    if (error.message !== 'EXPECTED_SYNTHETIC_ROLLBACK') throw error;
    rolledBack = true;
  }
  if (!rolledBack) throw new Error('Rollback was not exercised.');
  const after = await prisma.product.findUnique({
    where: { id: product.id }, select: { stock: true, reservedStock: true },
  });
  if (after.stock !== product.stock || after.reservedStock !== product.reservedStock ||
      (await prisma.order.count()) !== before) {
    throw new Error('Transaction rollback changed persisted synthetic data.');
  }
  console.log('Isolated PostgreSQL transaction rollback verified; no persistent changes.');
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
