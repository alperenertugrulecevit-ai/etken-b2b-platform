import "server-only";

import { B2BPaymentMethod, OrderSource, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";

export const BANK_TRANSFER_PAYMENT_WINDOW_HOURS = 24;
const PAGE_SIZE = 50;

export type BankTransferExpiryReport = {
  dryRun: boolean;
  cutoff: string;
  scanned: number;
  eligible: number;
  cancelled: number;
  skipped: number;
  errors: number;
};

/**
 * Run only from a trusted, authenticated scheduler or a privileged operator.
 * Defaults to dry-run; no public API route or scheduler is wired up here.
 */
export async function processExpiredBankTransferOrders(input: {
  dryRun?: boolean;
  now?: Date;
  maxOrders?: number;
} = {}): Promise<BankTransferExpiryReport> {
  const dryRun = input.dryRun !== false;
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid clock");
  const maxOrders = input.maxOrders ?? 200;
  if (!Number.isSafeInteger(maxOrders) || maxOrders < 1 || maxOrders > 1000) {
    throw new Error("maxOrders must be between 1 and 1000");
  }
  const cutoff = new Date(now.getTime() - BANK_TRANSFER_PAYMENT_WINDOW_HOURS * 3600000);
  const result: BankTransferExpiryReport = {
    dryRun, cutoff: cutoff.toISOString(), scanned: 0, eligible: 0,
    cancelled: 0, skipped: 0, errors: 0,
  };
  let cursor: number | undefined;
  while (result.scanned < maxOrders) {
    const orders = await prisma.order.findMany({
      where: {
        source: OrderSource.ECOMMERCE,
        paymentMethod: B2BPaymentMethod.BANK_TRANSFER,
        status: OrderStatus.PENDING,
        orderDate: { lte: cutoff },
        stockDeducted: false,
        cancellationStatus: null,
        paymentStatus: { in: ["PENDING", "UNPAID", "AWAITING_PAYMENT"] },
        ...(cursor === undefined ? {} : { id: { gt: cursor } }),
      },
      select: {
        id: true, orderDate: true, paymentStatus: true,
        pickingRecords: { select: { id: true }, take: 1 },
        assignedHandlingUnits: { select: { id: true }, take: 1 },
        zonePickTasks: { select: { id: true }, take: 1 },
        shippingHandlingUnitOrders: { select: { id: true }, take: 1 },
        paymentTransactions: { select: { status: true }, take: 10 },
        bankTransactions: { select: { id: true }, take: 1 },
      },
      orderBy: { id: "asc" },
      take: Math.min(PAGE_SIZE, maxOrders - result.scanned),
    });
    if (orders.length === 0) break;
    for (const order of orders) {
      cursor = order.id;
      result.scanned++;
      const blocked = order.pickingRecords.length > 0 ||
        order.assignedHandlingUnits.length > 0 ||
        order.zonePickTasks.length > 0 ||
        order.shippingHandlingUnitOrders.length > 0 ||
        order.bankTransactions.length > 0 ||
        order.paymentTransactions.length > 0;
      if (blocked) { result.skipped++; continue; }
      result.eligible++;
      if (dryRun) continue;
      try {
        // CancellationService rechecks the order and performs stock/ledger
        // changes atomically. It fails closed on mixed WMS reservations.
        await OrderCancellationService.request({
          orderId: order.id,
          reason: "Havale/EFT ödemesi 24 saat içinde onaylanmadı.",
          actor: { userId: null, displayName: "PAYMENT_EXPIRY" },
          bankTransferExpiryCutoff: cutoff,
        });
        result.cancelled++;
      } catch {
        result.errors++;
      }
    }
  }
  return result;
}
