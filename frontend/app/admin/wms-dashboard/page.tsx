import {
  HandlingUnitStatus,
  HandlingUnitType,
  WmsOperationType,
} from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HourlyOperationChart from "@/components/admin/HourlyOperationChart";
import LiveRfTerminalPanel from "@/components/admin/LiveRfTerminalPanel";
import DashboardLiveHeader from "@/components/admin/DashboardLiveHeader";
import CriticalAlarmCenter from "@/components/admin/CriticalAlarmCenter";
import LiveOperationFeed from "@/components/admin/LiveOperationFeed";
import OperatorWorkloadPanel from "@/components/admin/OperatorWorkloadPanel";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function getOperationLabel(operationType: string) {
  const labels: Record<string, string> = {
    RECEIVING: "Mal Kabul",
    HANDLING_UNIT_CREATE: "THM Oluşturma",
    HANDLING_UNIT_UPDATE: "THM Güncelleme",
    HANDLING_UNIT_CANCEL: "THM İptali",
    ADDRESSING: "Adresleme",
    UNADDRESSING: "Adresten Çıkarma",
    ITEM_TRANSFER: "Ürün Transferi",
    FULL_TRANSFER: "Komple THM Transferi",
    PALLET_LINK: "Koli-Palet Bağlama",
    PALLET_UNLINK: "Paletten Koli Ayırma",
    PICKING: "Toplama",
    PACKING: "Paketleme",
    SHIPPING: "Sevkiyat",
    COUNT: "Sayım",
    STOCK_IN: "Stok Girişi",
    STOCK_OUT: "Stok Çıkışı",
    OTHER: "Diğer",
  };

  return labels[operationType] ?? operationType;
}

function getOperationClass(operationType: string) {
  const classes: Record<string, string> = {
    RECEIVING: "bg-emerald-100 text-emerald-800",
    ADDRESSING: "bg-blue-100 text-blue-800",
    UNADDRESSING: "bg-orange-100 text-orange-800",
    ITEM_TRANSFER: "bg-violet-100 text-violet-800",
    FULL_TRANSFER: "bg-purple-100 text-purple-800",
    PICKING: "bg-indigo-100 text-indigo-800",
    PACKING: "bg-cyan-100 text-cyan-800",
    SHIPPING: "bg-sky-100 text-sky-800",
    COUNT: "bg-amber-100 text-amber-800",
    PALLET_LINK: "bg-teal-100 text-teal-800",
    PALLET_UNLINK: "bg-rose-100 text-rose-800",
  };

  return classes[operationType] ?? "bg-slate-100 text-slate-700";
}

function getHandlingUnitStatusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Açık",
    CLOSED: "Kapalı",
    STORED: "Depoda",
    IN_TRANSIT: "Transferde",
    EMPTY: "Boş",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

export default async function WmsDashboardPage() {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );

  const [
    todayOperationGroups,
    recentOperations,
    handlingUnitStatusGroups,
    locations,
    operatorGroups,
    failedOperationCount,
    unaddressedHandlingUnitCount,
    emptyPickingUnitCount,
    recentRfOperations,
    topProductGroups,
    todayHourlyOperations,
    terminalCodeGroups,
  ] = await Promise.all([
    prisma.wmsOperationLog.groupBy({
      by: ["operationType"],
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
        isSuccessful: true,
      },
      _count: {
        _all: true,
      },
      _sum: {
        quantity: true,
      },
    }),

    prisma.wmsOperationLog.findMany({
      take: 15,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        operationType: true,
        module: true,
        operatorName: true,
        terminalCode: true,
        barcode: true,
        sourceBarcode: true,
        targetBarcode: true,
        orderNumber: true,
        productCode: true,
        productName: true,
        quantity: true,
        description: true,
        isSuccessful: true,
        errorMessage: true,
        createdAt: true,
      },
    }),

    prisma.handlingUnit.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),

    prisma.warehouseLocation.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        locationType: true,
        capacity: true,
        _count: {
          select: {
            handlingUnits: true,
          },
        },
      },
    }),

    prisma.wmsOperationLog.groupBy({
      by: [
        "operatorName",
        "terminalCode",
        "operationType",
      ],
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
        isSuccessful: true,
      },
      _count: {
        _all: true,
      },
      _sum: {
        quantity: true,
      },
    }),

    prisma.wmsOperationLog.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
        isSuccessful: false,
      },
    }),

    prisma.handlingUnit.count({
      where: {
        locationId: null,
        status: {
          not: HandlingUnitStatus.CANCELLED,
        },
      },
    }),

    prisma.handlingUnit.count({
      where: {
        unitType: {
          in: [
            HandlingUnitType.PICKING_BOX,
            HandlingUnitType.PICKING_PALLET,
          ],
        },
        status: HandlingUnitStatus.EMPTY,
      },
    }),

    prisma.wmsOperationLog.findMany({
      take: 10,
      where: {
        module: {
          startsWith: "RF_",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        operationType: true,
        operatorName: true,
        terminalCode: true,
        quantity: true,
        createdAt: true,
        isSuccessful: true,
      },
    }),

    prisma.wmsOperationLog.groupBy({
      by: ["productCode", "productName"],
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
        isSuccessful: true,
        productCode: {
          not: null,
        },
      },
      _count: {
        productCode: true,
      },
      _sum: {
        quantity: true,
      },
    }),

    prisma.wmsOperationLog.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
        isSuccessful: true,
      },
      select: {
        createdAt: true,
        quantity: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.wmsOperationLog.groupBy({
      by: ["terminalCode"],
      where: {
        terminalCode: {
          not: null,
        },
      },
    }),
  ]);

  const operationMap = new Map(
    todayOperationGroups.map((group) => [
      group.operationType,
      {
        operationCount: group._count._all,
        quantity: group._sum.quantity ?? 0,
      },
    ])
  );

  const getMetric = (
    operationTypes: WmsOperationType[]
  ) =>
    operationTypes.reduce(
      (total, type) => {
        const metric = operationMap.get(type);

        return {
          operationCount:
            total.operationCount +
            (metric?.operationCount ?? 0),
          quantity:
            total.quantity +
            (metric?.quantity ?? 0),
        };
      },
      {
        operationCount: 0,
        quantity: 0,
      }
    );

  const operationKpis = [
    {
      label: "Mal Kabul",
      icon: "📥",
      metric: getMetric([
        WmsOperationType.RECEIVING,
      ]),
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    {
      label: "Adresleme",
      icon: "📍",
      metric: getMetric([
        WmsOperationType.ADDRESSING,
      ]),
      className:
        "border-blue-200 bg-blue-50 text-blue-800",
    },
    {
      label: "Transfer",
      icon: "🔄",
      metric: getMetric([
        WmsOperationType.ITEM_TRANSFER,
        WmsOperationType.FULL_TRANSFER,
      ]),
      className:
        "border-violet-200 bg-violet-50 text-violet-800",
    },
    {
      label: "Toplama",
      icon: "🧺",
      metric: getMetric([
        WmsOperationType.PICKING,
      ]),
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-800",
    },
    {
      label: "Paketleme",
      icon: "📦",
      metric: getMetric([
        WmsOperationType.PACKING,
      ]),
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-800",
    },
    {
      label: "Sevkiyat",
      icon: "🚚",
      metric: getMetric([
        WmsOperationType.SHIPPING,
      ]),
      className:
        "border-sky-200 bg-sky-50 text-sky-800",
    },
  ];

  const totalSuccessfulOperationCount =
    todayOperationGroups.reduce(
      (total, group) => total + group._count._all,
      0
    );

  const statusMap = new Map(
    handlingUnitStatusGroups.map((group) => [
      group.status,
      group._count._all,
    ])
  );

  const handlingUnitStatuses = [
    HandlingUnitStatus.OPEN,
    HandlingUnitStatus.CLOSED,
    HandlingUnitStatus.STORED,
    HandlingUnitStatus.IN_TRANSIT,
    HandlingUnitStatus.EMPTY,
    HandlingUnitStatus.CANCELLED,
  ].map((status) => ({
    status,
    label: getHandlingUnitStatusLabel(status),
    count: statusMap.get(status) ?? 0,
  }));

  const locationTypeMap = new Map<
    string,
    {
      locationCount: number;
      totalCapacity: number;
      usedCapacity: number;
    }
  >();

  for (const location of locations) {
    const current =
      locationTypeMap.get(location.locationType) ?? {
        locationCount: 0,
        totalCapacity: 0,
        usedCapacity: 0,
      };

    current.locationCount += 1;
    current.totalCapacity += Math.max(
      location.capacity,
      0
    );
    current.usedCapacity +=
      location._count.handlingUnits;

    locationTypeMap.set(
      location.locationType,
      current
    );
  }

  const locationOccupancy = Array.from(
    locationTypeMap.entries()
  )
    .map(([locationType, value]) => {
      const occupancyRate =
        value.totalCapacity > 0
          ? Math.min(
              100,
              Math.round(
                (value.usedCapacity /
                  value.totalCapacity) *
                  100
              )
            )
          : 0;

      return {
        locationType,
        ...value,
        occupancyRate,
      };
    })
    .sort(
      (first, second) =>
        second.occupancyRate -
        first.occupancyRate
    );

  const operatorMap = new Map<
    string,
    {
      operatorName: string;
      terminalCode: string;
      operationCount: number;
      quantity: number;
    }
  >();

  for (const group of operatorGroups) {
    const key =
      group.operatorName ||
      group.terminalCode ||
      "Bilinmeyen";

    const current = operatorMap.get(key) ?? {
      operatorName:
        group.operatorName || "Belirtilmedi",
      terminalCode:
        group.terminalCode || "Belirtilmedi",
      operationCount: 0,
      quantity: 0,
    };

    current.operationCount += group._count._all;
    current.quantity += group._sum.quantity ?? 0;

    operatorMap.set(key, current);
  }

  const operatorPerformance = Array.from(
    operatorMap.values()
  )
    .sort(
      (first, second) =>
        second.operationCount -
        first.operationCount
    )
    .slice(0, 8);

  const terminalCodes = terminalCodeGroups
    .map((group) => group.terminalCode)
    .filter((terminalCode): terminalCode is string =>
      Boolean(terminalCode)
    );

  const rfTerminals = await Promise.all(
    terminalCodes.map(async (terminalCode) => {
      const [
        lastOperation,
        todayOperationCount,
        todayQuantityAggregate,
      ] = await Promise.all([
        prisma.wmsOperationLog.findFirst({
          where: {
            terminalCode,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            operatorName: true,
            operationType: true,
            createdAt: true,
            isSuccessful: true,
            ipAddress: true,
          },
        }),

        prisma.wmsOperationLog.count({
          where: {
            terminalCode,
            createdAt: {
              gte: startOfToday,
              lt: endOfToday,
            },
            isSuccessful: true,
          },
        }),

        prisma.wmsOperationLog.aggregate({
          where: {
            terminalCode,
            createdAt: {
              gte: startOfToday,
              lt: endOfToday,
            },
            isSuccessful: true,
          },
          _sum: {
            quantity: true,
          },
        }),
      ]);

      return {
        terminalCode,
        operatorName:
          lastOperation?.operatorName ?? null,
        lastOperationType:
          lastOperation?.operationType ?? null,
        lastOperationLabel:
          lastOperation?.operationType
            ? getOperationLabel(
                lastOperation.operationType
              )
            : null,
        lastOperationAt:
          lastOperation?.createdAt.toISOString() ??
          null,
        lastOperationSuccessful:
          lastOperation?.isSuccessful ?? null,
        ipAddress: lastOperation?.ipAddress ?? null,
        todayOperationCount,
        todayQuantity:
          todayQuantityAggregate._sum.quantity ?? 0,
      };
    })
  );

  rfTerminals.sort((first, second) => {
    const firstTime = first.lastOperationAt
      ? new Date(first.lastOperationAt).getTime()
      : 0;
    const secondTime = second.lastOperationAt
      ? new Date(second.lastOperationAt).getTime()
      : 0;

    return secondTime - firstTime;
  });

  const topProducts = [...topProductGroups]
    .sort(
      (first, second) =>
        (second._count.productCode ?? 0) -
        (first._count.productCode ?? 0)
    )
    .slice(0, 8);

  const hourlyOperationData = Array.from(
    { length: 24 },
    (_, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      operationCount: 0,
      quantity: 0,
    })
  );

  for (const operation of todayHourlyOperations) {
    const hour = operation.createdAt.getHours();
    const bucket = hourlyOperationData[hour];

    if (bucket) {
      bucket.operationCount += 1;
      bucket.quantity += operation.quantity ?? 0;
    }
  }

  const busiestHour = hourlyOperationData.reduce(
    (currentBusiest, current) =>
      current.operationCount >
      currentBusiest.operationCount
        ? current
        : currentBusiest,
    hourlyOperationData[0]
  );

  const operatorWorkloadData = operatorPerformance.map(
    (operator) => {
      const matchingTerminal = rfTerminals.find(
        (terminal) =>
          terminal.terminalCode ===
          operator.terminalCode
      );

      const lastOperationAt =
        matchingTerminal?.lastOperationAt ?? null;

      let status: "ACTIVE" | "WAITING" | "PASSIVE" =
        "PASSIVE";

      if (lastOperationAt) {
        const elapsed =
          now.getTime() -
          new Date(lastOperationAt).getTime();

        status =
          elapsed <= 2 * 60 * 1000
            ? "ACTIVE"
            : elapsed <= 10 * 60 * 1000
              ? "WAITING"
              : "PASSIVE";
      }

      return {
        operatorName: operator.operatorName,
        terminalCode: operator.terminalCode,
        operationCount: operator.operationCount,
        quantity: operator.quantity,
        status,
        lastOperationType:
          matchingTerminal?.lastOperationType ?? null,
        lastOperationLabel:
          matchingTerminal?.lastOperationType
            ? getOperationLabel(
                matchingTerminal.lastOperationType
              )
            : null,
        lastOperationAt:
          lastOperationAt ?? null,
        lastOperationSuccessful:
          matchingTerminal?.lastOperationSuccessful ??
          null,
      };
    }
  );

  const activityOperations = recentOperations.map(
    (operation) => ({
      id: operation.id.toString(),
      operationType: operation.operationType,
      operationLabel: getOperationLabel(
        operation.operationType
      ),
      module: operation.module,
      operatorName: operation.operatorName,
      terminalCode: operation.terminalCode,
      barcode: operation.barcode,
      sourceBarcode: operation.sourceBarcode,
      targetBarcode: operation.targetBarcode,
      orderNumber: operation.orderNumber,
      productCode: operation.productCode,
      productName: operation.productName,
      quantity: operation.quantity,
      description: operation.description,
      isSuccessful: operation.isSuccessful,
      errorMessage: operation.errorMessage,
      createdAt: operation.createdAt.toISOString(),
    })
  );

  const activeTerminalCount = rfTerminals.filter(
    (terminal) => {
      if (!terminal.lastOperationAt) return false;

      return (
        now.getTime() -
          new Date(terminal.lastOperationAt).getTime() <=
        2 * 60 * 1000
      );
    }
  ).length;

  const waitingTerminalCount = rfTerminals.filter(
    (terminal) => {
      if (!terminal.lastOperationAt) return false;

      const elapsed =
        now.getTime() -
        new Date(terminal.lastOperationAt).getTime();

      return (
        elapsed > 2 * 60 * 1000 &&
        elapsed <= 10 * 60 * 1000
      );
    }
  ).length;

  const inactiveTerminalCount =
    rfTerminals.length -
    activeTerminalCount -
    waitingTerminalCount;

  const criticalAlarmCount = [
    unaddressedHandlingUnitCount > 25,
    emptyPickingUnitCount > 10,
    failedOperationCount >= 10,
    inactiveTerminalCount > 5,
  ].filter(Boolean).length;

  const warningAlarmCount = [
    unaddressedHandlingUnitCount > 10 &&
      unaddressedHandlingUnitCount <= 25,
    emptyPickingUnitCount > 0 &&
      emptyPickingUnitCount <= 10,
    failedOperationCount > 0 &&
      failedOperationCount < 10,
    inactiveTerminalCount > 0 &&
      inactiveTerminalCount <= 5,
  ].filter(Boolean).length;

  const warehouseHealthScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        criticalAlarmCount * 12 -
        warningAlarmCount * 4 -
        Math.min(failedOperationCount, 15) -
        Math.min(inactiveTerminalCount * 2, 10)
    )
  );

  return (
    <section className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <DashboardLiveHeader
        activeTerminalCount={
          activeTerminalCount
        }
        totalTerminalCount={rfTerminals.length}
        totalSuccessfulOperationCount={
          totalSuccessfulOperationCount
        }
        failedOperationCount={failedOperationCount}
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/rf"
            className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            RF Ekranını Aç
          </Link>

          <Link
            href="/admin/handling-units"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100"
          >
            THM Yönetimi
          </Link>
        </div>
      </DashboardLiveHeader>

      <section className="mt-6">
        <CriticalAlarmCenter
          unaddressedHandlingUnitCount={
            unaddressedHandlingUnitCount
          }
          emptyPickingUnitCount={
            emptyPickingUnitCount
          }
          failedOperationCount={
            failedOperationCount
          }
          activeTerminalCount={
            activeTerminalCount
          }
          waitingTerminalCount={
            waitingTerminalCount
          }
          inactiveTerminalCount={
            inactiveTerminalCount
          }
          totalTerminalCount={
            rfTerminals.length
          }
          warehouseHealthScore={
            warehouseHealthScore
          }
        />
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Bugünkü WMS Operasyonları
            </h2>

            <p className="mt-1 text-slate-500">
              Başarılı işlem kayıtlarının canlı özeti.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Toplam işlem
            </p>

            <p className="mt-1 text-3xl font-bold">
              {formatNumber(
                totalSuccessfulOperationCount
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {operationKpis.map((item) => (
            <article
              key={item.label}
              className={`rounded-2xl border p-5 ${item.className}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    {item.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {formatNumber(
                      item.metric.quantity
                    )}
                  </p>
                </div>

                <span className="text-3xl">
                  {item.icon}
                </span>
              </div>

              <p className="mt-3 text-xs font-semibold opacity-80">
                {formatNumber(
                  item.metric.operationCount
                )} işlem
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-2xl font-bold">
              Saatlik Operasyon Yoğunluğu
            </h2>

            <p className="mt-1 text-slate-500">
              Bugün tamamlanan başarılı WMS işlemlerinin
              saatlere göre dağılımı.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 px-5 py-4 text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              En yoğun saat
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {busiestHour.operationCount > 0
                ? busiestHour.hour
                : "Veri yok"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatNumber(busiestHour.operationCount)} işlem
            </p>
          </div>
        </div>

        <div className="mt-6">
          <HourlyOperationChart data={hourlyOperationData} />
        </div>
      </section>

      <section className="mt-8">
        <LiveRfTerminalPanel
          terminals={rfTerminals}
        />
      </section>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[1.5fr_1fr]">
        <LiveOperationFeed
          operations={activityOperations}
        />

        <div className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              THM Durumu
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {handlingUnitStatuses.map((item) => (
                <div
                  key={item.status}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {formatNumber(item.count)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Kritik Göstergeler
            </h2>

            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Adreslenmemiş THM",
                  value:
                    unaddressedHandlingUnitCount,
                  className:
                    "bg-orange-50 text-orange-800",
                },
                {
                  label: "Boş Picking THM",
                  value: emptyPickingUnitCount,
                  className:
                    "bg-amber-50 text-amber-800",
                },
                {
                  label: "Bugünkü Başarısız İşlem",
                  value: failedOperationCount,
                  className:
                    "bg-red-50 text-red-800",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-2xl p-4 ${item.className}`}
                >
                  <span className="font-semibold">
                    {item.label}
                  </span>

                  <strong className="text-2xl">
                    {formatNumber(item.value)}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            Lokasyon Doluluk
          </h2>

          <p className="mt-1 text-slate-500">
            Lokasyon tiplerine göre kullanılan kapasite.
          </p>

          <div className="mt-6 space-y-5">
            {locationOccupancy.map((item) => (
              <div key={item.locationType}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">
                      {item.locationType}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.locationCount} lokasyon ·{" "}
                      {item.usedCapacity}/
                      {item.totalCapacity} kapasite
                    </p>
                  </div>

                  <strong className="text-xl">
                    %{item.occupancyRate}
                  </strong>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{
                      width: `${item.occupancyRate}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {locationOccupancy.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                Aktif lokasyon bulunmuyor.
              </div>
            )}
          </div>
        </section>

        <OperatorWorkloadPanel
          operators={operatorWorkloadData}
        />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            Son RF Hareketleri
          </h2>

          <div className="mt-6 space-y-3">
            {recentRfOperations.map((operation) => (
              <div
                key={operation.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-bold">
                    {getOperationLabel(
                      operation.operationType
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {operation.operatorName ||
                      "Belirtilmedi"}{" "}
                    ·{" "}
                    {operation.terminalCode ||
                      "Terminal yok"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold">
                    {formatTime(operation.createdAt)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {operation.quantity !== null
                      ? `${formatNumber(
                          operation.quantity
                        )} miktar`
                      : operation.isSuccessful
                        ? "Başarılı"
                        : "Başarısız"}
                  </p>
                </div>
              </div>
            ))}

            {recentRfOperations.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                RF hareket kaydı bulunmuyor.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            En Çok Hareket Gören Ürünler
          </h2>

          <p className="mt-1 text-slate-500">
            Bugünkü WMS hareket kayıtlarına göre.
          </p>

          <div className="mt-6 space-y-4">
            {topProducts.map(
              (product, index) => (
                <div
                  key={`${product.productCode}-${index}`}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                      {product.productCode || "-"}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-500">
                      {product.productName ||
                        "Ürün adı bulunmuyor"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatNumber(
                        product._count.productCode ?? 0
                      )}
                    </p>

                    <p className="text-xs text-slate-500">
                      {formatNumber(
                        product._sum.quantity ?? 0
                      )} miktar
                    </p>
                  </div>
                </div>
              )
            )}

            {topProducts.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                Bugün için ürün hareketi bulunmuyor.
              </div>
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 text-right text-sm text-slate-400">
        Son güncelleme: {formatDateTime(now)}
      </p>
    </section>
  );
}