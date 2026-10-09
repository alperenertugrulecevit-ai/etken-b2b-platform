// Real PostgreSQL integration probe. All writes occur inside a deliberately
// rolled-back transaction on a disposable internal Docker database.
const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL || '';
if (!/^postgresql:\/\/etken_test:[a-f0-9]{48}@etken-lt-[0-9]+-db:5432\/etken_loadtest$/.test(url) ||
    process.env.DIRECT_URL !== url || process.env.NODE_ENV !== 'test') {
  throw new Error('Refusing integration writes outside ephemeral Docker PostgreSQL.');
}
for (const key of ['ECOMMERCE_EMAIL_WEBHOOK_URL', 'GOOGLE_APPLICATION_CREDENTIALS',
  'STRIPE_SECRET_KEY', 'IYZICO_API_KEY', 'PAYTR_MERCHANT_KEY', 'RESEND_API_KEY']) {
  if (process.env[key]) throw new Error('Refusing external integration credentials: ' + key);
}
const prisma = new PrismaClient();
const ROLLBACK = 'EXPECTED_ORDER_INTEGRATION_ROLLBACK';

async function main() {
  const product = await prisma.product.findFirst({
    where: { code: 'LT-PRODUCT-0001', tenantId: 'tenant_etken', companyId: 'company_etken_office' },
  });
  if (!product || product.stock !== 1000 || product.reservedStock !== 0 ||
      await prisma.order.count() !== 0 || await prisma.customer.count() !== 0) {
    throw new Error('Unexpected isolated test baseline.');
  }
  let verified = false;
  try {
    await prisma.$transaction(async tx => {
      const customer = await tx.customer.create({
        data: {
          customerCode: 'LT-INTEGRATION-ONLY', customerType: 'INDIVIDUAL',
          companyName: 'Synthetic Customer', contactName: 'Synthetic Customer',
          phone: '5550000000', email: 'synthetic@example.invalid',
          address: 'Test Street', city: 'Istanbul', district: 'Test',
        },
      });
      const address = await tx.customerAddress.create({
        data: {
          customerId: customer.id, addressCode: 'LT-ADDRESS', title: 'Synthetic',
          addressType: 'DELIVERY', contactName: 'Synthetic Customer',
          address: 'Test Street', city: 'Istanbul', district: 'Test',
        },
      });
      const order = await tx.order.create({
        data: {
          orderNumber: 'LT-INTEGRATION-ORDER', customerId: customer.id,
          shippingAddressId: address.id, status: 'PENDING',
          source: 'ECOMMERCE', orderType: 'ECOMMERCE',
          paymentMethod: 'BANK_TRANSFER', paymentStatus: 'PENDING',
          paymentProvider: 'BANK_TRANSFER',
          subtotal: 20, vatAmount: 4, totalAmount: 24,
          ecommerceEmail: 'synthetic@example.invalid',
          invoiceType: 'INDIVIDUAL', invoiceName: 'Synthetic Customer',
          invoiceAddress: 'Test Street', invoiceCity: 'Istanbul',
          invoiceDistrict: 'Test',
          items: { create: [{
            productId: product.id, productCode: product.code,
            productName: product.name, quantity: 2,
            unitPrice: 10, vatRate: 20, lineNet: 20,
            vatAmount: 4, lineTotal: 24,
          }] },
          statusHistory: { create: {
            status: 'PENDING', note: 'Synthetic test', visibleToCustomer: true,
          } },
          accountEntries: { create: {
            customerId: customer.id, direction: 'DEBIT', entryType: 'ORDER',
            amount: 24, description: 'Synthetic order', referenceNo: 'LT-INTEGRATION',
          } },
        },
        include: { items: true, statusHistory: true, accountEntries: true },
      });
      if (order.status !== 'PENDING' || order.paymentMethod !== 'BANK_TRANSFER' ||
          order.totalAmount !== 24 || order.items.length !== 1 ||
          order.items[0].quantity !== 2 || order.items[0].vatAmount !== 4 ||
          order.statusHistory.length !== 1 ||
          order.accountEntries.length !== 1 ||
          order.accountEntries[0].direction !== 'DEBIT' ||
          order.accountEntries[0].amount !== 24) {
        throw new Error('Persisted order, ledger, tax or status mismatch.');
      }
      if (await tx.order.count() !== 1 ||
          await tx.orderItem.count() !== 1 ||
          await tx.customerAccountEntry.count() !== 1 ||
          await tx.orderStatusHistory.count() !== 1) {
        throw new Error('Unexpected persisted row counts inside transaction.');
      }
      verified = true;
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK || !verified) throw error;
  }
  const [orders, customers, addresses, lines, ledger, history, after] = await Promise.all([
    prisma.order.count(), prisma.customer.count(), prisma.customerAddress.count(),
    prisma.orderItem.count(), prisma.customerAccountEntry.count(),
    prisma.orderStatusHistory.count(),
    prisma.product.findUnique({ where: { id: product.id } }),
  ]);
  if ([orders, customers, addresses, lines, ledger, history].some(n => n !== 0) ||
      after.stock !== product.stock || after.reservedStock !== product.reservedStock) {
    throw new Error('Rollback failed to restore database baseline.');
  }
  console.log('Real PostgreSQL synthetic order, lines, ledger and history verified; rollback clean.');
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
