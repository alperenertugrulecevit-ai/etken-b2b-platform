import Link from "next/link";
import {
  WavePriority,
  WaveStatus,
  WaveType,
} from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateWaveStatusAction } from "./actions";

type WaveDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Belirtilmedi";
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

function getWaveStatusDescription(
  status: WaveStatus
) {
  const descriptions: Record<
    WaveStatus,
    string
  > = {
    DRAFT:
      "Wave hazırlık aşamasındadır. Sipariş ve operatör atamaları yapılabilir.",

    READY:
      "Wave operasyon için hazırlanmıştır ancak henüz serbest bırakılmamıştır.",

    RELEASED:
      "Wave RF operasyonlarına ve operatörlere açılmıştır.",

    IN_PROGRESS:
      "Wave içerisindeki depo operasyonları aktif olarak devam etmektedir.",

    PAUSED:
      "Wave operasyonları geçici olarak durdurulmuştur.",

    COMPLETED:
      "Wave içerisindeki operasyonlar tamamlanmıştır.",

    CANCELLED:
      "Wave iptal edilmiştir ve operasyonda kullanılamaz.",
  };

  return descriptions[status];
}

function getWaveStatusClass(status: WaveStatus) {
  const classes: Record<WaveStatus, string> = {
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

function getWavePriorityLabel(
  priority: WavePriority
) {
  const labels: Record<
    WavePriority,
    string
  > = {
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
  const classes: Record<
    WavePriority,
    string
  > = {
    LOW:
      "bg-slate-100 text-slate-700",

    NORMAL:
      "bg-blue-100 text-blue-800",

    HIGH:
      "bg-orange-100 text-orange-800",

    CRITICAL:
      "bg-red-100 text-red-800",
  };

  return classes[priority];
}

function getWaveTypeLabel(type: WaveType) {
  const labels: Record<WaveType, string> = {
    STORE_REPLENISHMENT: "Mağaza İkmal",
    CUSTOMER_ORDER: "Müşteri Siparişi",
    ECOMMERCE: "E-Ticaret",
    TRANSFER: "Depolararası Transfer",
    MIXED: "Karma Wave",
  };

  return labels[type];
}

function calculateCompletionRate(
  plannedQuantity: number,
  completedQuantity: number
) {
  if (plannedQuantity <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (completedQuantity /
        plannedQuantity) *
        100
    )
  );
}

function calculateOverallProgress(wave: {
  pickingProgress: number;
  transferProgress: number;
  consolidationProgress: number;
  packingProgress: number;
  shippingProgress: number;
}) {
  const values = [
    wave.pickingProgress,
    wave.transferProgress,
    wave.consolidationProgress,
    wave.packingProgress,
    wave.shippingProgress,
  ];

  const total = values.reduce(
    (summary, value) => summary + value,
    0
  );

  return Math.round(total / values.length);
}

type StatusActionButtonProps = {
  waveId: string;
  targetStatus: WaveStatus;
  label: string;
  className: string;
};

function StatusActionButton({
  waveId,
  targetStatus,
  label,
  className,
}: StatusActionButtonProps) {
  return (
    <form action={updateWaveStatusAction}>
      <input
        type="hidden"
        name="waveId"
        value={waveId}
      />

      <input
        type="hidden"
        name="targetStatus"
        value={targetStatus}
      />

      <button
        type="submit"
        className={`rounded-xl px-5 py-3 font-bold transition ${className}`}
      >
        {label}
      </button>
    </form>
  );
}

export default async function WaveDetailPage({
  params,
}: WaveDetailPageProps) {
  const { id } = await params;

  const wave = await prisma.wave.findUnique({
    where: {
      id,
    },

    include: {
      _count: {
        select: {
          orders: true,
          assignments: true,
        },
      },
    },
  });

  if (!wave) {
    notFound();
  }

  const overallProgress =
    calculateOverallProgress(wave);

  const quantityCompletionRate =
    calculateCompletionRate(
      wave.plannedQuantity,
      wave.completedQuantity
    );

  const remainingQuantity = Math.max(
    0,
    wave.plannedQuantity -
      wave.completedQuantity
  );

  const progressItems = [
    {
      label: "Toplama",
      value: wave.pickingProgress,
      icon: "🧺",
      className:
        "bg-indigo-600",
    },
    {
      label: "Transfer",
      value: wave.transferProgress,
      icon: "🔄",
      className:
        "bg-violet-600",
    },
    {
      label: "Konsolidasyon",
      value: wave.consolidationProgress,
      icon: "🧩",
      className:
        "bg-amber-600",
    },
    {
      label: "Paketleme",
      value: wave.packingProgress,
      icon: "📦",
      className:
        "bg-cyan-600",
    },
    {
      label: "Sevkiyat",
      value: wave.shippingProgress,
      icon: "🚚",
      className:
        "bg-sky-600",
    },
  ];

  return (
    <section className="min-h-screen p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Wave Management
            </p>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getWaveStatusClass(
                wave.status
              )}`}
            >
              {getWaveStatusLabel(wave.status)}
            </span>
          </div>

          <h1 className="mt-3 text-4xl font-bold text-slate-950">
            {wave.waveNo}
          </h1>

          <p className="mt-2 text-xl font-semibold text-slate-700">
            {wave.name || "İsimsiz Wave"}
          </p>

          <p className="mt-2 max-w-3xl text-slate-500">
            {getWaveStatusDescription(
              wave.status
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
             <Link
    href={`/admin/waves/${wave.id}/orders`}
    className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-600"
  >
    Sipariş Yönetimi
  </Link>
  
  <Link
  href={`/admin/waves/${wave.id}/assignments`}
  className="rounded-xl bg-violet-700 px-5 py-3 font-bold text-white transition hover:bg-violet-600"
>
  Operatör Yönetimi
</Link>
          <Link
            href="/admin/waves"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Wave Listesi
          </Link>

          <Link
            href="/admin/wms-dashboard"
            className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
          >
            WMS Dashboard
          </Link>
        </div>
      </div>

      {/* DURUM İŞLEMLERİ */}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Wave Operasyon Kontrolü
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Wave durumunu operasyon akışına göre
              yönetin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {wave.status ===
              WaveStatus.DRAFT && (
              <>
                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.READY
                  }
                  label="Wave’i Hazırla"
                  className="bg-blue-700 text-white hover:bg-blue-600"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.CANCELLED
                  }
                  label="İptal Et"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                />
              </>
            )}

            {wave.status ===
              WaveStatus.READY && (
              <>
                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.RELEASED
                  }
                  label="Operasyona Aç"
                  className="bg-violet-700 text-white hover:bg-violet-600"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.DRAFT
                  }
                  label="Taslağa Al"
                  className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.CANCELLED
                  }
                  label="İptal Et"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                />
              </>
            )}

            {wave.status ===
              WaveStatus.RELEASED && (
              <>
                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.IN_PROGRESS
                  }
                  label="Wave’i Başlat"
                  className="bg-indigo-700 text-white hover:bg-indigo-600"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.PAUSED
                  }
                  label="Duraklat"
                  className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.CANCELLED
                  }
                  label="İptal Et"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                />
              </>
            )}

            {wave.status ===
              WaveStatus.IN_PROGRESS && (
              <>
                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.PAUSED
                  }
                  label="Wave’i Duraklat"
                  className="bg-orange-600 text-white hover:bg-orange-500"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.COMPLETED
                  }
                  label="Wave’i Tamamla"
                  className="bg-green-700 text-white hover:bg-green-600"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.CANCELLED
                  }
                  label="İptal Et"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                />
              </>
            )}

            {wave.status ===
              WaveStatus.PAUSED && (
              <>
                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.IN_PROGRESS
                  }
                  label="Operasyona Devam Et"
                  className="bg-indigo-700 text-white hover:bg-indigo-600"
                />

                <StatusActionButton
                  waveId={wave.id}
                  targetStatus={
                    WaveStatus.CANCELLED
                  }
                  label="İptal Et"
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                />
              </>
            )}

            {wave.status ===
              WaveStatus.COMPLETED && (
              <span className="rounded-xl bg-green-100 px-5 py-3 font-bold text-green-800">
                ✓ Wave Tamamlandı
              </span>
            )}

            {wave.status ===
              WaveStatus.CANCELLED && (
              <span className="rounded-xl bg-red-100 px-5 py-3 font-bold text-red-800">
                Wave İptal Edildi
              </span>
            )}
          </div>
        </div>
      </section>

      {/* KPI KARTLARI */}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold text-slate-300">
            Genel İlerleme
          </p>

          <p className="mt-3 text-4xl font-bold">
            %{formatNumber(overallProgress)}
          </p>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: `${Math.min(
                  overallProgress,
                  100
                )}%`,
              }}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Sipariş ve Satır
          </p>

          <p className="mt-3 text-3xl font-bold text-blue-950">
            {formatNumber(
              wave.plannedOrderCount ||
                wave._count.orders
            )}
          </p>

          <p className="mt-2 text-sm text-blue-700">
            {formatNumber(
              wave.plannedLineCount
            )}{" "}
            sipariş satırı
          </p>
        </article>

        <article className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-orange-700">
            Miktar İlerlemesi
          </p>

          <p className="mt-3 text-3xl font-bold text-orange-950">
            {formatNumber(
              wave.completedQuantity
            )}
            {" / "}
            {formatNumber(
              wave.plannedQuantity
            )}
          </p>

          <p className="mt-2 text-sm text-orange-700">
            Kalan:{" "}
            {formatNumber(remainingQuantity)}
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-violet-700">
            Operatör Ataması
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-950">
            {formatNumber(
              wave._count.assignments
            )}
          </p>

          <p className="mt-2 text-sm text-violet-700">
            WaveAssignment kaydı
          </p>
        </article>
      </div>

      {/* MİKTAR İLERLEMESİ */}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Miktar Tamamlanma Durumu
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Planlanan ve tamamlanan ürün
              miktarlarının karşılaştırması.
            </p>
          </div>

          <strong className="text-3xl text-green-700">
            %{quantityCompletionRate}
          </strong>
        </div>

        <div className="mt-5 h-5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{
              width: `${quantityCompletionRate}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-600">
            Tamamlanan:{" "}
            {formatNumber(
              wave.completedQuantity
            )}
          </span>

          <span className="font-semibold text-slate-600">
            Kalan:{" "}
            {formatNumber(remainingQuantity)}
          </span>

          <span className="font-semibold text-slate-600">
            Planlanan:{" "}
            {formatNumber(
              wave.plannedQuantity
            )}
          </span>
        </div>
      </section>

      {/* OPERASYON İLERLEME */}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Operasyon Aşamaları
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Wave içerisindeki operasyonların aşama bazlı
          ilerleme durumu.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {progressItems.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    %{formatNumber(item.value)}
                  </p>
                </div>

                <span className="text-3xl">
                  {item.icon}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.className}`}
                  style={{
                    width: `${Math.min(
                      item.value,
                      100
                    )}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* WAVE BİLGİLERİ */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Wave Bilgileri
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Wave Numarası
              </p>

              <p className="mt-2 font-bold text-blue-900">
                {wave.waveNo}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Wave Tipi
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {getWaveTypeLabel(wave.type)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Öncelik
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getWavePriorityClass(
                  wave.priority
                )}`}
              >
                {getWavePriorityLabel(
                  wave.priority
                )}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Durum
              </p>

              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getWaveStatusClass(
                  wave.status
                )}`}
              >
                {getWaveStatusLabel(wave.status)}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Planlanan Başlangıç
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {formatDate(
                  wave.plannedStartAt
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Planlanan Bitiş
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {formatDate(
                  wave.plannedFinishAt
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Oluşturulma Tarihi
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {formatDate(wave.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Son Güncelleme
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {formatDate(wave.updatedAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Oluşturan
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {wave.createdBy ||
                  "Belirtilmedi"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Güncelleyen
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {wave.updatedBy ||
                  "Belirtilmedi"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Operasyon Notları
          </h2>

          <div className="mt-5 min-h-40 rounded-2xl bg-slate-50 p-5">
            <p className="whitespace-pre-wrap leading-7 text-slate-700">
              {wave.notes ||
                "Bu Wave için operasyon notu girilmemiştir."}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5">
            <h3 className="font-bold text-slate-800">
              Sonraki Entegrasyonlar
            </h3>

            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <p>• Wave’e sipariş ekleme</p>
              <p>• Operatör atama</p>
              <p>• RF toplama görevleri</p>
              <p>• Operasyon zaman çizelgesi</p>
            </div>
          </div>
        </section>
      </div>

      {/* SİPARİŞ VE OPERATÖR ALANLARI */}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Wave Siparişleri
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Bu Wave’e bağlı sipariş kayıtları.
              </p>
            </div>

            <span className="rounded-xl bg-blue-100 px-4 py-2 font-bold text-blue-800">
              {formatNumber(
                wave._count.orders
              )}{" "}
              sipariş
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="text-4xl">
              🛒
            </div>

            <h3 className="mt-3 font-bold text-slate-800">
              Sipariş Atama Modülü
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Bir sonraki aşamada uygun siparişlerin
              seçilerek Wave’e eklenmesi sağlanacak.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Atanan Operatörler
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                WaveAssignment üzerinden yapılan
                operatör atamaları.
              </p>
            </div>

            <span className="rounded-xl bg-violet-100 px-4 py-2 font-bold text-violet-800">
              {formatNumber(
                wave._count.assignments
              )}{" "}
              operatör
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="text-4xl">
              👷
            </div>

            <h3 className="mt-3 font-bold text-slate-800">
              Operatör Atama Modülü
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Bir sonraki aşamada operatörler toplama
              bölgelerine ve görev tiplerine göre
              atanacak.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}