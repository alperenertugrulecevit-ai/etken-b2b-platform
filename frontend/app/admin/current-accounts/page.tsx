import { CustomerAccountEntryType, OrderStatus, PurchaseOrderStatus } from "@prisma/client";

import CurrentAccountDashboard, { type CurrentAccountRow } from "@/components/admin/CurrentAccountDashboard";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const dynamic = "force-dynamic";

const dateText = (value: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(value);

export default async function CurrentAccountsPage() {
  await AuthorizationService.requireAdminPortalAccess();

  const [orders, purchases, refunds] = await Promise.all([
    prisma.order.findMany({
      where: { status: { notIn: [OrderStatus.DRAFT, OrderStatus.CANCELLED] } },
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
        order: { select: { orderNumber: true } },
      },
    }),
  ]);

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
      customerType: "Kurumsal" as const,
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
    ...refunds.map((refund) => ({
      id: `refund-${refund.id}`,
      customerType: refund.customer.customerType === "INDIVIDUAL" ? "Bireysel" as const : "Kurumsal" as const,
      movement: "İade" as const,
      date: dateText(refund.transactionDate),
      customerCode: refund.customer.customerCode,
      customerName: refund.customer.companyName,
      orderNo: refund.order?.orderNumber ?? "",
      documentNo: refund.referenceNo ?? "",
      amount: refund.amount,
      vatAmount: 0,
      grandTotal: refund.amount,
      description: refund.description,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-black">Cari Hareketler Dashboard</h1>
        <p className="mt-2 text-slate-500">Satış, satın alma ve finansal iadeleri tek ekranda izleyin. Satın alma satırlarında tedarikçi, cari taraf olarak gösterilir.</p>
      </div>
      <CurrentAccountDashboard rows={rows} />
    </section>
  );
}
