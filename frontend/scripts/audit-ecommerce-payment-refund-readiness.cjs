/**
 * Read-only production readiness audit.
 * Requires DATABASE_URL supplied through an authorized secret injection.
 * Never prints customer information, connection strings or individual orders.
 */
const { PrismaClient, OrderSource, OrderStatus } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });
async function main() {
  const [refundPending, pendingPayment, reservedPending, cardRefundPending, activeGateways] =
    await Promise.all([
      prisma.order.count({ where: { source: OrderSource.ECOMMERCE, cancellationStatus: "REFUND_PENDING" } }),
      prisma.order.count({ where: { source: OrderSource.ECOMMERCE, paymentStatus: "PENDING" } }),
      prisma.order.count({ where: { source: OrderSource.ECOMMERCE, status: OrderStatus.PENDING, stockReserved: true, stockDeducted: false } }),
      prisma.order.count({ where: {
        source: OrderSource.ECOMMERCE,
        cancellationStatus: "REFUND_PENDING",
        paymentTransactions: { some: { status: "PAID" } },
      } }),
      prisma.paymentGatewaySetting.count({ where: { isActive: true } }),
    ]);
  console.log(JSON.stringify({
    audit: "ecommerce-payment-refund-readiness",
    readOnly: true,
    counts: { refundPending, pendingPayment, reservedPending, cardRefundPending, activeGateways },
    cautions: [
      "PENDING payments are not necessarily expired; no payment deadline is inferred.",
      "REFUND_PENDING is not proof that money has been returned.",
      "An active gateway setting is not proof that a production adapter is registered.",
      "Counts alone do not establish end-to-end payment or refund readiness.",
    ],
  }, null, 2));
}
main().catch((error) => {
  console.error("Read-only audit failed:", error.code || error.name || "UNKNOWN");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
