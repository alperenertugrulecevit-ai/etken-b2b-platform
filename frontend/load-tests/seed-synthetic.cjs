const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL || '';
if (!/^postgresql:\/\/etken_test:[^@]+@etken-lt-\d+-db:5432\/etken_loadtest$/.test(url)) {
  throw new Error('Synthetic seed is restricted to ephemeral etken-loadtest databases.');
}
const prisma = new PrismaClient();
const tenantId = 'tenant_etken';
const companyId = 'company_etken_office';

async function main() {
  await prisma.wmsTenant.upsert({
    where: { id: tenantId },
    create: { id: tenantId, code: 'ETKEN-LOADTEST', name: 'Synthetic Load Test Tenant' },
    update: {},
  });
  await prisma.wmsCompany.upsert({
    where: { id: companyId },
    create: { id: companyId, tenantId, code: 'ETKEN-LOADTEST', name: 'Synthetic Load Test Company' },
    update: {},
  });
  const products = Array.from({ length: 250 }, (_, i) => ({
    tenantId, companyId,
    code: 'LT-PRODUCT-' + String(i + 1).padStart(4, '0'),
    barcode: 'LT-BARCODE-' + String(i + 1).padStart(4, '0'),
    name: 'Synthetic Product ' + String(i + 1),
    brand: 'LOADTEST',
    category: ['Office', 'Cleaning', 'Industrial', 'Food'][i % 4],
    supplier: 'Synthetic Supplier',
    price: 10 + (i % 100),
    stock: 1000,
    reservedStock: 0,
    vat: 20,
    ownStock: true,
    isActive: true,
  }));
  await prisma.product.createMany({ data: products, skipDuplicates: true });
  console.log('Synthetic catalog ready:', await prisma.product.count({ where: { tenantId, companyId, code: { startsWith: 'LT-PRODUCT-' } } }));
}
main().finally(() => prisma.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
