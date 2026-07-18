"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type DashboardLiveHeaderProps = {
  activeTerminalCount: number;
  totalTerminalCount: number;
  totalSuccessfulOperationCount: number;
  failedOperationCount: number;
  children?: ReactNode;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export default function DashboardLiveHeader({
  activeTerminalCount,
  totalTerminalCount,
  totalSuccessfulOperationCount,
  failedOperationCount,
  children,
}: DashboardLiveHeaderProps) {
  const router = useRouter();

  /*
   * İlk sunucu render'ı ile ilk tarayıcı render'ının
   * aynı HTML'i üretmesi için tarih değerlerini null
   * olarak başlatıyoruz.
   */
  const [currentTime, setCurrentTime] =
    useState<Date | null>(null);

  const [lastRefreshAt, setLastRefreshAt] =
    useState<Date | null>(null);

  const [autoRefreshEnabled, setAutoRefreshEnabled] =
    useState(true);

  const [isPending, startTransition] =
    useTransition();

  const refreshDashboard = useCallback(() => {
    const refreshTime = new Date();

    setLastRefreshAt(refreshTime);

    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  /*
   * Saat yalnızca tarayıcıda çalışmaya başladıktan
   * sonra oluşturulur. Böylece hydration uyuşmazlığı
   * oluşmaz.
   */
  useEffect(() => {
    const initialTime = new Date();

    setCurrentTime(initialTime);
    setLastRefreshAt(initialTime);

    const clockInterval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }

    const refreshInterval = window.setInterval(() => {
      refreshDashboard();
    }, 15000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [
    autoRefreshEnabled,
    refreshDashboard,
  ]);

  const systemStatus = useMemo(() => {
    if (failedOperationCount >= 10) {
      return {
        label: "Kritik",
        dotClass: "bg-red-500",
        badgeClass: "bg-red-100 text-red-800",
      };
    }

    if (failedOperationCount > 0) {
      return {
        label: "Uyarı",
        dotClass: "bg-amber-500",
        badgeClass:
          "bg-amber-100 text-amber-800",
      };
    }

    return {
      label: "Sistem Aktif",
      dotClass: "bg-emerald-500",
      badgeClass:
        "bg-emerald-100 text-emerald-800",
    };
  }, [failedOperationCount]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Depo Operasyon Kontrol Merkezi
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-950">
            WMS Dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-slate-500">
            RF hareketleri, THM durumu, lokasyon
            dolulukları ve operatör performansının
            güncel görünümü.
          </p>
        </div>

        <div className="text-right">
          <p className="min-h-5 text-sm font-semibold capitalize text-slate-500">
            {currentTime
              ? formatDate(currentTime)
              : "\u00A0"}
          </p>

          <p className="mt-1 min-h-10 font-mono text-4xl font-bold tracking-tight text-slate-950">
            {currentTime
              ? formatTime(currentTime)
              : "--:--:--"}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${systemStatus.badgeClass}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${systemStatus.dotClass}`}
              />

              {systemStatus.label}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Son yenileme:{" "}
              {lastRefreshAt
                ? formatTime(lastRefreshAt)
                : "--:--:--"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Bugünkü Başarılı İşlem
          </p>

          <p className="mt-2 text-3xl font-bold">
            {formatNumber(
              totalSuccessfulOperationCount
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Aktif RF
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {formatNumber(activeTerminalCount)}
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            Toplam{" "}
            {formatNumber(totalTerminalCount)}{" "}
            terminal
          </p>
        </div>

        <div className="rounded-2xl bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            Başarısız İşlem
          </p>

          <p className="mt-2 text-3xl font-bold text-red-900">
            {formatNumber(failedOperationCount)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Veri Yenileme
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={isPending}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Yenileniyor..."
                : "Şimdi Yenile"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoRefreshEnabled(
                  (current) => !current
                );
              }}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                autoRefreshEnabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {autoRefreshEnabled
                ? "Canlı Açık"
                : "Canlı Kapalı"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Canlı modda veriler 15 saniyede bir
            yenilenir.
          </p>
        </div>
      </div>

      {children && (
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {children}
        </div>
      )}
    </section>
  );
}