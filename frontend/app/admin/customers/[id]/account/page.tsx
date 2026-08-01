import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import RefreshButton from "@/components/common/RefreshButton";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { getCustomerAccountSummary } from "@/modules/b2b/services/customer-account.service";

import { createCustomerAccountEntryAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const ENTRY_TYPE_LABELS: Record<CustomerAccountEntryType, string> = {
  OPENING_BALANCE: "Açılış Bakiyesi",
  ORDER: "Sipariş",
  PAYMENT: "Tahsilat",
  ADJUSTMENT: "Düzeltme",
  REFUND: "İade",
  CANCELLATION: "Sipariş İptali",
};

const PAYMENT_METHOD_LABELS: Record<
  CustomerAccountPaymentMethod,
  string
> = {
  MANUAL: "Manuel",
  BANK_TRANSFER: "Havale / EFT",
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  OTHER: "Diğer",
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date) {
  return value.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CustomerAccountPage({
  params,
  searchParams,
}: PageProps) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  const [{ id }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const customerId = Number(id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    notFound();
  }

  const [customer, summary, entries, overdueDebit] =
    await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          customerCode: true,
          companyName: true,
          creditLimit: true,
          paymentTermDays: true,
          isActive: true,
        },
      }),
      getCustomerAccountSummary(customerId),
      prisma.customerAccountEntry.findMany({
        where: { customerId },
        orderBy: [
          { transactionDate: "desc" },
          { id: "desc" },
        ],
        take: 250,
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      }),
      prisma.customerAccountEntry.aggregate({
        where: {
          customerId,
          direction: CustomerAccountEntryDirection.DEBIT,
          dueDate: { lt: new Date() },
        },
        _sum: { amount: true },
      }),
    ]);

  if (!customer) {
    notFound();
  }

  const availableLimit = Math.max(
    0,
    customer.creditLimit - Math.max(0, summary.balance)
  );
  const overdueBalance = Math.max(
    0,
    (overdueDebit._sum.amount ?? 0) - summary.totalCredit
  );
  const createEntry = createCustomerAccountEntryAction.bind(
    null,
    customerId
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <section className="p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            B2B Cari Hesap
          </p>
          <h1 className="mt-1 text-3xl font-black lg:text-4xl">
            {customer.companyName}
          </h1>
          <p className="mt-2 text-slate-500">
            {customer.customerCode} · {customer.paymentTermDays} gün vade · {customer.isActive ? "Aktif" : "Pasif"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <RefreshButton />
          <Link
            href={"/admin/customers/" + customerId + "/users"}
            className="rounded-xl bg-purple-700 px-5 py-3 font-bold text-white hover:bg-purple-600"
          >
            Kullanıcılar
          </Link>
          <Link
            href="/admin/customers"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-50"
          >
            Müşterilere Dön
          </Link>
        </div>
      </div>

      {query.success && (
        <div className="mt-6 rounded-xl bg-green-100 p-4 font-semibold text-green-800">
          {query.success}
        </div>
      )}
      {query.error && (
        <div className="mt-6 rounded-xl bg-red-100 p-4 font-semibold text-red-800">
          {query.error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Cari Bakiye", formatCurrency(summary.balance), summary.balance > 0 ? "text-red-700" : "text-green-700"],
          ["Toplam Borç", formatCurrency(summary.totalDebit), "text-slate-900"],
          ["Toplam Alacak", formatCurrency(summary.totalCredit), "text-green-700"],
          ["Kullanılabilir Limit", formatCurrency(availableLimit), "text-blue-800"],
          ["Vadesi Geçmiş", formatCurrency(overdueBalance), overdueBalance > 0 ? "text-red-700" : "text-green-700"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className={"mt-2 text-2xl font-black " + color}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <p className="font-bold text-blue-950">
            Tanımlı kredi limiti: {formatCurrency(customer.creditLimit)}
          </p>
          <p className="text-sm text-blue-800">
            Vadesi geçmiş bakiye, vadesi dolan borçlardan toplam tahsilat düşülerek hesaplanır.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[420px_1fr]">
        <form action={createEntry} className="h-fit rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black">Yeni Cari Hareket</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tahsilat, açılış bakiyesi veya manuel düzeltme kaydedin.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Hareket Türü</span>
              <select name="entryKind" required className="w-full rounded-xl border p-3">
                <option value="PAYMENT">Tahsilat (Alacak)</option>
                <option value="OPENING_DEBIT">Açılış Borcu</option>
                <option value="OPENING_CREDIT">Açılış Alacağı</option>
                <option value="ADJUSTMENT_DEBIT">Borç Düzeltmesi</option>
                <option value="ADJUSTMENT_CREDIT">Alacak Düzeltmesi</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Tahsilat Yöntemi</span>
              <select name="paymentMethod" defaultValue="MANUAL" className="w-full rounded-xl border p-3">
                <option value="MANUAL">Manuel</option>
                <option value="BANK_TRANSFER">Havale / EFT</option>
                <option value="CASH">Nakit</option>
                <option value="CREDIT_CARD">Kredi Kartı</option>
                <option value="OTHER">Diğer</option>
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Yalnızca Tahsilat hareketinde kullanılır.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <label>
                <span className="mb-2 block text-sm font-bold">Tutar</span>
                <input name="amount" type="number" min="0.01" step="0.01" required className="w-full rounded-xl border p-3" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold">İşlem Tarihi</span>
                <input name="transactionDate" type="date" defaultValue={today} required className="w-full rounded-xl border p-3" />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Vade Tarihi</span>
              <input name="dueDate" type="date" className="w-full rounded-xl border p-3" />
              <span className="mt-1 block text-xs text-slate-500">Borç hareketleri için isteğe bağlıdır.</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Referans No</span>
              <input name="referenceNo" maxLength={100} className="w-full rounded-xl border p-3" placeholder="Dekont veya belge numarası" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Açıklama</span>
              <textarea name="description" rows={3} minLength={3} maxLength={250} required className="w-full resize-none rounded-xl border p-3" placeholder="Hareket açıklaması" />
            </label>
          </div>

          <button type="submit" className="mt-6 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800">
            Cari Hareketi Kaydet
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-xl font-black">Hesap Hareketleri</h2>
            <p className="mt-1 text-sm text-slate-500">Son 250 hareket gösteriliyor.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4">Tarih</th>
                  <th className="p-4">Hareket</th>
                  <th className="p-4">Belge / Sipariş</th>
                  <th className="p-4">Açıklama</th>
                  <th className="p-4 text-right">Borç</th>
                  <th className="p-4 text-right">Alacak</th>
                  <th className="p-4">Vade</th>
                  <th className="p-4">Kayıt Yapan</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap p-4">{formatDate(entry.transactionDate)}</td>
                    <td className="p-4">
                      <span className={"rounded-full px-3 py-1 font-bold " + (entry.direction === CustomerAccountEntryDirection.DEBIT ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                        {ENTRY_TYPE_LABELS[entry.entryType]}
                      </span>
                      {entry.paymentMethod && <p className="mt-2 text-xs text-slate-500">{PAYMENT_METHOD_LABELS[entry.paymentMethod]}</p>}
                    </td>
                    <td className="p-4">
                      {entry.order ? (
                        <Link href={"/admin/orders/" + entry.orderId} className="font-bold text-blue-800 hover:underline">{entry.order.orderNumber}</Link>
                      ) : (
                        entry.referenceNo || "-"
                      )}
                    </td>
                    <td className="max-w-80 p-4">{entry.description}</td>
                    <td className="whitespace-nowrap p-4 text-right font-bold text-red-700">
                      {entry.direction === CustomerAccountEntryDirection.DEBIT ? formatCurrency(entry.amount) : "-"}
                    </td>
                    <td className="whitespace-nowrap p-4 text-right font-bold text-green-700">
                      {entry.direction === CustomerAccountEntryDirection.CREDIT ? formatCurrency(entry.amount) : "-"}
                    </td>
                    <td className="whitespace-nowrap p-4">{entry.dueDate ? formatDate(entry.dueDate) : "-"}</td>
                    <td className="p-4">{entry.createdByUsername || "Sistem"}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-500">Henüz cari hesap hareketi bulunmuyor.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
