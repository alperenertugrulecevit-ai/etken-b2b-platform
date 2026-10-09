/* Read-only audit. Run only against an authorized database connection. */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
async function main() {
  const orders = await db.order.findMany({
    where: { source: "ECOMMERCE", stockReserved: true, stockDeducted: false,
      stockMovements: { some: { movementType: { in: ["RESERVATION_CREATE", "RESERVATION_RELEASE"] } } } },
    select: { id: true, orderNumber: true, status: true,
      items: { select: { productId: true, quantity: true, pickedQuantity: true, cancelledQuantity: true } },
      stockMovements: { where: { movementType: { in: ["RESERVATION_CREATE", "RESERVATION_RELEASE"] } },
        select: { productId: true, warehouseId: true, reservedChange: true } } },
  });
  let ambiguous = 0;
  for (const order of orders) {
    const byProduct = new Map();
    for (const line of order.items) {
      const p = byProduct.get(line.productId) || { ordered: 0, warehouseNet: 0 };
      p.ordered += line.quantity; byProduct.set(line.productId, p);
    }
    for (const movement of order.stockMovements) {
      const p = byProduct.get(movement.productId) || { ordered: 0, warehouseNet: 0 };
      p.warehouseNet += movement.reservedChange; byProduct.set(movement.productId, p);
    }
    const details = [...byProduct].map(([productId, values]) => ({ productId, ...values }));
    const safeToAutoRepair = false; // No historical ownership ledger; never guess.
    ambiguous++;
    process.stdout.write(JSON.stringify({ orderId: order.id, orderNumber: order.orderNumber,
      status: order.status, safeToAutoRepair, details }) + "\n");
  }
  process.stderr.write(`Mixed-reservation orders requiring reconciliation: ${ambiguous}\n`);
  if (ambiguous) process.exitCode = 2;
}
main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
