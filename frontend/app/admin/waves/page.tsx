import Link from "next/link";
import {
  WavePriority,
  WaveStatus,
  WaveType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getWaveStatusLabel(status: WaveStatus) {
  const labels: Record<WaveStatus, string> = {
    DRAFT: "Taslak",
    READY: "Hazır",
    RELEASED: "Serbest Bırakıldı",
    IN_PROGRESS: "Devam Ediyor",
    PAUSED: "Duraklatıldı",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}

function getWaveStatusClass(status: WaveStatus) {
  const classes: Record<WaveStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    READY: "bg-blue-100 text-blue-700",
    RELEASED: "bg-violet-100 text-violet-700",
    IN_PROGRESS: "bg-indigo-100 text-indigo-700",
    PAUSED: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return classes[status];
}

function getWavePriorityLabel(
  priority: WavePriority
) {
  const labels: Record<WavePriority, string> = {
    LOW: "Düşük",
    NORMAL: "Normal",
    HIGH: "Yüksek",
    CRITICAL: "Kritik",
  };

  return labels[priority];
}

function getWavePriorityClass(
  priority: WavePriority
) {
  const classes: Record<WavePriority, string> = {
    LOW: "bg-slate-100 text-slate-600",
    NORMAL: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  return classes[priority];
}

function getWaveTypeLabel(type: WaveType) {
  const labels: Record<WaveType, string> = {
    STORE_REPLENISHMENT: "Mağaza İkmal",
    CUSTOMER_ORDER: "Müşteri Siparişi",
    ECOMMERCE: "E-Ticaret",
    TRANSFER: "Transfer",
    MIXED: "Karma",
  };

  return labels[type];
}

function calculateOverallProgress(wave: {
  pickingProgress: number;
  transferProgress: number;
  consolidationProgress: number;
  packingProgress: number;
  shippingProgress: number;
}) {
  const progressValues = [
    wave.pickingProgress,
    wave.transferProgress,
    wave.consolidationProgress,
    wave.packingProgress,
    wave.shippingProgress,
  ];

  const total = progressValues.reduce(
    (summary, value) => summary + value,
    0
  );

  return Math.round(
    total / progressValues.length
  );
}

export default async function AdminWavesPage() {
  const [
    waves,
    totalWaveCount,
    draftWaveCount,
    readyWaveCount,
    activeWaveCount,
    completedWaveCount,
    orderSummary,
    assignmentCount,
  ] = await Promise.all([
    prisma.wave.findMany({
      orderBy: [
        {
          priority: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      include: {
        _count: {
          select: {
            orders: true,
            assignments: true,
          },
        },
      },
    }),

    prisma.wave.count(),

    prisma.wave.count({
      where: {
        status: WaveStatus.DRAFT,
      },
    }),

    prisma.wave.count({
      where: {
        status: WaveStatus.READY,
      },
    }),

    prisma.wave.count({
      where: {
        status: {
          in: [
            WaveStatus.RELEASED,
            WaveStatus.IN_PROGRESS,
            WaveStatus.PAUSED,
          ],
        },
      },
    }),

    prisma.wave.count({
      where: {
        status: WaveStatus.COMPLETED,
      },
    }),

    prisma.wave.aggregate({
      _sum: {
        plannedOrderCount: true,
        plannedLineCount: true,
        plannedQuantity: true,
        completedQuantity: true,
      },
    }),

    prisma.waveAssignment.count({
      where: {
        status: {
          in: ["ASSIGNED", "ACTIVE", "WAITING"],
        },
      },
    }),
  ]);

  const totalPlannedOrderCount =
    orderSummary._sum.plannedOrderCount ?? 0;

  const totalPlannedLineCount =
    orderSummary._sum.plannedLineCount ?? 0;

  const totalPlannedQuantity =
    orderSummary._sum.plannedQuantity ?? 0;

  const totalCompletedQuantity =
    orderSummary._sum.completedQuantity ?? 0;

  const completionRate =
    totalPlannedQuantity > 0
      ? Math.round(
          (totalCompletedQuantity /
            totalPlannedQuantity) *
            100
        )
      : 0;

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            WMS Operasyon Yönetimi
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-900">
            Wave Management
          </h1>

          <p className="mt-3 text-slate-500">
            Sipariş toplama, paketleme ve sevkiyat
            operasyonlarını dalga bazında yönetin.
          </p>
        </div>

        <Link
          href="/admin/waves/new"
          className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white shadow transition hover:bg-blue-800"
        >
          + Yeni Wave Oluştur
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Toplam Wave
          </p>

          <p className="mt-3 text-4xl font-bold text-slate-900">
            {formatNumber(totalWaveCount)}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Taslak
          </p>

          <p className="mt-3 text-4xl font-bold text-slate-700">
            {formatNumber(draftWaveCount)}
          </p>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Hazır
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-800">
            {formatNumber(readyWaveCount)}
          </p>
        </article>

        <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-indigo-700">
            Aktif Wave
          </p>

          <p className="mt-3 text-4xl font-bold text-indigo-800">
            {formatNumber(activeWaveCount)}
          </p>
        </article>

        <article className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-green-700">
            Tamamlanan
          </p>

          <p className="mt-3 text-4xl font-bold text-green-800">
            {formatNumber(completedWaveCount)}
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-violet-700">
            Aktif Operatör
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-800">
            {formatNumber(assignmentCount)}
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-slate-900 p-6 text-white shadow">
          <p className="text-sm font-semibold text-slate-300">
            Planlanan Sipariş
          </p>

          <p className="mt-3 text-4xl font-bold">
            {formatNumber(totalPlannedOrderCount)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold text-slate-500">
            Planlanan Satır
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {formatNumber(totalPlannedLineCount)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold text-slate-500">
            Planlanan Miktar
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-600">
            {formatNumber(totalPlannedQuantity)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold text-slate-500">
            Genel Tamamlanma
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-4xl font-bold text-green-700">
              %{completionRate}
            </p>

            <p className="text-sm text-slate-500">
              {formatNumber(
                totalCompletedQuantity
              )}{" "}
              tamamlandı
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-600"
              style={{
                width: `${Math.min(
                  completionRate,
                  100
                )}%`,
              }}
            />
          </div>
        </article>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold">
              Wave Listesi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Oluşturulan tüm operasyon dalgaları.
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            {formatNumber(waves.length)} kayıt
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">Wave No</th>
                <th className="p-4">Wave Adı</th>
                <th className="p-4">Tip</th>
                <th className="p-4">Öncelik</th>
                <th className="p-4">Durum</th>
                <th className="p-4">Sipariş</th>
                <th className="p-4">Satır</th>
                <th className="p-4">Miktar</th>
                <th className="p-4">Operatör</th>
                <th className="p-4">İlerleme</th>
                <th className="p-4">Başlangıç</th>
                <th className="p-4">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {waves.map((wave) => {
                const overallProgress =
                  calculateOverallProgress(wave);

                return (
                  <tr
                    key={wave.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap p-4">
                      <p className="font-bold text-blue-900">
                        {wave.waveNo}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(wave.createdAt)}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-semibold text-slate-800">
                        {wave.name || "İsimsiz Wave"}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                        {wave.notes ||
                          "Operasyon notu bulunmuyor."}
                      </p>
                    </td>

                    <td className="whitespace-nowrap p-4">
                      {getWaveTypeLabel(wave.type)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getWavePriorityClass(
                          wave.priority
                        )}`}
                      >
                        {getWavePriorityLabel(
                          wave.priority
                        )}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${getWaveStatusClass(
                          wave.status
                        )}`}
                      >
                        {getWaveStatusLabel(
                          wave.status
                        )}
                      </span>
                    </td>

                    <td className="p-4 font-semibold">
                      {formatNumber(
                        wave.plannedOrderCount ||
                          wave._count.orders
                      )}
                    </td>

                    <td className="p-4 font-semibold">
                      {formatNumber(
                        wave.plannedLineCount
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-semibold">
                        {formatNumber(
                          wave.completedQuantity
                        )}
                        {" / "}
                        {formatNumber(
                          wave.plannedQuantity
                        )}
                      </p>
                    </td>

                    <td className="p-4">
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                        {wave._count.assignments}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="w-36">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            %{overallProgress}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-800"
                            style={{
                              width: `${Math.min(
                                overallProgress,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm">
                      {formatDate(
                        wave.plannedStartAt
                      )}
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/admin/waves/${wave.id}`}
                        className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {waves.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="p-12 text-center"
                  >
                    <div className="text-5xl">
                      🌊
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-slate-800">
                      Henüz Wave Bulunmuyor
                    </h3>

                    <p className="mt-2 text-slate-500">
                      İlk operasyon dalganızı
                      oluşturarak başlayın.
                    </p>

                    <Link
                      href="/admin/waves/new"
                      className="mt-5 inline-flex rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800"
                    >
                      + İlk Wave’i Oluştur
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}