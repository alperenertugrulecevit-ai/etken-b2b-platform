import Link from "next/link";
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
    todayRequestedOrders,
    todayRevenueSummary,
    customerOrderGroups,
    overdueOrderCount,
    upcomingOrderCount,
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

    prisma.order.count({ where: { requestedDate: { lt: startOfToday }, status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    prisma.order.count({ where: { requestedDate: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 3 * 86400000) }, status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
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

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">ETKEN OFİS</p><h1 className="mt-1 text-3xl font-black text-slate-950">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Satış, ziyaretçi trafiği, stok ve teslimat performansı.</p></div>

      <Link
        href="/admin/shipping-planning"
        className="mb-6 flex items-center gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm transition hover:border-sky-400 hover:shadow-md"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-2xl text-white">
          🚚
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-sky-700">
            Operasyon
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Sevkiyat Planlama
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Sevkiyat, rota, araç ve sevke hazır THM planlamasını yönetin.
          </p>
        </div>
        <span className="text-2xl font-black text-blue-950">›</span>
      </Link>

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

      {/* ZİYARET VE TESLİMAT PERFORMANSI */}
      <div className="mb-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">👥 Site Ziyaret Sayısı</h2>
          <p className="mt-1 text-sm text-slate-500">Web sitesi ziyaretçi trafiği</p>
          <div className="mt-6 rounded-xl bg-blue-50 p-6">
            <p className="text-sm font-semibold text-blue-900">Ziyaret ölçümü bekleniyor</p>
            <p className="mt-2 text-sm text-blue-700">Henüz doğrulanmış bir ziyaret sayacı veri kaynağı bağlı değil. Gerçek ziyaretler ölçülmeden sayı gösterilmez.</p>
          </div>
        </section>
        <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-black text-slate-900">⏰ Geciken Siparişler</h2>
            <p className="mt-1 text-sm text-slate-500">Teslimat tarihi geçmiş ve teslim edilmemiş siparişler</p></div>
            <Link href="/admin/orders" className="text-sm font-bold text-blue-600 hover:underline">Tümünü aç →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-rose-50 p-5"><p className="text-sm text-rose-700">Geciken</p><p className="mt-2 text-4xl font-black text-rose-700">{formatNumber(overdueOrderCount)}</p></div>
            <div className="rounded-xl bg-amber-50 p-5"><p className="text-sm text-amber-700">Önümüzdeki 3 gün</p><p className="mt-2 text-4xl font-black text-amber-700">{formatNumber(upcomingOrderCount)}</p></div>
          </div>
        </section>
      </div>

      {/* SİPARİŞ DURUMLARI */}

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
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

      <div className="mt-8 text-center text-xs text-gray-400 sm:text-right sm:text-sm">
        Dashboard zamanı: {formatDate(now)}
      </div>
    </section>
  );
}
