import { CustomerAccountEntryType, OrderStatus, PurchaseOrderStatus } from "@prisma/client";

import CurrentAccountDashboard, { type CurrentAccountRow } from "@/components/admin/CurrentAccountDashboard";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const dynamic = "force-dynamic";

const dateText = (value: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(value);

export default async function CurrentAccountsPage() {
  await AuthorizationService.requireAdminPortalAccess();

  const [orders, purchases, refunds, customerPayments, accountingEntries] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: OrderStatus.DRAFT } },
      orderBy: { orderDate: "desc" },
      take: 1500,
      select: {
        id: true, orderNumber: true, orderDate: true, subtotal: true, discountAmount: true, vatAmount: true, totalAmount: true,
        customer: { select: { customerCode: true, companyName: true, customerType: true } },
        dispatchLines: {
          where: { dispatchDocument: { status: "ISSUED" } },
          select: { dispatchDocument: { select: { dispatchNumber: true } } },
          take: 1,
        },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { notIn: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED] } },
      orderBy: { orderDate: "desc" },
      take: 1500,
      select: {
        id: true, purchaseNumber: true, orderDate: true, subtotal: true, discountAmount: true, vatAmount: true, totalAmount: true,
        deliveryNoteNumber: true, supplierNote: true,
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.customerAccountEntry.findMany({
      where: { entryType: CustomerAccountEntryType.REFUND },
      orderBy: { transactionDate: "desc" },
      take: 1500,
      select: {
        id: true, amount: true, description: true, referenceNo: true, transactionDate: true,
        customer: { select: { customerCode: true, companyName: true, customerType: true } },
        order: { select: { orderNumber: true, subtotal: true, discountAmount: true, vatAmount: true, totalAmount: true } },
      },
    }),
    prisma.customerAccountEntry.findMany({
      where: { entryType: CustomerAccountEntryType.PAYMENT },
      orderBy: { transactionDate: "desc" },
      take: 1500,
      select: {
        id: true, amount: true, description: true, referenceNo: true, transactionDate: true,
        customer: { select: { customerCode: true, companyName: true, customerType: true } },
      },
    }),
    prisma.accountingEntry.findMany({
      where: { OR: [{ partyType: "SUPPLIER" }, { partyType: "CUSTOMER", movementType: { not: "PAYMENT_IN" } }] },
      orderBy: { transactionDate: "desc" },
      take: 1500,
      select: {
        id: true, transactionDate: true, companyName: true, partyType: true, customerId: true, supplierId: true,
        documentType: true, movementType: true, documentNo: true, bankReference: true, netAmount: true, vatAmount: true,
        totalAmount: true, description: true,
        customer: { select: { customerCode: true, companyName: true, customerType: true } },
        supplier: { select: { id: true, name: true } },
      },
    }),
  ]);

  const splitRefund = (refund: (typeof refunds)[number]) => {
    const gross = Math.max(0, refund.order?.totalAmount ?? 0);
    const orderVat = Math.max(0, refund.order?.vatAmount ?? 0);
    const ratio = gross > 0 ? Math.min(1, Math.max(0, refund.amount / gross)) : 0;
    const vatAmount = orderVat * ratio;
    return {
      amount: Math.max(0, refund.amount - vatAmount),
      vatAmount,
      grandTotal: refund.amount,
    };
  };

  const rows: CurrentAccountRow[] = [
    ...orders.map((order) => ({
      id: `sale-${order.id}`,
      customerType: order.customer.customerType === "INDIVIDUAL" ? "Bireysel" as const : "Kurumsal" as const,
      movement: "Gelir" as const,
      date: dateText(order.orderDate),
      customerCode: order.customer.customerCode,
      customerName: order.customer.companyName,
      orderNo: order.orderNumber,
      documentNo: order.dispatchLines[0]?.dispatchDocument.dispatchNumber ?? "",
      amount: Math.max(0, order.subtotal - order.discountAmount),
      vatAmount: order.vatAmount,
      grandTotal: order.totalAmount,
      description: "Satış siparişi",
    })),
    ...purchases.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      customerType: "Tedarikçi" as const,
      movement: "Gider" as const,
      date: dateText(purchase.orderDate),
      customerCode: `TED-${String(purchase.supplier.id).padStart(6, "0")}`,
      customerName: purchase.supplier.name,
      orderNo: purchase.purchaseNumber,
      documentNo: purchase.deliveryNoteNumber ?? "",
      amount: Math.max(0, purchase.subtotal - purchase.discountAmount),
      vatAmount: purchase.vatAmount,
      grandTotal: purchase.totalAmount,
      description: purchase.supplierNote || "Satın alma",
    })),
    ...refunds.map((refund) => {
      const split = splitRefund(refund);
      return {
      id: `refund-${refund.id}`,
      customerType: refund.customer.customerType === "INDIVIDUAL" ? "Bireysel" as const : "Kurumsal" as const,
      movement: "İade" as const,
      date: dateText(refund.transactionDate),
      customerCode: refund.customer.customerCode,
      customerName: refund.customer.companyName,
      orderNo: refund.order?.orderNumber ?? "",
      documentNo: refund.referenceNo ?? "",
      amount: split.amount,
      vatAmount: split.vatAmount,
      grandTotal: split.grandTotal,
      description: refund.description,
    };
    }),
    ...customerPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      customerType: payment.customer.customerType === "INDIVIDUAL" ? "Bireysel" as const : "Kurumsal" as const,
      movement: "Gelir" as const,
      date: dateText(payment.transactionDate),
      customerCode: payment.customer.customerCode,
      customerName: payment.customer.companyName,
      orderNo: "",
      documentNo: payment.referenceNo ?? "",
      amount: payment.amount,
      vatAmount: 0,
      grandTotal: payment.amount,
      description: payment.description,
    })),
    ...accountingEntries.map((entry) => ({
      id: `accounting-${entry.id}`,
      customerType: entry.supplier ? "Tedarikçi" as const : entry.customer?.customerType === "INDIVIDUAL" ? "Bireysel" as const : "Kurumsal" as const,
      movement: (entry.movementType === "INCOME" || entry.movementType === "PAYMENT_IN" ? "Gelir" : "Gider") as "Gelir" | "Gider",
      date: dateText(entry.transactionDate),
      customerCode: entry.customer?.customerCode ?? (entry.supplier ? `TED-${String(entry.supplier.id).padStart(6, "0")}` : ""),
      customerName: entry.customer?.companyName ?? entry.supplier?.name ?? entry.companyName,
      orderNo: "",
      documentNo: entry.documentNo ?? entry.bankReference ?? "",
      amount: entry.netAmount,
      vatAmount: entry.vatAmount,
      grandTotal: entry.totalAmount,
      description: entry.description || (entry.movementType === "PAYMENT_IN" ? "Gelen havale / tahsilat" : entry.movementType === "PAYMENT_OUT" ? "Giden havale / ödeme" : "Muhasebe hareketi"),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-black">Cari Hareketler Dashboard</h1>
        <p className="mt-2 text-slate-500">Satış, satın alma, finansal iade ve Muhasebeleştirme ekranındaki müşteri/tedarikçi hareketlerini tek ekranda izleyin.</p>
      </div>
      <CurrentAccountDashboard rows={rows} />
    </section>
  );
}
