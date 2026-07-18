"use client";

type CriticalAlarmCenterProps = {
  unaddressedHandlingUnitCount: number;
  emptyPickingUnitCount: number;
  failedOperationCount: number;
  activeTerminalCount: number;
  waitingTerminalCount: number;
  inactiveTerminalCount: number;
  totalTerminalCount: number;
  warehouseHealthScore: number;
};

type AlarmLevel = "normal" | "warning" | "critical";

type AlarmCard = {
  key: string;
  title: string;
  value: number;
  level: AlarmLevel;
  description: string;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function getLevelClasses(level: AlarmLevel) {
  if (level === "critical") {
    return {
      card: "border-red-300 bg-red-50",
      dot: "bg-red-500",
      title: "text-red-800",
      value: "text-red-950",
      badge: "bg-red-200 text-red-900",
      badgeText: "Kritik",
    };
  }

  if (level === "warning") {
    return {
      card: "border-amber-300 bg-amber-50",
      dot: "bg-amber-500",
      title: "text-amber-800",
      value: "text-amber-950",
      badge: "bg-amber-200 text-amber-900",
      badgeText: "Uyarı",
    };
  }

  return {
    card: "border-emerald-200 bg-emerald-50",
    dot: "bg-emerald-500",
    title: "text-emerald-800",
    value: "text-emerald-950",
    badge: "bg-emerald-200 text-emerald-900",
    badgeText: "Normal",
  };
}

function getHealthDetails(score: number) {
  if (score >= 90) {
    return {
      label: "Çok İyi",
      textClass: "text-emerald-800",
      barClass: "bg-emerald-500",
      panelClass: "border-emerald-200 bg-emerald-50",
    };
  }

  if (score >= 75) {
    return {
      label: "İyi",
      textClass: "text-blue-800",
      barClass: "bg-blue-500",
      panelClass: "border-blue-200 bg-blue-50",
    };
  }

  if (score >= 50) {
    return {
      label: "Dikkat",
      textClass: "text-amber-800",
      barClass: "bg-amber-500",
      panelClass: "border-amber-200 bg-amber-50",
    };
  }

  return {
    label: "Kritik",
    textClass: "text-red-800",
    barClass: "bg-red-500",
    panelClass: "border-red-200 bg-red-50",
  };
}

export default function CriticalAlarmCenter({
  unaddressedHandlingUnitCount,
  emptyPickingUnitCount,
  failedOperationCount,
  activeTerminalCount,
  waitingTerminalCount,
  inactiveTerminalCount,
  totalTerminalCount,
  warehouseHealthScore,
}: CriticalAlarmCenterProps) {
  const alarms: AlarmCard[] = [
    {
      key: "unaddressed",
      title: "Adreslenmemiş THM",
      value: unaddressedHandlingUnitCount,
      level:
        unaddressedHandlingUnitCount > 25
          ? "critical"
          : unaddressedHandlingUnitCount > 10
            ? "warning"
            : "normal",
      description:
        unaddressedHandlingUnitCount === 0
          ? "Adres bekleyen THM bulunmuyor."
          : "Lokasyona yerleştirme bekleyen THM sayısı.",
    },
    {
      key: "empty-picking",
      title: "Boş Picking THM",
      value: emptyPickingUnitCount,
      level:
        emptyPickingUnitCount > 10
          ? "critical"
          : emptyPickingUnitCount > 0
            ? "warning"
            : "normal",
      description:
        emptyPickingUnitCount === 0
          ? "Picking THM kapasitesi normal."
          : "Besleme veya yeniden hazırlama gerekebilir.",
    },
    {
      key: "failed-operations",
      title: "Başarısız RF İşlemi",
      value: failedOperationCount,
      level:
        failedOperationCount >= 10
          ? "critical"
          : failedOperationCount > 0
            ? "warning"
            : "normal",
      description:
        failedOperationCount === 0
          ? "Bugün başarısız RF işlemi yok."
          : "Bugün hata ile sonuçlanan işlem sayısı.",
    },
    {
      key: "inactive-terminals",
      title: "Pasif RF Terminali",
      value: inactiveTerminalCount,
      level:
        inactiveTerminalCount > 5
          ? "critical"
          : inactiveTerminalCount > 0
            ? "warning"
            : "normal",
      description:
        totalTerminalCount === 0
          ? "Henüz terminal kaydı bulunmuyor."
          : `${formatNumber(activeTerminalCount)} aktif, ${formatNumber(
              waitingTerminalCount
            )} beklemede.`,
    },
  ];

  const criticalCount = alarms.filter(
    (alarm) => alarm.level === "critical"
  ).length;

  const warningCount = alarms.filter(
    (alarm) => alarm.level === "warning"
  ).length;

  const health = getHealthDetails(warehouseHealthScore);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            Operasyon Uyarıları
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Kritik Alarm Merkezi
          </h2>

          <p className="mt-1 text-slate-500">
            Operasyonun müdahale gerektiren noktalarını tek ekranda gösterir.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
            {criticalCount} kritik
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            {warningCount} uyarı
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_260px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {alarms.map((alarm) => {
            const classes = getLevelClasses(alarm.level);

            return (
              <article
                key={alarm.key}
                className={`rounded-2xl border p-4 ${classes.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${classes.dot}`}
                    />
                    <p className={`text-sm font-bold ${classes.title}`}>
                      {alarm.title}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classes.badge}`}
                  >
                    {classes.badgeText}
                  </span>
                </div>

                <p className={`mt-5 text-4xl font-black ${classes.value}`}>
                  {formatNumber(alarm.value)}
                </p>

                <p className="mt-2 min-h-10 text-xs leading-5 text-slate-600">
                  {alarm.description}
                </p>
              </article>
            );
          })}
        </div>

        <aside className={`rounded-2xl border p-5 ${health.panelClass}`}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Depo Sağlığı
          </p>

          <div className="mt-4 flex items-end gap-2">
            <strong className={`text-5xl font-black ${health.textClass}`}>
              {warehouseHealthScore}
            </strong>
            <span className="pb-1 text-lg font-bold text-slate-500">
              / 100
            </span>
          </div>

          <p className={`mt-2 text-lg font-bold ${health.textClass}`}>
            {health.label}
          </p>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${health.barClass}`}
              style={{ width: `${warehouseHealthScore}%` }}
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-600">
            Skor; kritik alarmlar, başarısız işlemler ve pasif RF
            terminalleri dikkate alınarak hesaplanır.
          </p>
        </aside>
      </div>

      {criticalCount === 0 && warningCount === 0 && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center font-bold text-emerald-800">
          Sistem normal çalışıyor. Müdahale gerektiren alarm bulunmuyor.
        </div>
      )}
    </div>
  );
}