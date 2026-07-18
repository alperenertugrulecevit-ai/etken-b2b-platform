import Link from "next/link";

import {
  WaveAssignmentStatus,
  WaveStatus,
  WmsOperationType,
} from "@prisma/client";

import { notFound } from "next/navigation";

import {
  createWaveAssignmentAction,
  deleteWaveAssignmentAction,
  updateWaveAssignmentStatusAction,
} from "../assignment-actions";

import {
  getWaveAssignmentManagementData,
} from "@/lib/wms/wave-assignment-service";

type WaveAssignmentsPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDateTime(value: Date | null) {
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

function getAssignmentStatusLabel(
  status: WaveAssignmentStatus
) {
  const labels: Record<
    WaveAssignmentStatus,
    string
  > = {
    ASSIGNED: "Atandı",
    ACTIVE: "Aktif",
    WAITING: "Bekliyor",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}

function getAssignmentStatusClass(
  status: WaveAssignmentStatus
) {
  const classes: Record<
    WaveAssignmentStatus,
    string
  > = {
    ASSIGNED:
      "bg-blue-100 text-blue-800",

    ACTIVE:
      "bg-green-100 text-green-800",

    WAITING:
      "bg-orange-100 text-orange-800",

    COMPLETED:
      "bg-violet-100 text-violet-800",

    CANCELLED:
      "bg-red-100 text-red-800",
  };

  return classes[status];
}

function getOperationTypeLabel(
  type: WmsOperationType | null
) {
  if (!type) {
    return "Belirtilmedi";
  }

  const labels: Partial<
    Record<WmsOperationType, string>
  > = {
    PICKING: "Toplama",
    PACKING: "Paketleme",
    SHIPPING: "Sevkiyat",
    ITEM_TRANSFER: "Ürün Transferi",
    FULL_TRANSFER: "Tam Transfer",
    COUNT: "Sayım",
    RECEIVING: "Mal Kabul",
    ADDRESSING: "Adresleme",
    OTHER: "Diğer",
  };

  return labels[type] || type;
}

type StatusButtonProps = {
  waveId: string;
  assignmentId: string;
  targetStatus: WaveAssignmentStatus;
  label: string;
  className: string;
};

function StatusButton({
  waveId,
  assignmentId,
  targetStatus,
  label,
  className,
}: StatusButtonProps) {
  return (
    <form
      action={
        updateWaveAssignmentStatusAction
      }
    >
      <input
        type="hidden"
        name="waveId"
        value={waveId}
      />

      <input
        type="hidden"
        name="assignmentId"
        value={assignmentId}
      />

      <input
        type="hidden"
        name="targetStatus"
        value={targetStatus}
      />

      <button
        type="submit"
        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${className}`}
      >
        {label}
      </button>
    </form>
  );
}

export default async function WaveAssignmentsPage({
  params,
  searchParams,
}: WaveAssignmentsPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const data =
    await getWaveAssignmentManagementData(id);

  if (!data) {
    notFound();
  }

  const { wave, summary } = data;

const assignmentIsEditable =
  wave.status === WaveStatus.DRAFT ||
  wave.status === WaveStatus.READY ||
  wave.status === WaveStatus.RELEASED ||
  wave.status === WaveStatus.IN_PROGRESS ||
  wave.status === WaveStatus.PAUSED;

  return (
    <section className="min-h-screen p-8 xl:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-700">
            Wave Operatör Yönetimi
          </p>

          <h1 className="mt-3 text-4xl font-bold text-slate-950">
            {wave.waveNo}
          </h1>

          <p className="mt-2 text-lg font-semibold text-slate-700">
            {wave.name || "İsimsiz Wave"}
          </p>

          <p className="mt-2 text-slate-500">
            Operatörleri Wave’e atayın,
            terminal bilgilerini tanımlayın ve
            çalışma durumlarını yönetin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/waves/${wave.id}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            ← Wave Detayı
          </Link>

          <Link
            href={`/admin/waves/${wave.id}/orders`}
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-600"
          >
            Sipariş Yönetimi
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

      {!assignmentIsEditable && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900">
          <p className="font-bold">
            Operatör değişikliği kapalı
          </p>

          <p className="mt-1 text-sm">
            Tamamlanmış veya iptal edilmiş
            Wave’lerde operatör ataması
            değiştirilemez.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm text-slate-300">
            Toplam Operatör
          </p>

          <p className="mt-2 text-3xl font-bold">
            {formatNumber(summary.total)}
          </p>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-semibold text-blue-700">
            Atandı
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-950">
            {formatNumber(summary.assigned)}
          </p>
        </article>

        <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-700">
            Aktif
          </p>

          <p className="mt-2 text-3xl font-bold text-green-950">
            {formatNumber(summary.active)}
          </p>
        </article>

        <article className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-semibold text-orange-700">
            Bekliyor
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-950">
            {formatNumber(summary.waiting)}
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-sm font-semibold text-violet-700">
            Tamamlandı
          </p>

          <p className="mt-2 text-3xl font-bold text-violet-950">
            {formatNumber(summary.completed)}
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Yeni Operatör Ata
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Operatör ve RF terminal
            bilgilerini girin.
          </p>

          <form
            action={createWaveAssignmentAction}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="waveId"
              value={wave.id}
            />

            <div>
              <label
                htmlFor="operatorName"
                className="text-sm font-bold text-slate-700"
              >
                Operatör Adı
              </label>

              <input
                id="operatorName"
                name="operatorName"
                required
                disabled={!assignmentIsEditable}
                placeholder="Örnek: Ahmet Yılmaz"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="terminalCode"
                className="text-sm font-bold text-slate-700"
              >
                RF Terminal Kodu
              </label>

              <input
                id="terminalCode"
                name="terminalCode"
                disabled={!assignmentIsEditable}
                placeholder="Örnek: RF-01"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="operationType"
                className="text-sm font-bold text-slate-700"
              >
                Operasyon Tipi
              </label>

              <select
                id="operationType"
                name="operationType"
                defaultValue={
                  WmsOperationType.PICKING
                }
                disabled={!assignmentIsEditable}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
              >
                <option value="PICKING">
                  Toplama
                </option>

                <option value="PACKING">
                  Paketleme
                </option>

                <option value="SHIPPING">
                  Sevkiyat
                </option>

                <option value="ITEM_TRANSFER">
                  Ürün Transferi
                </option>

                <option value="FULL_TRANSFER">
                  Tam Transfer
                </option>

                <option value="COUNT">
                  Sayım
                </option>

                <option value="OTHER">
                  Diğer
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!assignmentIsEditable}
              className="w-full rounded-xl bg-violet-700 px-5 py-3 font-bold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Operatörü Wave’e Ata
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-bold text-slate-800">
              Atama kuralları
            </p>

            <p className="mt-2">
              Aynı operatör birden fazla aktif
              Wave’e atanamaz.
            </p>

            <p className="mt-1">
              Aynı RF terminali eş zamanlı olarak
              iki operatöre verilemez.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Atanan Operatörler
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Wave içerisindeki operatör ve
                  terminal durumları.
                </p>
              </div>

              <span className="rounded-xl bg-violet-100 px-4 py-2 font-bold text-violet-800">
                {formatNumber(
                  wave.assignments.length
                )}{" "}
                kayıt
              </span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">
                    Operatör
                  </th>

                  <th className="px-4 py-4">
                    Terminal
                  </th>

                  <th className="px-4 py-4">
                    Operasyon
                  </th>

                  <th className="px-4 py-4">
                    Durum
                  </th>

                  <th className="px-4 py-4">
                    Atama
                  </th>

                  <th className="px-4 py-4">
                    Son Hareket
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlemler
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {wave.assignments.map(
                  (assignment) => (
                    <tr
                      key={assignment.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {
                            assignment.operatorName
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-bold text-slate-700">
                          {assignment.terminalCode ||
                            "Atanmadı"}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {getOperationTypeLabel(
                          assignment.operationType
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getAssignmentStatusClass(
                            assignment.status
                          )}`}
                        >
                          {getAssignmentStatusLabel(
                            assignment.status
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(
                          assignment.assignedAt
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(
                          assignment.lastActivityAt
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {assignment.status ===
                            WaveAssignmentStatus.ASSIGNED && (
                            <>
                              <StatusButton
                                waveId={wave.id}
                                assignmentId={
                                  assignment.id
                                }
                                targetStatus={
                                  WaveAssignmentStatus.ACTIVE
                                }
                                label="Başlat"
                                className="bg-green-100 text-green-800 hover:bg-green-200"
                              />

                              <StatusButton
                                waveId={wave.id}
                                assignmentId={
                                  assignment.id
                                }
                                targetStatus={
                                  WaveAssignmentStatus.WAITING
                                }
                                label="Beklet"
                                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                              />
                            </>
                          )}

                          {assignment.status ===
                            WaveAssignmentStatus.ACTIVE && (
                            <>
                              <StatusButton
                                waveId={wave.id}
                                assignmentId={
                                  assignment.id
                                }
                                targetStatus={
                                  WaveAssignmentStatus.WAITING
                                }
                                label="Duraklat"
                                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                              />

                              <StatusButton
                                waveId={wave.id}
                                assignmentId={
                                  assignment.id
                                }
                                targetStatus={
                                  WaveAssignmentStatus.COMPLETED
                                }
                                label="Tamamla"
                                className="bg-violet-100 text-violet-800 hover:bg-violet-200"
                              />
                            </>
                          )}

                          {assignment.status ===
                            WaveAssignmentStatus.WAITING && (
                            <>
                              <StatusButton
                                waveId={wave.id}
                                assignmentId={
                                  assignment.id
                                }
                                targetStatus={
                                  WaveAssignmentStatus.ACTIVE
                                }
                                label="Devam Et"
                                className="bg-green-100 text-green-800 hover:bg-green-200"
                              />

                              <StatusButton
                                waveId={wave.id}
                                assignmentId={
                                  assignment.id
                                }
                                targetStatus={
                                  WaveAssignmentStatus.COMPLETED
                                }
                                label="Tamamla"
                                className="bg-violet-100 text-violet-800 hover:bg-violet-200"
                              />
                            </>
                          )}

                          {(
  assignment.status === WaveAssignmentStatus.ASSIGNED ||
  assignment.status === WaveAssignmentStatus.WAITING ||
  assignment.status === WaveAssignmentStatus.CANCELLED
) && (
                            <form
                              action={
                                deleteWaveAssignmentAction
                              }
                            >
                              <input
                                type="hidden"
                                name="waveId"
                                value={wave.id}
                              />

                              <input
                                type="hidden"
                                name="assignmentId"
                                value={
                                  assignment.id
                                }
                              />

                              <button
                                type="submit"
                                className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-200"
                              >
                                Sil
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {wave.assignments.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center"
                    >
                      <div className="text-4xl">
                        👷
                      </div>

                      <p className="mt-3 font-bold text-slate-700">
                        Operatör atanmadı
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Sol taraftaki formdan ilk
                        operatörü atayabilirsiniz.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}