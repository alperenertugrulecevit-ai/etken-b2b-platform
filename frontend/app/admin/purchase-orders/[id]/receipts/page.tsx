import Link from "next/link";
import { notFound } from "next/navigation";

import { StockMovementType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PARTIALLY_RECEIVED: "Kısmi Mal Kabul",
    RECEIVED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    PENDING: "bg-orange-100 text-orange-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PARTIALLY_RECEIVED: "bg-violet-100 text-violet-700",
    RECEIVED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return classes[status] ?? "bg-slate-100 text-slate-700";
}

export default async function PurchaseReceiptHistoryPage({
  params,
}: Props) {
  const { id } = await params;
  const purchaseOrderId = Number(id);

  if (
    !Number.isInteger(purchaseOrderId) ||
    purchaseOrderId <= 0
  ) {
    notFound();
  }

  const purchaseOrder =
    await prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },

      include: {
        supplier: {
          select: {
            name: true,
            contactName: true,
          },
        },

        items: {
          orderBy: {
            id: "asc",
          },

          select: {
            id: true,
            productId: true,
            productCode: true,
            productName: true,
            orderedQuantity: true,
            receivedQuantity: true,
            unitPrice: true,
            vatRate: true,
            lineTotal: true,
          },
        },

        stockMovements: {
          where: {
            movementType:
              StockMovementType.PURCHASE_RECEIPT,
          },

          orderBy: [
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],

          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

  if (!purchaseOrder) {
    notFound();
  }

  const totalOrderedQuantity =
    purchaseOrder.items.reduce(
      (total, item) =>
        total + item.orderedQuantity,
      0
    );

  const totalReceivedQuantity =
    purchaseOrder.items.reduce(
      (total, item) =>
        total + item.receivedQuantity,
      0
    );

  const totalRemainingQuantity =
    totalOrderedQuantity -
    totalReceivedQuantity;

  const progressRate =
    totalOrderedQuantity > 0
      ? Math.min(
          100,
          Math.round(
            (totalReceivedQuantity /
              totalOrderedQuantity) *
              100
          )
        )
      : 0;

  const receivedValue =
    purchaseOrder.items.reduce(
      (total, item) =>
        total +
        item.receivedQuantity *
          item.unitPrice,
      0
    );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">
              Mal Kabul Geçmişi
            </h1>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                purchaseOrder.status
              )}`}
            >
              {getStatusLabel(
                purchaseOrder.status
              )}
            </span>
          </div>

          <p className="mt-3 text-xl font-bold text-blue-900">
            {purchaseOrder.purchaseNumber}
          </p>

          <p className="mt-2 text-gray-500">
            {purchaseOrder.supplier.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {purchaseOrder.status ===
            "APPROVED" ||
          purchaseOrder.status ===
            "PARTIALLY_RECEIVED" ? (
            <Link
              href={`/admin/purchase-orders/${purchaseOrder.id}/receive`}
              className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
            >
              + Yeni Mal Kabul
            </Link>
          ) : null}

          <Link
            href={`/admin/purchase-orders/${purchaseOrder.id}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Satın Alma Detayına Dön
          </Link>
        </div>
      </div>

      {/* ÖZET KARTLARI */}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sipariş Miktarı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {formatNumber(
              totalOrderedQuantity
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kabul Edilen
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {formatNumber(
              totalReceivedQuantity
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kalan Miktar
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-700">
            {formatNumber(
              totalRemainingQuantity
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kabul Oranı
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            %{progressRate}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kabul Edilen Değer
          </p>

          <p className="mt-3 text-3xl font-bold text-blue-900">
            {formatCurrency(
              receivedValue
            )}{" "}
            ₺
          </p>

          <p className="mt-2 text-xs text-gray-400">
            KDV hariç yaklaşık alış değeri
          </p>
        </article>
      </div>

      {/* İLERLEME ÇUBUĞU */}

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Mal Kabul İlerlemesi
            </h2>

            <p className="mt-2 text-gray-500">
              Toplam satın alma miktarının
              teslim alınma oranı.
            </p>
          </div>

          <p className="text-3xl font-bold text-blue-900">
            %{progressRate}
          </p>
        </div>

        <div className="mt-6 h-5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{
              width: `${progressRate}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-4 text-sm text-gray-500">
          <span>
            Kabul:{" "}
            {formatNumber(
              totalReceivedQuantity
            )}
          </span>

          <span>
            Kalan:{" "}
            {formatNumber(
              totalRemainingQuantity
            )}
          </span>
        </div>
      </section>

      {/* ÜRÜN BAZINDA DURUM */}

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">
            Ürün Bazında Mal Kabul Durumu
          </h2>

          <p className="mt-2 text-gray-500">
            Her ürünün sipariş, kabul ve kalan
            miktarını inceleyin.
          </p>
        </div>

        <table className="w-full min-w-[1150px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Ürün Kodu
              </th>

              <th className="p-4">
                Ürün
              </th>

              <th className="p-4">
                Sipariş
              </th>

              <th className="p-4">
                Kabul Edilen
              </th>

              <th className="p-4">
                Kalan
              </th>

              <th className="p-4">
                İlerleme
              </th>

              <th className="p-4">
                Birim Fiyat
              </th>

              <th className="p-4">
                İşlem
              </th>
            </tr>
          </thead>

          <tbody>
            {purchaseOrder.items.map(
              (item) => {
                const remaining =
                  item.orderedQuantity -
                  item.receivedQuantity;

                const itemProgress =
                  item.orderedQuantity > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (item.receivedQuantity /
                            item.orderedQuantity) *
                            100
                        )
                      )
                    : 0;

                return (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="p-4 font-bold text-blue-900">
                      {item.productCode}
                    </td>

                    <td className="p-4 font-semibold">
                      {item.productName}
                    </td>

                    <td className="p-4">
                      {formatNumber(
                        item.orderedQuantity
                      )}
                    </td>

                    <td className="p-4 font-bold text-green-700">
                      {formatNumber(
                        item.receivedQuantity
                      )}
                    </td>

                    <td className="p-4 font-bold text-orange-700">
                      {formatNumber(
                        remaining
                      )}
                    </td>

                    <td className="p-4">
                      <div className="w-40">
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-green-600"
                            style={{
                              width: `${itemProgress}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-sm font-semibold">
                          %{itemProgress}
                        </p>
                      </div>
                    </td>

                    <td className="whitespace-nowrap p-4">
                      {formatCurrency(
                        item.unitPrice
                      )}{" "}
                      ₺
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                      >
                        Ürünü Aç
                      </Link>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </section>

      {/* MAL KABUL HAREKETLERİ */}

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">
            Mal Kabul Hareketleri
          </h2>

          <p className="mt-2 text-gray-500">
            Satın alma siparişine bağlı stok
            girişlerinin tarihçesi.
          </p>
        </div>

        <table className="w-full min-w-[1400px] text-left">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4">
                Tarih
              </th>

              <th className="p-4">
                Ürün
              </th>

              <th className="p-4">
                Belge No
              </th>

              <th className="p-4">
                Kabul Miktarı
              </th>

              <th className="p-4">
                Fiziksel Bakiye
              </th>

              <th className="p-4">
                Rezerve Bakiye
              </th>

              <th className="p-4">
                Kullanılabilir
              </th>

              <th className="p-4">
                Açıklama
              </th>

              <th className="p-4">
                İşlem
              </th>
            </tr>
          </thead>

          <tbody>
            {purchaseOrder.stockMovements.map(
              (movement) => (
                <tr
                  key={movement.id}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap p-4">
                    {formatDate(
                      movement.createdAt
                    )}
                  </td>

                  <td className="p-4">
                    <p className="font-bold text-blue-900">
                      {movement.product.code}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {movement.product.name}
                    </p>
                  </td>

                  <td className="p-4 font-semibold">
                    {movement.documentNumber ||
                      "-"}
                  </td>

                  <td className="p-4 text-xl font-bold text-green-700">
                    +
                    {formatNumber(
                      movement.physicalChange
                    )}
                  </td>

                  <td className="p-4 font-semibold">
                    {formatNumber(
                      movement.physicalBalanceAfter
                    )}
                  </td>

                  <td className="p-4 font-semibold">
                    {formatNumber(
                      movement.reservedBalanceAfter
                    )}
                  </td>

                  <td className="p-4 font-bold text-green-700">
                    {formatNumber(
                      movement.availableBalanceAfter
                    )}
                  </td>

                  <td className="max-w-96 p-4 text-sm text-gray-600">
                    {movement.description || "-"}
                  </td>

                  <td className="p-4">
                    <Link
                      href={`/admin/products/${movement.product.id}`}
                      className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                    >
                      Ürün Detayı
                    </Link>
                  </td>
                </tr>
              )
            )}

            {purchaseOrder.stockMovements.length ===
              0 && (
              <tr>
                <td
                  colSpan={9}
                  className="p-12 text-center text-gray-500"
                >
                  Bu satın alma siparişine ait
                  mal kabul hareketi henüz
                  bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}