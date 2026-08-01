import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  OrderStatus,
  UserType,
} from "@prisma/client";
import Link from "next/link";

import Header from "@/components/layout/Header";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { getCustomerAccountSummary } from "@/modules/b2b/services/customer-account.service";

import { customerLogoutAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Kurumsal Dashboard | ETKEN Ofis",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Taslak",
  PENDING: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  PICKING: "Toplanıyor",
  PACKING: "Paketleniyor",
  READY_TO_SHIP: "Sevke Hazır",
  SHIPPED: "Sevk Edildi",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

const ACCOUNT_TYPE_LABELS: Record<
  CustomerAccountEntryType,
  string
> = {
  OPENING_BALANCE: "Açılış Bakiyesi",
  ORDER: "Sipariş Borcu",
  PAYMENT: "Tahsilat",
  ADJUSTMENT: "Hesap Düzeltmesi",
  REFUND: "İade",
  CANCELLATION: "Sipariş İptali",
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

function getIstanbulMonthStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );
  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  return new Date(
    Date.UTC(year, month - 1, 1, -3, 0, 0, 0)
  );
}

function getStatusClass(status: OrderStatus) {
  const classes: Record<OrderStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    PENDING: "bg-orange-100 text-orange-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PREPARING: "bg-violet-100 text-violet-700",
    PICKING: "bg-indigo-100 text-indigo-700",
    PACKING: "bg-cyan-100 text-cyan-700",
    READY_TO_SHIP: "bg-teal-100 text-teal-700",
    SHIPPED: "bg-sky-100 text-sky-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return classes[status];
}

export default async function AccountPage() {
  const user = await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !== UserType.CUSTOMER ||
    !user.customer ||
    !user.customer.isActive ||
    !user.customerId
  ) {
    redirect("/customer-login");
  }

  const customerId = user.customerId;
  const monthStart = getIstanbulMonthStart();
  const closedStatuses: OrderStatus[] = [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];

  const [
    customer,
    accountSummary,
    orderSummary,
    monthlyOrderSummary,
    openOrderCount,
    recentOrders,
    topProducts,
    recentAccountEntries,
    overdueDebit,
  ] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        companyName: true,
        customerCode: true,
        creditLimit: true,
        paymentTermDays: true,
        discountRate: true,
      },
    }),
    getCustomerAccountSummary(customerId),
    prisma.order.aggregate({
      where: {
        customerId,
        status: { not: OrderStatus.CANCELLED },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        customerId,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: monthStart },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: {
        customerId,
        status: { notIn: closedStatuses },
      },
    }),
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productCode", "productName"],
      where: {
        order: {
          customerId,
          status: { not: OrderStatus.CANCELLED },
        },
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: { quantity: "desc" },
      },
      take: 5,
    }),
    prisma.customerAccountEntry.findMany({
      where: { customerId },
      orderBy: [
        { transactionDate: "desc" },
        { id: "desc" },
      ],
      take: 6,
      select: {
        id: true,
        direction: true,
        entryType: true,
        amount: true,
        description: true,
        transactionDate: true,
        order: {
          select: {
            id: true,
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
    redirect("/customer-login");
  }

  const totalSpend = orderSummary._sum.totalAmount ?? 0;
  const monthlySpend =
    monthlyOrderSummary._sum.totalAmount ?? 0;
  const positiveBalance = Math.max(0, accountSummary.balance);
  const availableLimit = Math.max(
    0,
    customer.creditLimit - positiveBalance
  );
  const overdueBalance = Math.max(
    0,
    (overdueDebit._sum.amount ?? 0) -
      accountSummary.totalCredit
  );
  const creditUsageRate =
    customer.creditLimit > 0
      ? Math.min(
          100,
          (positiveBalance / customer.creditLimit) * 100
        )
      : 0;

  return (
    <>
      <Header />

      <main className="mx-auto min-h-screen max-w-[1180px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">
            Kurumsal Dashboard
          </p>
          <h1 className="mt-1 text-lg font-black text-slate-900 lg:text-2xl">
            {customer.companyName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Müşteri kodu: {customer.customerCode} · Vade: {customer.paymentTermDays} gün · İskonto: %{customer.discountRate.toLocaleString("tr-TR")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/account"
            className="rounded-lg bg-[#EF4B23] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#D83D18]"
          >
            Hesap Menüsü
          </Link>
          <Link
            href="/account/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Yenile
          </Link>
          <form action={customerLogoutAction}>
            <button
              type="submit"
              className="rounded-lg bg-[#202B38] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Güvenli Çıkış
            </button>
          </form>
        </div>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-cyan-700 p-4 text-white shadow">
          <p className="text-sm font-semibold text-cyan-100">Toplam Sipariş</p>
          <p className="mt-1 text-2xl font-black">{orderSummary._count.id}</p>
          <p className="mt-2 text-sm text-cyan-100">İptal siparişler hariç</p>
        </div>
        <div className="rounded-xl bg-amber-500 p-4 text-slate-950 shadow">
          <p className="text-sm font-semibold text-amber-950">Toplam Satın Alma</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(totalSpend)}</p>
          <p className="mt-2 text-sm text-amber-950">Tüm zamanlar</p>
        </div>
        <div className="rounded-xl bg-rose-600 p-4 text-white shadow">
          <p className="text-sm font-semibold text-rose-100">Bu Ay</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(monthlySpend)}</p>
          <p className="mt-2 text-sm text-rose-100">{monthlyOrderSummary._count.id} sipariş</p>
        </div>
        <div className="rounded-xl bg-teal-700 p-4 text-white shadow">
          <p className="text-sm font-semibold text-teal-100">Açık Sipariş</p>
          <p className="mt-1 text-2xl font-black">{openOrderCount}</p>
          <p className="mt-2 text-sm text-teal-100">Operasyonu devam eden</p>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">Finansal Durum</p>
            <h2 className="mt-1 text-2xl font-black">Cari Hesap Özeti</h2>
          </div>
          <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            Tanımlı limit: {formatCurrency(customer.creditLimit)}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-700">Cari Bakiye</p>
            <p className="mt-1 text-lg font-black text-red-800">{formatCurrency(accountSummary.balance)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-500">Toplam Borç</p>
            <p className="mt-1 text-lg font-black">{formatCurrency(accountSummary.totalDebit)}</p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-3">
            <p className="text-sm font-semibold text-green-700">Toplam Ödeme</p>
            <p className="mt-1 text-lg font-black text-green-800">{formatCurrency(accountSummary.totalCredit)}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-700">Kullanılabilir Limit</p>
            <p className="mt-1 text-lg font-black text-blue-900">{formatCurrency(availableLimit)}</p>
          </div>
          <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
            <p className="text-sm font-semibold text-orange-700">Vadesi Geçmiş</p>
            <p className="mt-1 text-lg font-black text-orange-800">{formatCurrency(overdueBalance)}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm font-semibold text-slate-600">
            <span>Kredi limiti kullanımı</span>
            <span>%{creditUsageRate.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={"h-full rounded-full " + (creditUsageRate >= 90 ? "bg-red-600" : creditUsageRate >= 70 ? "bg-orange-500" : "bg-blue-700")}
              style={{ width: creditUsageRate + "%" }}
            />
          </div>
          {accountSummary.totalDebit === 0 && accountSummary.totalCredit === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Cari hesap altyapısı hazırdır. Henüz finansal hareket kaydedilmediği için bakiye değerleri sıfır görünür.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-black">En Çok Satın Alınan Ürünler</h2>
              <p className="mt-1 text-sm text-slate-500">İptal edilmeyen siparişlere göre</p>
            </div>
            <Link href="/products" className="font-bold text-blue-900 hover:underline">Ürünlere Git</Link>
          </div>
          <div className="divide-y">
            {topProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-900">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <Link href={"/products/" + product.productCode} className="font-bold text-slate-900 hover:text-blue-800 hover:underline">{product.productName}</Link>
                  <p className="mt-1 text-sm text-slate-500">Ürün kodu: {product.productCode}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-900">{product._sum.quantity ?? 0} adet</p>
                  <p className="mt-1 text-sm text-slate-500">{formatCurrency(product._sum.lineTotal ?? 0)}</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="p-8 text-center text-slate-500">Satın alma verisi henüz oluşmadı.</p>}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-black">Son Cari Hareketler</h2>
              <p className="mt-1 text-sm text-slate-500">Borç ve ödeme hareketleri</p>
            </div>
          </div>
          <div className="divide-y">
            {recentAccountEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3">
                <div className={"mt-1 h-3 w-3 shrink-0 rounded-full " + (entry.direction === CustomerAccountEntryDirection.DEBIT ? "bg-red-500" : "bg-green-500")} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{ACCOUNT_TYPE_LABELS[entry.entryType]}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{entry.description}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(entry.transactionDate)}</p>
                </div>
                <div className="text-right">
                  <p className={"font-black " + (entry.direction === CustomerAccountEntryDirection.DEBIT ? "text-red-700" : "text-green-700")}>
                    {entry.direction === CustomerAccountEntryDirection.DEBIT ? "+ " : "- "}{formatCurrency(entry.amount)}
                  </p>
                  {entry.order && <Link href={"/account/orders/" + entry.order.id} className="mt-1 block text-xs font-bold text-blue-800 hover:underline">{entry.order.orderNumber}</Link>}
                </div>
              </div>
            ))}
            {recentAccountEntries.length === 0 && <p className="p-8 text-center text-slate-500">Henüz cari hesap hareketi bulunmuyor.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-lg font-black">Son Siparişler</h2>
            <p className="mt-1 text-sm text-slate-500">Güncel sipariş ve operasyon durumları</p>
          </div>
          <Link href="/account/orders" className="font-bold text-blue-900 hover:underline">Tüm Siparişleri Gör</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-8 text-slate-500">Henüz siparişiniz bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">Sipariş No</th>
                  <th className="px-5 py-3">Tarih</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3"><Link href={"/account/orders/" + order.id} className="font-bold text-blue-900 hover:underline">{order.orderNumber}</Link></td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3"><span className={"rounded-full px-3 py-1 font-bold " + getStatusClass(order.status)}>{STATUS_LABELS[order.status]}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      </main>
    </>
  );
}
