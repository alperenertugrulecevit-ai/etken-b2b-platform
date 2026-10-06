import Link from "next/link";
import { CustomerAccountEntryType, PurchaseOrderStatus } from "@prisma/client";
import ConfigurableDataTable from "@/components/admin/ConfigurableDataTable";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const money = (value: number) =>
  value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

const inRange = (date: Date, from?: Date, to?: Date) =>
  (!from || date >= from) && (!to || date <= to);

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; from?: string; to?: string }>;
}) {
  await AuthorizationService.requireAdminPortalAccess();
  const q = await searchParams;
  const type = q.type === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";
  const from = q.from ? new Date(q.from + "T00:00:00+03:00") : undefined;
  const to = q.to ? new Date(q.to + "T23:59:59+03:00") : undefined;
  const range = from || to
    ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
    : {};

  const columns = [
    { key: "code", label: "Kod" },
    { key: "company", label: "Firma" },
    { key: "positive", label: "Alacak / (+)" },
    { key: "negative", label: "Borç / (-)" },
    { key: "balance", label: "Bakiye (+/-)" },
    { key: "movementCount", label: "Hareket" },
    { key: "lastMovement", label: "Son Hareket" },
  ];

  let rows: Array<{ key: string | number; cells: Record<string, React.ReactNode> }> = [];

  if (type === "CUSTOMER") {
    const customers = await prisma.customer.findMany({
      where: q.q
        ? { OR: [{ companyName: { contains: q.q, mode: "insensitive" } }, { customerCode: { contains: q.q, mode: "insensitive" } }] }
        : {},
      select: {
        id: true,
        customerCode: true,
        companyName: true,
        accountEntries: {
          where: { ...range, entryType: { in: [CustomerAccountEntryType.ORDER, CustomerAccountEntryType.PAYMENT, CustomerAccountEntryType.ADJUSTMENT, CustomerAccountEntryType.REFUND] } },
          select: { entryType: true, direction: true, amount: true, transactionDate: true },
        },
        accountingEntries: {
          where: { ...range, movementType: { not: "PAYMENT_IN" } },
          select: { movementType: true, totalAmount: true, transactionDate: true },
        },
      },
      orderBy: { companyName: "asc" },
    });

    rows = customers.map((customer) => {
      let positive = 0;
      let negative = 0;
      const dates: Date[] = [];

      for (const entry of customer.accountEntries) {
        // Müşteri cari bakiyesi gerçek muhasebe çiftleriyle kapanır:
        // satış ORDER/DEBIT (+) -> tahsilat PAYMENT/CREDIT (-)
        // ürün iadesi ADJUSTMENT/CREDIT (-) -> müşteriye refund REFUND/DEBIT (+)
        if (entry.direction === "DEBIT") positive += entry.amount;
        if (entry.direction === "CREDIT") negative += entry.amount;
        dates.push(entry.transactionDate);
      }
      for (const entry of customer.accountingEntries) {
        if (entry.movementType === "INCOME") positive += entry.totalAmount;
        if (entry.movementType === "EXPENSE" || entry.movementType === "PAYMENT_OUT") negative += entry.totalAmount;
        dates.push(entry.transactionDate);
      }

      const balance = positive - negative;
      return {
        key: customer.id,
        cells: {
          code: customer.customerCode,
          company: customer.companyName,
          positive: money(positive),
          negative: money(-negative),
          balance: <strong className={balance < 0 ? "text-red-700" : "text-green-700"}>{money(balance)}</strong>,
          movementCount: dates.length,
          lastMovement: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))).toLocaleDateString("tr-TR") : "-",
        },
      };
    });
  } else {
    const suppliers = await prisma.supplier.findMany({
      where: q.q ? { name: { contains: q.q, mode: "insensitive" } } : {},
      select: {
        id: true,
        name: true,
        purchaseOrders: {
          where: { status: { notIn: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED] } },
          select: { orderDate: true, totalAmount: true },
        },
        accountingEntries: {
          where: range,
          select: { movementType: true, totalAmount: true, transactionDate: true },
        },
      },
      orderBy: { name: "asc" },
    });

    rows = suppliers.map((supplier) => {
      let positive = 0;
      let negative = 0;
      const dates: Date[] = [];

      for (const purchase of supplier.purchaseOrders) {
        if (!inRange(purchase.orderDate, from, to)) continue;
        negative += purchase.totalAmount; // Gider (-)
        dates.push(purchase.orderDate);
      }
      for (const entry of supplier.accountingEntries) {
        if (entry.movementType === "INCOME" || entry.movementType === "PAYMENT_IN") positive += entry.totalAmount;
        if (entry.movementType === "EXPENSE" || entry.movementType === "PAYMENT_OUT") negative += entry.totalAmount;
        dates.push(entry.transactionDate);
      }

      const balance = positive - negative;
      return {
        key: supplier.id,
        cells: {
          code: `TED-${String(supplier.id).padStart(6, "0")}`,
          company: supplier.name,
          positive: money(positive),
          negative: money(-negative),
          balance: <strong className={balance < 0 ? "text-red-700" : "text-green-700"}>{money(balance)}</strong>,
          movementCount: dates.length,
          lastMovement: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))).toLocaleDateString("tr-TR") : "-",
        },
      };
    });
  }

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Muhasebeleştirme</p>
          <h1 className="text-3xl font-black">Cari Hesap Mutabakatı</h1>
          <p className="mt-2 text-slate-500">Müşteri carisinde satış (+) / tahsilat (-) ve ürün iadesi (-) / iade ödemesi (+) karşılıklı kapanır; açık kalan tutar gerçek cari bakiyeyi gösterir.</p>
        </div>
        <Link href="/admin/accounting" className="h-fit rounded-xl border bg-white px-5 py-3 font-bold">Muhasebeleştirmeye Dön</Link>
      </div>
      <div className="mt-6 flex gap-2">
        <Link href="/admin/accounting/reconciliation?type=CUSTOMER" className={"rounded-xl px-5 py-3 font-bold " + (type === "CUSTOMER" ? "bg-blue-900 text-white" : "bg-white")}>Müşteri Cari</Link>
        <Link href="/admin/accounting/reconciliation?type=SUPPLIER" className={"rounded-xl px-5 py-3 font-bold " + (type === "SUPPLIER" ? "bg-blue-900 text-white" : "bg-white")}>Tedarikçi Cari</Link>
      </div>
      <form className="mt-4 grid gap-3 rounded-2xl bg-slate-100 p-4 md:grid-cols-4">
        <input type="hidden" name="type" value={type} />
        <input name="from" type="date" defaultValue={q.from} className="rounded-xl border p-3" />
        <input name="to" type="date" defaultValue={q.to} className="rounded-xl border p-3" />
        <input name="q" defaultValue={q.q} placeholder="Firma / cari kodu" className="rounded-xl border p-3" />
        <button className="rounded-xl bg-slate-900 font-bold text-white">Filtrele</button>
      </form>
      <div className="mt-5">
        <ConfigurableDataTable storageKey={"account-reconciliation-" + type.toLowerCase() + "-v2"} columns={columns} rows={rows} minWidth="1050px" />
      </div>
    </section>
  );
}
