"use client";

import { useMemo, useState } from "react";

type OperatorStatus = "ACTIVE" | "WAITING" | "PASSIVE";

type OperatorWorkloadItem = {
  operatorName: string;
  terminalCode: string;
  operationCount: number;
  quantity: number;
  status: OperatorStatus;
  lastOperationType: string | null;
  lastOperationLabel: string | null;
  lastOperationAt: string | null;
  lastOperationSuccessful: boolean | null;
};

type OperatorWorkloadPanelProps = {
  operators: OperatorWorkloadItem[];
};

type SortKey =
  | "OPERATION_COUNT"
  | "QUANTITY"
  | "STATUS";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDateTime(value: string | null) {
  if (!value) return "İşlem yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getStatusDetails(status: OperatorStatus) {
  if (status === "ACTIVE") {
    return {
      label: "Aktif",
      dot: "bg-emerald-500",
      badge: "bg-emerald-100 text-emerald-800",
      border: "border-emerald-200",
    };
  }

  if (status === "WAITING") {
    return {
      label: "Beklemede",
      dot: "bg-amber-500",
      badge: "bg-amber-100 text-amber-800",
      border: "border-amber-200",
    };
  }

  return {
    label: "Pasif",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
  };
}

function getWorkloadDetails(
  operationCount: number,
  average: number
) {
  if (average <= 0) {
    return {
      label: "Veri yok",
      badge: "bg-slate-100 text-slate-700",
      bar: "bg-slate-400",
      percentage: 0,
    };
  }

  const ratio = operationCount / average;

  if (ratio >= 1.35) {
    return {
      label: "Yüksek yük",
      badge: "bg-red-100 text-red-800",
      bar: "bg-red-500",
      percentage: 100,
    };
  }

  if (ratio >= 0.75) {
    return {
      label: "Dengeli",
      badge: "bg-emerald-100 text-emerald-800",
      bar: "bg-emerald-500",
      percentage: Math.min(100, ratio * 75),
    };
  }

  return {
    label: "Düşük yük",
    badge: "bg-blue-100 text-blue-800",
    bar: "bg-blue-500",
    percentage: Math.max(12, ratio * 75),
  };
}

export default function OperatorWorkloadPanel({
  operators,
}: OperatorWorkloadPanelProps) {
  const [sortKey, setSortKey] =
    useState<SortKey>("OPERATION_COUNT");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | OperatorStatus>("ALL");

  const averageOperationCount = useMemo(() => {
    if (operators.length === 0) return 0;

    return (
      operators.reduce(
        (total, operator) =>
          total + operator.operationCount,
        0
      ) / operators.length
    );
  }, [operators]);

  const summary = useMemo(
    () => ({
      active: operators.filter(
        (operator) => operator.status === "ACTIVE"
      ).length,
      waiting: operators.filter(
        (operator) => operator.status === "WAITING"
      ).length,
      passive: operators.filter(
        (operator) => operator.status === "PASSIVE"
      ).length,
      totalOperations: operators.reduce(
        (total, operator) =>
          total + operator.operationCount,
        0
      ),
    }),
    [operators]
  );

  const visibleOperators = useMemo(() => {
    const filtered =
      statusFilter === "ALL"
        ? operators
        : operators.filter(
            (operator) =>
              operator.status === statusFilter
          );

    return [...filtered].sort((first, second) => {
      if (sortKey === "QUANTITY") {
        return second.quantity - first.quantity;
      }

      if (sortKey === "STATUS") {
        const order: Record<OperatorStatus, number> = {
          ACTIVE: 0,
          WAITING: 1,
          PASSIVE: 2,
        };

        return (
          order[first.status] -
          order[second.status]
        );
      }

      return (
        second.operationCount -
        first.operationCount
      );
    });
  }, [operators, sortKey, statusFilter]);

  const imbalanceDetected = useMemo(() => {
    if (operators.length < 2) return false;

    const counts = operators.map(
      (operator) => operator.operationCount
    );

    return (
      Math.max(...counts) >
      Math.max(1, Math.min(...counts)) * 2
    );
  }, [operators]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Ekip Yönetimi
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Operatör İş Yükü
          </h2>

          <p className="mt-1 text-slate-500">
            Bugünkü başarılı işlemler ve son RF
            hareketlerine göre anlık görünüm.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "Aktif",
              value: summary.active,
            },
            {
              label: "Bekleyen",
              value: summary.waiting,
            },
            {
              label: "Pasif",
              value: summary.passive,
            },
            {
              label: "İşlem",
              value: summary.totalOperations,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-slate-100 px-3 py-2 text-center"
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {formatNumber(item.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {imbalanceDetected && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">
            İş yükü dengesizliği tespit edildi.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            En yoğun ve en düşük operatör arasında
            iki kattan fazla işlem farkı bulunuyor.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as
                | "ALL"
                | OperatorStatus
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500"
        >
          <option value="ALL">Tüm durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="WAITING">Beklemede</option>
          <option value="PASSIVE">Pasif</option>
        </select>

        <select
          value={sortKey}
          onChange={(event) =>
            setSortKey(
              event.target.value as SortKey
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500"
        >
          <option value="OPERATION_COUNT">
            İşlem sayısına göre
          </option>
          <option value="QUANTITY">
            Miktara göre
          </option>
          <option value="STATUS">
            Duruma göre
          </option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {visibleOperators.map((operator, index) => {
          const status = getStatusDetails(
            operator.status
          );

          const workload = getWorkloadDetails(
            operator.operationCount,
            averageOperationCount
          );

          return (
            <article
              key={`${operator.operatorName}-${operator.terminalCode}-${index}`}
              className={`rounded-2xl border p-4 ${status.border}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                    {operator.operatorName
                      .trim()
                      .charAt(0)
                      .toLocaleUpperCase("tr-TR") ||
                      "?"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-slate-950">
                        {operator.operatorName}
                      </p>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.badge}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${status.dot}`}
                        />
                        {status.label}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${workload.badge}`}
                      >
                        {workload.label}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Terminal:{" "}
                      <strong className="text-slate-700">
                        {operator.terminalCode}
                      </strong>
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Son işlem:{" "}
                      <strong className="text-slate-700">
                        {operator.lastOperationLabel ||
                          "İşlem yok"}
                      </strong>{" "}
                      ·{" "}
                      {formatDateTime(
                        operator.lastOperationAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-black text-slate-950">
                    {formatNumber(
                      operator.operationCount
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    işlem ·{" "}
                    {formatNumber(operator.quantity)} miktar
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${workload.bar}`}
                  style={{
                    width: `${workload.percentage}%`,
                  }}
                />
              </div>
            </article>
          );
        })}

        {visibleOperators.length === 0 && (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
            Seçilen durum için operatör verisi
            bulunmuyor.
          </div>
        )}
      </div>
    </section>
  );
}