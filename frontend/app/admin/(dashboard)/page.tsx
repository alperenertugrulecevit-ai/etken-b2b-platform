import Link from "next/link";
import { WmsOperationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatSimpleDate(value: Date | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PREPARING: "Hazırlanıyor",
    PICKING: "Toplanıyor",
    PACKING: "Paketleniyor",
    READY_TO_SHIP: "Sevke Hazır",
    SHIPPED: "Sevk Edildi",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
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

  return (
    classes[status] ??
    "bg-slate-100 text-slate-700"
  );
}


function getWmsOperationLabel(operationType: string) {
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

function getWmsOperationClass(operationType: string) {
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

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export default async function AdminDashboardPage() {
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
    activeProductCount,
    passiveProductCount,
    activeCustomerCount,
    todayOrderCount,
    pendingOrderCount,
    approvedOrderCount,
    preparingOrderCount,
    pickingOrderCount,
    packingOrderCount,
    readyToShipOrderCount,
    shippedOrderCount,
    deliveredOrderCount,
    cancelledOrderCount,
    productStockSummary,
    criticalProducts,
    recentOrders,
    todayRequestedOrders,
    todayRevenueSummary,
    customerOrderGroups,
    todayWmsOperationGroups,
    recentWmsOperations,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        isActive: true,
      },
    }),

    prisma.product.count({
      where: {
        isActive: false,
      },
    }),

    prisma.customer.count({
      where: {
        isActive: true,
      },
    }),

    prisma.order.count({
      where: {
        orderDate: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },
    }),

    prisma.order.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.order.count({
      where: {
        status: "APPROVED",
      },
    }),

    prisma.order.count({
      where: {
        status: "PREPARING",
      },
    }),

    prisma.order.count({
      where: {
        status: "PICKING",
      },
    }),

    prisma.order.count({
      where: {
        status: "PACKING",
      },
    }),

    prisma.order.count({
      where: {
        status: "READY_TO_SHIP",
      },
    }),

    prisma.order.count({
      where: {
        status: "SHIPPED",
      },
    }),

    prisma.order.count({
      where: {
        status: "DELIVERED",
      },
    }),

    prisma.order.count({
      where: {
        status: "CANCELLED",
      },
    }),

    prisma.product.aggregate({
      _sum: {
        stock: true,
        reservedStock: true,
      },
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        stock: "asc",
      },

      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        reservedStock: true,
        supplier: true,
      },
    }),

    prisma.order.findMany({
      take: 10,

      orderBy: {
        orderDate: "desc",
      },

      include: {
        customer: {
          select: {
            customerCode: true,
            companyName: true,
          },
        },

        shippingAddress: {
          select: {
            title: true,
            city: true,
            district: true,
          },
        },

        _count: {
          select: {
            items: true,
          },
        },
      },
    }),

    prisma.order.findMany({
      where: {
        requestedDate: {
          gte: startOfToday,
          lt: endOfToday,
        },

        status: {
          notIn: [
            "DELIVERED",
            "CANCELLED",
          ],
        },
      },

      orderBy: {
        requestedDate: "asc",
      },

      include: {
        customer: {
          select: {
            companyName: true,
          },
        },

        shippingAddress: {
          select: {
            title: true,
            city: true,
            district: true,
            deliveryStartTime: true,
            deliveryEndTime: true,
            vehicleType: true,
          },
        },
      },
    }),

    prisma.order.aggregate({
      where: {
        orderDate: {
          gte: startOfToday,
          lt: endOfToday,
        },

        status: {
          not: "CANCELLED",
        },
      },

      _sum: {
        totalAmount: true,
      },
    }),

    prisma.order.groupBy({
      by: ["customerId"],

      where: {
        status: {
          not: "CANCELLED",
        },
      },

      _count: {
        _all: true,
      },

      _sum: {
        totalAmount: true,
      },

      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },

      take: 5,
    }),

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
      take: 12,

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
  ]);

  const totalPhysicalStock =
    productStockSummary._sum.stock ?? 0;

  const totalReservedStock =
    productStockSummary._sum.reservedStock ?? 0;

  const totalAvailableStock =
    totalPhysicalStock - totalReservedStock;

  const filteredCriticalProducts = criticalProducts
    .map((product) => ({
      ...product,
      availableStock:
        product.stock - product.reservedStock,
    }))
    .filter(
      (product) =>
        product.availableStock <= 20
    )
    .sort(
      (first, second) =>
        first.availableStock -
        second.availableStock
    )
    .slice(0, 10);

  const topCustomerIds = customerOrderGroups.map(
    (group) => group.customerId
  );

  const topCustomerRecords =
    topCustomerIds.length > 0
      ? await prisma.customer.findMany({
          where: {
            id: {
              in: topCustomerIds,
            },
          },

          select: {
            id: true,
            customerCode: true,
            companyName: true,
          },
        })
      : [];

  const customerMap = new Map(
    topCustomerRecords.map((customer) => [
      customer.id,
      customer,
    ])
  );

  const topCustomers = customerOrderGroups.map(
    (group) => ({
      customer: customerMap.get(group.customerId),
      orderCount: group._count._all,
      totalAmount: group._sum.totalAmount ?? 0,
    })
  );

  const todayRevenue =
    todayRevenueSummary._sum.totalAmount ?? 0;

  const activeOperationCount =
    approvedOrderCount +
    preparingOrderCount +
    pickingOrderCount +
    packingOrderCount +
    readyToShipOrderCount;

  const todayWmsMap = new Map(
    todayWmsOperationGroups.map((group) => [
      group.operationType,
      {
        operationCount: group._count._all,
        quantity: group._sum.quantity ?? 0,
      },
    ])
  );

  const getTodayWmsMetric = (
    operationTypes: WmsOperationType[]
  ) => {
    return operationTypes.reduce(
      (summary, operationType) => {
        const value = todayWmsMap.get(operationType);

        return {
          operationCount:
            summary.operationCount +
            (value?.operationCount ?? 0),
          quantity:
            summary.quantity +
            (value?.quantity ?? 0),
        };
      },
      {
        operationCount: 0,
        quantity: 0,
      }
    );
  };

  const wmsKpis = [
    {
      label: "Mal Kabul",
      icon: "📥",
      metric: getTodayWmsMetric([
        WmsOperationType.RECEIVING,
      ]),
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    {
      label: "Adresleme",
      icon: "📍",
      metric: getTodayWmsMetric([
        WmsOperationType.ADDRESSING,
      ]),
      className:
        "border-blue-200 bg-blue-50 text-blue-800",
    },
    {
      label: "Transfer",
      icon: "🔄",
      metric: getTodayWmsMetric([
        WmsOperationType.ITEM_TRANSFER,
        WmsOperationType.FULL_TRANSFER,
      ]),
      className:
        "border-violet-200 bg-violet-50 text-violet-800",
    },
    {
      label: "Toplama",
      icon: "🧺",
      metric: getTodayWmsMetric([
        WmsOperationType.PICKING,
      ]),
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-800",
    },
    {
      label: "Paketleme",
      icon: "📦",
      metric: getTodayWmsMetric([
        WmsOperationType.PACKING,
      ]),
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-800",
    },
    {
      label: "Sevkiyat",
      icon: "🚚",
      metric: getTodayWmsMetric([
        WmsOperationType.SHIPPING,
      ]),
      className:
        "border-sky-200 bg-sky-50 text-sky-800",
    },
  ];

  const todaySuccessfulWmsOperationCount =
    todayWmsOperationGroups.reduce(
      (total, group) => total + group._count._all,
      0
    );

  return (
    <section className="p-10">
      {/* BAŞLIK */}

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Yönetim Dashboard’u
          </h1>

          <p className="mt-2 text-gray-500">
            ETKEN satış, sipariş ve stok
            operasyonlarının güncel özeti.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders/new"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Yeni Sipariş
          </Link>

          <Link
            href="/admin/products/new"
            className="rounded-xl border border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
          >
            + Yeni Ürün
          </Link>
        </div>
      </div>

      {/* WMS OPERASYON MERKEZİ */}

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Bugünkü WMS Operasyonları
            </h2>

            <p className="mt-1 text-gray-500">
              Başarılı depo hareketlerinin bugünkü canlı özeti.
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Toplam İşlem
            </p>

            <p className="mt-1 text-2xl font-bold">
              {formatNumber(
                todaySuccessfulWmsOperationCount
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {wmsKpis.map((item) => (
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
                )} işlem kaydı
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="overflow-hidden rounded-2xl border">
            <div className="border-b bg-slate-50 px-5 py-4">
              <h3 className="text-lg font-bold">
                Son WMS Operasyonları
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Sisteme en son yazılan 12 depo hareketi.
              </p>
            </div>

            <div className="divide-y">
              {recentWmsOperations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getWmsOperationClass(
                          operation.operationType
                        )}`}
                      >
                        {getWmsOperationLabel(
                          operation.operationType
                        )}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          operation.isSuccessful
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {operation.isSuccessful
                          ? "Başarılı"
                          : "Başarısız"}
                      </span>
                    </div>

                    <p className="mt-2 font-semibold">
                      {operation.description ||
                        operation.productName ||
                        operation.orderNumber ||
                        operation.barcode ||
                        operation.sourceBarcode ||
                        operation.targetBarcode ||
                        operation.module}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Modül: {operation.module}
                      </span>

                      <span>
                        Operatör:{" "}
                        {operation.operatorName ||
                          "Belirtilmedi"}
                      </span>

                      <span>
                        Terminal:{" "}
                        {operation.terminalCode ||
                          "Belirtilmedi"}
                      </span>

                      {operation.quantity !== null && (
                        <span>
                          Miktar:{" "}
                          {formatNumber(
                            operation.quantity
                          )}
                        </span>
                      )}
                    </div>

                    {!operation.isSuccessful &&
                      operation.errorMessage && (
                        <p className="mt-2 text-sm font-semibold text-red-600">
                          {operation.errorMessage}
                        </p>
                      )}
                  </div>

                  <div className="whitespace-nowrap text-right">
                    <p className="font-bold text-slate-700">
                      {formatTime(operation.createdAt)}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {formatSimpleDate(
                        operation.createdAt
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {recentWmsOperations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Henüz WMS operasyon kaydı bulunmuyor.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h3 className="text-lg font-bold">
              Operasyon Dağılımı
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Bugünkü işlem adetlerinin modüllere göre dağılımı.
            </p>

            <div className="mt-6 space-y-5">
              {wmsKpis.map((item) => {
                const highestOperationCount = Math.max(
                  1,
                  ...wmsKpis.map(
                    (kpi) =>
                      kpi.metric.operationCount
                  )
                );

                const widthPercentage =
                  (item.metric.operationCount /
                    highestOperationCount) *
                  100;

                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">
                        {item.label}
                      </span>

                      <strong>
                        {formatNumber(
                          item.metric.operationCount
                        )}
                      </strong>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800"
                        style={{
                          width: `${widthPercentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {todaySuccessfulWmsOperationCount ===
              0 && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-sm text-gray-500">
                Bugün için başarılı operasyon kaydı bulunmuyor.
              </div>
            )}
          </section>
        </div>
      </section>

      {/* ANA ÖZET KARTLARI */}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Bugünkü Sipariş
              </p>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                {formatNumber(todayOrderCount)}
              </p>
            </div>

            <span className="text-4xl">
              🛒
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Bugün oluşturulan siparişler
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Bugünkü Sipariş Tutarı
              </p>

              <p className="mt-3 text-3xl font-bold text-green-700">
                {formatCurrency(todayRevenue)} ₺
              </p>
            </div>

            <span className="text-4xl">
              💰
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            İptal siparişler hariç
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Aktif Operasyon
              </p>

              <p className="mt-3 text-4xl font-bold text-violet-700">
                {formatNumber(
                  activeOperationCount
                )}
              </p>
            </div>

            <span className="text-4xl">
              ⚙️
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Onaydan sevke hazır aşamasına kadar
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Kritik Stoklu Ürün
              </p>

              <p className="mt-3 text-4xl font-bold text-red-600">
                {formatNumber(
                  filteredCriticalProducts.length
                )}
              </p>
            </div>

            <span className="text-4xl">
              ⚠️
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Kullanılabilir stoğu 20 veya altında
          </p>
        </article>
      </div>

      {/* STOK KARTLARI */}

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Fiziksel Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {formatNumber(totalPhysicalStock)}
          </p>

          <Link
            href="/admin/products"
            className="mt-4 inline-block text-sm font-semibold text-blue-900 hover:underline"
          >
            Stok detayını aç →
          </Link>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Rezerve Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-600">
            {formatNumber(totalReservedStock)}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Onaylı siparişlere ayrılan miktar
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kullanılabilir Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {formatNumber(totalAvailableStock)}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Fiziksel stok eksi rezervasyon
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Ürün ve Müşteri
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">
                Aktif ürün
              </span>

              <strong>
                {formatNumber(activeProductCount)}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">
                Pasif ürün
              </span>

              <strong>
                {formatNumber(passiveProductCount)}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">
                Aktif müşteri
              </span>

              <strong>
                {formatNumber(activeCustomerCount)}
              </strong>
            </div>
          </div>
        </article>
      </div>

      {/* SİPARİŞ DURUMLARI */}

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Sipariş Durumları
            </h2>

            <p className="mt-1 text-gray-500">
              Tüm siparişlerin operasyon aşamalarına
              göre dağılımı.
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="font-semibold text-blue-900 hover:underline"
          >
            Tüm siparişleri aç →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {[
            {
              label: "Bekliyor",
              value: pendingOrderCount,
              className:
                "bg-orange-50 text-orange-700",
            },
            {
              label: "Onaylandı",
              value: approvedOrderCount,
              className:
                "bg-blue-50 text-blue-700",
            },
            {
              label: "Hazırlanıyor",
              value: preparingOrderCount,
              className:
                "bg-violet-50 text-violet-700",
            },
            {
              label: "Toplanıyor",
              value: pickingOrderCount,
              className:
                "bg-indigo-50 text-indigo-700",
            },
            {
              label: "Paketleniyor",
              value: packingOrderCount,
              className:
                "bg-cyan-50 text-cyan-700",
            },
            {
              label: "Sevke Hazır",
              value: readyToShipOrderCount,
              className:
                "bg-teal-50 text-teal-700",
            },
            {
              label: "Sevk Edildi",
              value: shippedOrderCount,
              className:
                "bg-sky-50 text-sky-700",
            },
            {
              label: "Teslim Edildi",
              value: deliveredOrderCount,
              className:
                "bg-green-50 text-green-700",
            },
            {
              label: "İptal",
              value: cancelledOrderCount,
              className:
                "bg-red-50 text-red-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl p-5 ${item.className}`}
            >
              <p className="text-sm font-semibold">
                {item.label}
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatNumber(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SON SİPARİŞLER */}

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
          <div>
            <h2 className="text-2xl font-bold">
              Son Siparişler
            </h2>

            <p className="mt-1 text-gray-500">
              Sisteme en son kaydedilen 10 sipariş.
            </p>
          </div>

          <Link
            href="/admin/orders/new"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Yeni Sipariş
          </Link>
        </div>

        <table className="w-full min-w-[1200px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Sipariş No
              </th>

              <th className="p-4">
                Tarih
              </th>

              <th className="p-4">
                Müşteri
              </th>

              <th className="p-4">
                Teslimat Adresi
              </th>

              <th className="p-4">
                Satır
              </th>

              <th className="p-4">
                Tutar
              </th>

              <th className="p-4">
                Durum
              </th>

              <th className="p-4">
                İşlem
              </th>
            </tr>
          </thead>

          <tbody>
            {recentOrders.map((order) => (
              <tr
                key={order.id}
                className="border-b hover:bg-slate-50"
              >
                <td className="whitespace-nowrap p-4 font-bold text-blue-900">
                  {order.orderNumber}
                </td>

                <td className="whitespace-nowrap p-4">
                  {formatDate(order.orderDate)}
                </td>

                <td className="p-4">
                  <p className="font-semibold">
                    {order.customer.companyName}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {order.customer.customerCode}
                  </p>
                </td>

                <td className="p-4">
                  {order.shippingAddress ? (
                    <>
                      <p className="font-semibold">
                        {order.shippingAddress.title}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {order.shippingAddress.city} /{" "}
                        {
                          order.shippingAddress
                            .district
                        }
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="p-4">
                  {order._count.items}
                </td>

                <td className="whitespace-nowrap p-4 font-bold">
                  {formatCurrency(
                    order.totalAmount
                  )}{" "}
                  ₺
                </td>

                <td className="p-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </td>

                <td className="p-4">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                  >
                    Görüntüle
                  </Link>
                </td>
              </tr>
            ))}

            {recentOrders.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-10 text-center text-gray-500"
                >
                  Henüz sipariş bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ALT RAPORLAR */}

      <div className="mt-8 grid gap-8 xl:grid-cols-3">
        {/* KRİTİK STOK */}

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              Kritik Stoklar
            </h2>

            <Link
              href="/admin/products"
              className="text-sm font-semibold text-blue-900 hover:underline"
            >
              Tümü →
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {filteredCriticalProducts.map(
              (product) => (
                <div
                  key={product.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-blue-900">
                        {product.code}
                      </p>

                      <p className="mt-1 font-semibold">
                        {product.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {product.supplier}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        product.availableStock <= 0
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {product.availableStock}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-4 text-sm text-gray-500">
                    <span>
                      Fiziksel: {product.stock}
                    </span>

                    <span>
                      Rezerve:{" "}
                      {product.reservedStock}
                    </span>
                  </div>
                </div>
              )
            )}

            {filteredCriticalProducts.length ===
              0 && (
              <div className="rounded-xl bg-green-50 p-5 text-center text-green-700">
                Kritik stoklu ürün bulunmuyor.
              </div>
            )}
          </div>
        </section>

        {/* BUGÜN TESLİM EDİLECEKLER */}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Bugün Teslim Edilmesi İstenenler
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Talep edilen teslim tarihi bugün olan
            açık siparişler.
          </p>

          <div className="mt-6 space-y-4">
            {todayRequestedOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-xl border p-4 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-blue-900">
                      {order.orderNumber}
                    </p>

                    <p className="mt-1 font-semibold">
                      {order.customer.companyName}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  {order.shippingAddress ? (
                    <>
                      <p>
                        {
                          order.shippingAddress
                            .title
                        }{" "}
                        —{" "}
                        {
                          order.shippingAddress
                            .city
                        }{" "}
                        /{" "}
                        {
                          order.shippingAddress
                            .district
                        }
                      </p>

                      <p className="mt-1">
                        Kabul saati:{" "}
                        {order.shippingAddress
                          .deliveryStartTime ||
                          "--:--"}{" "}
                        -{" "}
                        {order.shippingAddress
                          .deliveryEndTime ||
                          "--:--"}
                      </p>

                      <p className="mt-1">
                        Araç:{" "}
                        {order.shippingAddress
                          .vehicleType ||
                          "Belirtilmedi"}
                      </p>
                    </>
                  ) : (
                    "Teslimat adresi seçilmedi."
                  )}
                </div>
              </Link>
            ))}

            {todayRequestedOrders.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-gray-500">
                Bugün için talep edilen açık sipariş
                bulunmuyor.
              </div>
            )}
          </div>
        </section>

        {/* EN ÇOK SİPARİŞ VERENLER */}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            En Yüksek Sipariş Tutarı
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            İptal siparişler hariç müşteri sıralaması.
          </p>

          <div className="mt-6 space-y-4">
            {topCustomers.map((item, index) => (
              <div
                key={
                  item.customer?.id ??
                  `customer-${index}`
                }
                className="rounded-xl border p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-900">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.customer?.companyName ??
                        "Bilinmeyen müşteri"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.customer?.customerCode ??
                        "-"}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-between gap-3">
                      <span className="text-sm text-gray-500">
                        {item.orderCount} sipariş
                      </span>

                      <strong className="text-blue-900">
                        {formatCurrency(
                          item.totalAmount
                        )}{" "}
                        ₺
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {topCustomers.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-gray-500">
                Müşteri sipariş verisi bulunmuyor.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 text-right text-sm text-gray-400">
        Dashboard zamanı: {formatDate(now)}
      </div>
    </section>
  );
}