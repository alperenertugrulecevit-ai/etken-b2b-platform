import Link from "next/link";
import {
  WaveStatus,
} from "@prisma/client";
import { notFound } from "next/navigation";

import {
  addOrdersToWaveAction,
  removeOrdersFromWaveAction,
} from "../order-actions";

import {
  getWaveOrderManagementData,
} from "@/lib/wms/wave-order-service";

type WaveOrdersPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    search?: string;
    success?: string;
    error?: string;
  }>;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getWaveStatusLabel(
  status: WaveStatus
) {
  const labels: Record<
    WaveStatus,
    string
  > = {
    DRAFT: "Taslak",
    READY: "Hazır",
    RELEASED: "Operasyona Açık",
    IN_PROGRESS: "Devam Ediyor",
    PAUSED: "Duraklatıldı",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}

function getWaveStatusClass(
  status: WaveStatus
) {
  const classes: Record<
    WaveStatus,
    string
  > = {
    DRAFT:
      "border-slate-200 bg-slate-100 text-slate-700",

    READY:
      "border-blue-200 bg-blue-100 text-blue-800",

    RELEASED:
      "border-violet-200 bg-violet-100 text-violet-800",

    IN_PROGRESS:
      "border-indigo-200 bg-indigo-100 text-indigo-800",

    PAUSED:
      "border-orange-200 bg-orange-100 text-orange-800",

    COMPLETED:
      "border-green-200 bg-green-100 text-green-800",

    CANCELLED:
      "border-red-200 bg-red-100 text-red-800",
  };

  return classes[status];
}

export default async function WaveOrdersPage({
  params,
  searchParams,
}: WaveOrdersPageProps) {
  const { id } = await params;

  const query = await searchParams;

  const search =
    typeof query.search === "string"
      ? query.search
      : "";

  const data =
    await getWaveOrderManagementData(
      id,
      search
    );

  if (!data) {
    notFound();
  }

  const { wave, orderPool, assignedOrders } =
    data;

  const waveIsEditable =
    wave.status === WaveStatus.DRAFT ||
    wave.status === WaveStatus.READY;

  return (
    <section className="min-h-screen p-8 xl:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Wave Sipariş Yönetimi
            </p>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getWaveStatusClass(
                wave.status
              )}`}
            >
              {getWaveStatusLabel(
                wave.status
              )}
            </span>
          </div>

          <h1 className="mt-3 text-4xl font-bold text-slate-950">
            {wave.waveNo}
          </h1>

          <p className="mt-2 text-lg font-semibold text-slate-700">
            {wave.name ||
              "İsimsiz Wave"}
          </p>

          <p className="mt-2 text-slate-500">
            Uygun siparişleri seçerek Wave’e
            ekleyebilir veya henüz işleme
            başlanmamış siparişleri Wave’den
            çıkarabilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/waves/${wave.id}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Wave Detayı
          </Link>

          <Link
            href="/admin/waves"
            className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
          >
            Wave Listesi
          </Link>
        </div>
      </header>

      {query.success && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
          ✓ {query.success}
        </div>
      )}

      {query.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
          ⚠ {query.error}
        </div>
      )}

      {!waveIsEditable && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900">
          <p className="font-bold">
            Sipariş değişikliği kapalı
          </p>

          <p className="mt-1 text-sm">
            Yalnızca Taslak veya Hazır
            durumundaki Wave’lere sipariş
            eklenebilir ve çıkarılabilir.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-semibold text-blue-700">
            Planlanan Sipariş
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-950">
            {formatNumber(
              wave.plannedOrderCount
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-sm font-semibold text-violet-700">
            Planlanan Satır
          </p>

          <p className="mt-2 text-3xl font-bold text-violet-950">
            {formatNumber(
              wave.plannedLineCount
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-semibold text-orange-700">
            Planlanan Miktar
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-950">
            {formatNumber(
              wave.plannedQuantity
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-700">
            Tamamlanan Miktar
          </p>

          <p className="mt-2 text-3xl font-bold text-green-950">
            {formatNumber(
              wave.completedQuantity
            )}
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-2">
        {/* SİPARİŞ HAVUZU */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Uygun Sipariş Havuzu
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Durumu APPROVED olan ve başka
                  aktif bir Wave’e bağlı olmayan
                  siparişler.
                </p>
              </div>

              <span className="rounded-xl bg-blue-100 px-4 py-2 font-bold text-blue-800">
                {formatNumber(
                  orderPool.length
                )}{" "}
                sipariş
              </span>
            </div>

            <form
              method="GET"
              className="mt-5 flex gap-3"
            >
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Sipariş no, müşteri kodu veya müşteri adı..."
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
              >
                Ara
              </button>

              {search && (
                <Link
                  href={`/admin/waves/${wave.id}/orders`}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Temizle
                </Link>
              )}
            </form>
          </div>

          <form
            action={addOrdersToWaveAction}
          >
            <input
              type="hidden"
              name="waveId"
              value={wave.id}
            />

            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-14 px-5 py-4">
                      Seç
                    </th>

                    <th className="px-4 py-4">
                      Sipariş
                    </th>

                    <th className="px-4 py-4">
                      Müşteri
                    </th>

                    <th className="px-4 py-4 text-right">
                      Satır
                    </th>

                    <th className="px-4 py-4 text-right">
                      Miktar
                    </th>

                    <th className="px-4 py-4">
                      Talep Tarihi
                    </th>

                    <th className="px-4 py-4 text-right">
                      Tutar
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {orderPool.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/60"
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          name="orderIds"
                          value={order.id}
                          disabled={
                            !waveIsEditable
                          }
                          className="h-5 w-5 rounded border-slate-300"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-blue-900">
                          {order.orderNumber}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(
                            order.orderDate
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {order.customerName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            order.customerCode
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatNumber(
                          order.lineCount
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {formatNumber(
                          order.plannedQuantity
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(
                          order.requestedDate
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-slate-800">
                        {formatCurrency(
                          order.totalAmount
                        )}
                      </td>
                    </tr>
                  ))}

                  {orderPool.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center"
                      >
                        <div className="text-4xl">
                          🔍
                        </div>

                        <p className="mt-3 font-bold text-slate-700">
                          Uygun sipariş bulunamadı
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Siparişlerin APPROVED
                          durumunda olduğunu kontrol
                          edin.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-5">
              <button
                type="submit"
                disabled={
                  !waveIsEditable ||
                  orderPool.length === 0
                }
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Seçilen Siparişleri Wave’e Ekle
              </button>
            </div>
          </form>
        </section>

        {/* WAVE SİPARİŞLERİ */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Wave İçindeki Siparişler
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Wave’e atanmış ve operasyonda
                  kullanılacak siparişler.
                </p>
              </div>

              <span className="rounded-xl bg-violet-100 px-4 py-2 font-bold text-violet-800">
                {formatNumber(
                  assignedOrders.length
                )}{" "}
                sipariş
              </span>
            </div>
          </div>

          <form
            action={
              removeOrdersFromWaveAction
            }
          >
            <input
              type="hidden"
              name="waveId"
              value={wave.id}
            />

            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-14 px-5 py-4">
                      Seç
                    </th>

                    <th className="px-4 py-4">
                      Sipariş
                    </th>

                    <th className="px-4 py-4">
                      Müşteri
                    </th>

                    <th className="px-4 py-4 text-right">
                      Satır
                    </th>

                    <th className="px-4 py-4 text-right">
                      Planlanan
                    </th>

                    <th className="px-4 py-4 text-right">
                      Tamamlanan
                    </th>

                    <th className="px-4 py-4">
                      Durum
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {assignedOrders.map(
                    (waveOrder) => {
                      const cannotRemove =
                        !waveIsEditable ||
                        waveOrder.isCompleted ||
                        waveOrder.completedQuantity >
                          0;

                      return (
                        <tr
                          key={
                            waveOrder.waveOrderId
                          }
                          className="hover:bg-violet-50/50"
                        >
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              name="waveOrderIds"
                              value={
                                waveOrder.waveOrderId
                              }
                              disabled={
                                cannotRemove
                              }
                              className="h-5 w-5 rounded border-slate-300"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-bold text-blue-900">
                              {
                                waveOrder.orderNumber
                              }
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800">
                              {waveOrder.customerName ||
                                "Belirtilmedi"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {waveOrder.customerCode ||
                                "-"}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-right font-semibold">
                            {formatNumber(
                              waveOrder.lineCount
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-slate-900">
                            {formatNumber(
                              waveOrder.plannedQuantity
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-green-700">
                            {formatNumber(
                              waveOrder.completedQuantity
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {waveOrder.isCompleted ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                                Tamamlandı
                              </span>
                            ) : waveOrder.completedQuantity >
                              0 ? (
                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                                Devam Ediyor
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Bekliyor
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}

                  {assignedOrders.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center"
                      >
                        <div className="text-4xl">
                          🛒
                        </div>

                        <p className="mt-3 font-bold text-slate-700">
                          Wave’e henüz sipariş
                          eklenmedi
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Sol taraftaki havuzdan
                          sipariş seçebilirsiniz.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-5">
              <button
                type="submit"
                disabled={
                  !waveIsEditable ||
                  assignedOrders.length === 0
                }
                className="w-full rounded-xl bg-red-100 px-5 py-3 font-bold text-red-800 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                Seçilen Siparişleri Wave’den Çıkar
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}