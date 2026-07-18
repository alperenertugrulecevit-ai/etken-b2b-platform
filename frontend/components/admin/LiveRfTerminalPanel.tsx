"use client";

import { useEffect, useMemo, useState } from "react";

type RfTerminal = {
  terminalCode: string;
  operatorName: string | null;
  lastOperationType: string | null;
  lastOperationLabel: string | null;
  lastOperationAt: string | null;
  lastOperationSuccessful: boolean | null;
  ipAddress: string | null;
  todayOperationCount: number;
  todayQuantity: number;
};

type LiveRfTerminalPanelProps = {
  terminals: RfTerminal[];
};

type TerminalStatus = {
  label: "Aktif" | "Beklemede" | "Pasif";
  dotClass: string;
  badgeClass: string;
  cardClass: string;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getElapsedMilliseconds(
  lastOperationAt: string | null,
  currentTime: number
) {
  if (!lastOperationAt) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    0,
    currentTime -
      new Date(lastOperationAt).getTime()
  );
}

function formatRelativeTime(
  lastOperationAt: string | null,
  currentTime: number
) {
  if (!lastOperationAt) {
    return "İşlem kaydı yok";
  }

  const totalSeconds = Math.floor(
    getElapsedMilliseconds(
      lastOperationAt,
      currentTime
    ) / 1000
  );

  if (totalSeconds < 60) {
    return `${totalSeconds} saniye önce`;
  }

  const totalMinutes = Math.floor(
    totalSeconds / 60
  );

  if (totalMinutes < 60) {
    return `${totalMinutes} dakika önce`;
  }

  const totalHours = Math.floor(
    totalMinutes / 60
  );

  if (totalHours < 24) {
    const remainingMinutes =
      totalMinutes % 60;

    return remainingMinutes > 0
      ? `${totalHours} saat ${remainingMinutes} dakika önce`
      : `${totalHours} saat önce`;
  }

  const totalDays = Math.floor(
    totalHours / 24
  );

  return `${totalDays} gün önce`;
}

function getTerminalStatus(
  lastOperationAt: string | null,
  currentTime: number
): TerminalStatus {
  const elapsed = getElapsedMilliseconds(
    lastOperationAt,
    currentTime
  );

  if (elapsed <= 2 * 60 * 1000) {
    return {
      label: "Aktif",
      dotClass: "bg-emerald-500",
      badgeClass:
        "bg-emerald-100 text-emerald-800",
      cardClass:
        "border-emerald-200 bg-emerald-50/40",
    };
  }

  if (elapsed <= 10 * 60 * 1000) {
    return {
      label: "Beklemede",
      dotClass: "bg-amber-500",
      badgeClass:
        "bg-amber-100 text-amber-800",
      cardClass:
        "border-amber-200 bg-amber-50/40",
    };
  }

  return {
    label: "Pasif",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-100 text-red-800",
    cardClass:
      "border-red-200 bg-red-50/30",
  };
}

export default function LiveRfTerminalPanel({
  terminals,
}: LiveRfTerminalPanelProps) {
  const [currentTime, setCurrentTime] =
    useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const statusSummary = useMemo(() => {
    return terminals.reduce(
      (summary, terminal) => {
        const status = getTerminalStatus(
          terminal.lastOperationAt,
          currentTime
        );

        if (status.label === "Aktif") {
          summary.active += 1;
        } else if (
          status.label === "Beklemede"
        ) {
          summary.waiting += 1;
        } else {
          summary.inactive += 1;
        }

        return summary;
      },
      {
        active: 0,
        waiting: 0,
        inactive: 0,
      }
    );
  }, [terminals, currentTime]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Cihaz ve Operatör Takibi
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Canlı RF Terminalleri
          </h2>

          <p className="mt-1 text-slate-500">
            Terminal durumu, son işlem zamanı ve
            bugünkü operasyon performansı.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-bold text-emerald-700">
              Aktif
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {statusSummary.active}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
            <p className="text-xs font-bold text-amber-700">
              Beklemede
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-900">
              {statusSummary.waiting}
            </p>
          </div>

          <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
            <p className="text-xs font-bold text-red-700">
              Pasif
            </p>
            <p className="mt-1 text-2xl font-bold text-red-900">
              {statusSummary.inactive}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {terminals.map((terminal) => {
          const status = getTerminalStatus(
            terminal.lastOperationAt,
            currentTime
          );

          return (
            <article
              key={terminal.terminalCode}
              className={`rounded-2xl border p-5 ${status.cardClass}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${status.dotClass}`}
                    />

                    <h3 className="text-xl font-bold text-slate-950">
                      {terminal.terminalCode}
                    </h3>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Operatör
                  </p>

                  <p className="font-semibold text-slate-900">
                    {terminal.operatorName ||
                      "Belirtilmedi"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${status.badgeClass}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-5 rounded-xl bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Son İşlem
                </p>

                <p className="mt-2 font-mono text-base font-bold text-slate-950">
                  {terminal.lastOperationAt
                    ? formatDateTime(
                        terminal.lastOperationAt
                      )
                    : "Kayıt bulunmuyor"}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatRelativeTime(
                    terminal.lastOperationAt,
                    currentTime
                  )}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-xs text-slate-500">
                    Son Operasyon
                  </p>

                  <p className="mt-1 truncate font-bold text-slate-900">
                    {terminal.lastOperationLabel ||
                      "Belirtilmedi"}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-xs text-slate-500">
                    Sonuç
                  </p>

                  <p
                    className={`mt-1 font-bold ${
                      terminal.lastOperationSuccessful ===
                      false
                        ? "text-red-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {terminal.lastOperationSuccessful ===
                    null
                      ? "Belirsiz"
                      : terminal.lastOperationSuccessful
                        ? "Başarılı"
                        : "Başarısız"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">
                    Bugünkü İşlem
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {formatNumber(
                      terminal.todayOperationCount
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">
                    Bugünkü Miktar
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {formatNumber(
                      terminal.todayQuantity
                    )}
                  </p>
                </div>
              </div>

              {terminal.ipAddress && (
                <p className="mt-4 text-xs text-slate-500">
                  Son IP:{" "}
                  <span className="font-mono font-semibold text-slate-700">
                    {terminal.ipAddress}
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </div>

      {terminals.length === 0 && (
        <div className="mt-6 rounded-2xl bg-slate-50 p-10 text-center text-slate-500">
          Terminal kodu içeren RF operasyon kaydı
          bulunmuyor.
        </div>
      )}

      <p className="mt-5 text-right text-xs text-slate-400">
        Durumlar her saniye güncellenir: Aktif ≤ 2
        dakika, Beklemede 2–10 dakika, Pasif &gt; 10
        dakika.
      </p>
    </div>
  );
}