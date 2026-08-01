import {
  OrderStatus,
  Prisma,
  UserType,
} from "@prisma/client";
import Link from "next/link";

import Header from "@/components/layout/Header";
import { redirect } from "next/navigation";

import RefreshButton from "@/components/common/RefreshButton";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CustomerOrdersPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    status?: string | string[];
    orderNumber?: string;
  }>;
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

const STATUS_CLASSES: Record<OrderStatus, string> = {
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

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function normalizeText(value: string | undefined) {
  return String(value ?? "").trim();
}

function parseIstanbulDate(
  value: string,
  endOfRange = false
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const calendarCheck = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day + (endOfRange ? 1 : 0),
      -3,
      0,
      0,
      0
    )
  );
}

function isOrderStatus(value: string): value is OrderStatus {
  return Object.values(OrderStatus).includes(
    value as OrderStatus
  );
}

export default async function CustomerOrdersPage({
  searchParams,
}: CustomerOrdersPageProps) {
  const user = await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !== UserType.CUSTOMER ||
    !user.customerId ||
    !user.customer?.isActive
  ) {
    redirect("/customer-login");
  }

  const query = await searchParams;
  const startDate = normalizeText(query.startDate);
  const endDate = normalizeText(query.endDate);
  const statusValues = Array.isArray(query.status)
    ? query.status
    : query.status
      ? [query.status]
      : [];
  const selectedStatuses = statusValues.filter(
    isOrderStatus
  );
  const orderNumber = normalizeText(query.orderNumber).slice(0, 80);
  const parsedStartDate = parseIstanbulDate(startDate);
  const parsedEndDate = parseIstanbulDate(endDate, true);
  const hasFilters = Boolean(
    startDate ||
      endDate ||
      selectedStatuses.length > 0 ||
      orderNumber
  );

  const where: Prisma.OrderWhereInput = {
    customerId: user.customerId,
    ...(selectedStatuses.length > 0
      ? {
          status: {
            in: selectedStatuses,
          },
        }
      : {}),
    ...(orderNumber
      ? {
          orderNumber: {
            contains: orderNumber,
            mode: "insensitive",
          },
        }
      : {}),
    ...(parsedStartDate || parsedEndDate
      ? {
          createdAt: {
            ...(parsedStartDate ? { gte: parsedStartDate } : {}),
            ...(parsedEndDate ? { lt: parsedEndDate } : {}),
          },
        }
      : {}),
  };

  const [orders, filteredSummary] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.order.aggregate({
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);

  return (
    <>
      <Header />

      <main className="mx-auto min-h-screen max-w-[1180px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">
            Kurumsal Hesabım
          </p>
          <h1 className="mt-1 text-2xl font-black">
            Siparişlerim
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <RefreshButton />
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Hesap Menüsü
          </Link>
        </div>
      </div>

      <form
        action="/account/orders"
        method="get"
        className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Sipariş Sorgulama
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tarih, durum veya sipariş numarasına göre filtreleyin.
            </p>
          </div>
          {hasFilters && (
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">
              Filtre uygulanıyor
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Başlangıç Tarihi
            </span>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Bitiş Tarihi
            </span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <fieldset className="rounded-lg border border-slate-300 bg-white p-3 md:col-span-2 xl:col-span-2">
            <legend className="px-1 text-sm font-bold text-slate-700">
              Sipariş Durumları
            </legend>
            <p className="mb-3 text-xs text-slate-500">
              Birden fazla durum seçebilirsiniz. Seçim yapılmazsa tüm durumlar gösterilir.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(OrderStatus).map((status) => (
                <label
                  key={status}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    name="status"
                    value={status}
                    defaultChecked={selectedStatuses.includes(status)}
                    className="h-4 w-4 accent-blue-900"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    {STATUS_LABELS[status]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Sipariş Numarası
            </span>
            <input
              type="search"
              name="orderNumber"
              defaultValue={orderNumber}
              maxLength={80}
              placeholder="Örneğin: B2B2026..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-lg bg-[#EF4B23] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#D83D18]"
          >
            Filtrele
          </button>
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Temizle
          </Link>
        </div>
      </form>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#202B38] p-4 text-white shadow">
          <p className="text-sm font-semibold text-blue-200">
            Bulunan Sipariş
          </p>
          <p className="mt-1 text-2xl font-black">
            {filteredSummary._count.id}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-700 p-4 text-white shadow">
          <p className="text-sm font-semibold text-emerald-100">
            Filtrelenen Toplam
          </p>
          <p className="mt-1 text-2xl font-black">
            {formatCurrency(filteredSummary._sum.totalAmount ?? 0)} ₺
          </p>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500">
              {hasFilters
                ? "Seçilen ölçütlere uygun sipariş bulunamadı."
                : "Henüz siparişiniz bulunmuyor."}
            </p>
            {hasFilters ? (
              <Link
                href="/account/orders"
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-6 py-3 font-bold text-white"
              >
                Filtreleri Temizle
              </Link>
            ) : (
              <Link
                href="/products"
                className="mt-5 inline-flex rounded-xl bg-blue-900 px-6 py-3 font-bold text-white"
              >
                Ürünleri İncele
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#202B38] text-white">
                <tr>
                  <th className="px-5 py-3">Sipariş No</th>
                  <th className="px-5 py-3">Tarih</th>
                  <th className="px-5 py-3">Satır</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={"/account/orders/" + order.id}
                        className="font-bold text-blue-900 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {order._count.items}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-3 py-1 font-bold " +
                          STATUS_CLASSES[order.status]
                        }
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                      {formatCurrency(order.totalAmount)} ₺
                    </td>
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
