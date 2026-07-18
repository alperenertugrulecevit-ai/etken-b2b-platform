import Link from "next/link";
import { notFound } from "next/navigation";

import OperationTimeline from "@/components/admin/OperationTimeline";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function formatSimpleDate(
  value: Date | null
) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(value);
}

function getStatusLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
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

function getStatusClass(
  status: string
) {
  const classes: Record<
    string,
    string
  > = {
    DRAFT:
      "bg-slate-100 text-slate-700",
    PENDING:
      "bg-orange-100 text-orange-700",
    APPROVED:
      "bg-blue-100 text-blue-700",
    PREPARING:
      "bg-violet-100 text-violet-700",
    PICKING:
      "bg-indigo-100 text-indigo-700",
    PACKING:
      "bg-cyan-100 text-cyan-700",
    READY_TO_SHIP:
      "bg-teal-100 text-teal-700",
    SHIPPED:
      "bg-sky-100 text-sky-700",
    DELIVERED:
      "bg-green-100 text-green-700",
    CANCELLED:
      "bg-red-100 text-red-700",
  };

  return (
    classes[status] ??
    "bg-slate-100 text-slate-700"
  );
}

export default async function OrderDetailPage({
  params,
}: Props) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },

      include: {
        customer: true,
        shippingAddress: true,

        items: {
          orderBy: {
            id: "asc",
          },

          include: {
            product: {
              select: {
                brand: true,
                category: true,
                supplier: true,
                stock: true,
                ownStock: true,
              },
            },
          },
        },
      },
    });

  if (!order) {
    notFound();
  }

  // Doğru sipariş hesabı doğrudan
  // sipariş satırlarından hesaplanır.
  const calculatedSubtotal =
    order.items.reduce(
      (sum, item) =>
        sum + item.lineNet,
      0
    );

  const calculatedVatAmount =
    order.items.reduce(
      (sum, item) =>
        sum + item.vatAmount,
      0
    );

  const calculatedTotalAmount =
    calculatedSubtotal +
    calculatedVatAmount;

  const vatBreakdownMap =
    new Map<number, number>();

  for (const item of order.items) {
    const currentAmount =
      vatBreakdownMap.get(
        item.vatRate
      ) ?? 0;

    vatBreakdownMap.set(
      item.vatRate,
      currentAmount +
        item.vatAmount
    );
  }

  const vatBreakdown =
    Array.from(
      vatBreakdownMap.entries()
    )
      .map(([rate, amount]) => ({
        rate,
        amount,
      }))
      .sort(
        (first, second) =>
          first.rate - second.rate
      );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">
              Sipariş Detayı
            </h1>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                order.status
              )}`}
            >
              {getStatusLabel(
                order.status
              )}
            </span>
          </div>

          <p className="mt-3 text-lg font-semibold text-blue-900">
            {order.orderNumber}
          </p>

          <p className="mt-1 text-gray-500">
            Oluşturulma tarihi:{" "}
            {formatDate(
              order.orderDate
            )}
          </p>
        </div>

<div className="flex flex-wrap gap-3">
  {["DRAFT", "PENDING"].includes(order.status) &&
    !order.stockReserved &&
    !order.stockDeducted && (
      <Link
        href={`/admin/orders/${order.id}/edit`}
        className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
      >
        ✏️ Siparişi Güncelle
      </Link>
    )}

  <Link
    href="/admin/orders"
    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
  >
    ← Sipariş Listesine Dön
  </Link>
</div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Müşteri
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            {
              order.customer
                .companyName
            }
          </h2>

          <p className="mt-2 font-semibold text-blue-900">
            {
              order.customer
                .customerCode
            }
          </p>

          <div className="mt-5 space-y-2 text-sm text-gray-600">
            <p>
              <strong>
                Yetkili:
              </strong>{" "}
              {order.customer
                .contactName || "-"}
            </p>

            <p>
              <strong>
                Telefon:
              </strong>{" "}
              {order.customer.phone ||
                "-"}
            </p>

            <p>
              <strong>
                E-posta:
              </strong>{" "}
              {order.customer.email ||
                "-"}
            </p>

            <p>
              <strong>Vade:</strong>{" "}
              {
                order.paymentTermDays
              }{" "}
              gün
            </p>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Teslimat Adresi
          </p>

          {order.shippingAddress ? (
            <>
              <h2 className="mt-3 text-2xl font-bold">
                {
                  order
                    .shippingAddress
                    .title
                }
              </h2>

              <p className="mt-5">
                {
                  order
                    .shippingAddress
                    .address
                }
              </p>

              <p className="mt-2 font-semibold">
                {
                  order
                    .shippingAddress
                    .city
                }{" "}
                /{" "}
                {
                  order
                    .shippingAddress
                    .district
                }
              </p>

              <div className="mt-5 space-y-2 text-sm text-gray-600">
                <p>
                  <strong>
                    Teslim alacak:
                  </strong>{" "}
                  {order
                    .shippingAddress
                    .contactName ||
                    "-"}
                </p>

                <p>
                  <strong>
                    Teslim saati:
                  </strong>{" "}
                  {order
                    .shippingAddress
                    .deliveryStartTime ||
                    "--:--"}{" "}
                  -{" "}
                  {order
                    .shippingAddress
                    .deliveryEndTime ||
                    "--:--"}
                </p>

                <p>
                  <strong>
                    Forklift:
                  </strong>{" "}
                  {order
                    .shippingAddress
                    .hasForklift
                    ? "Var"
                    : "Yok"}
                </p>

                <p>
                  <strong>
                    Rampa:
                  </strong>{" "}
                  {
                    order
                      .shippingAddress
                      .rampCount
                  }
                </p>
              </div>
            </>
          ) : (
            <p className="mt-5 text-orange-700">
              Teslimat adresi
              seçilmedi.
            </p>
          )}
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sipariş Yönetimi
          </p>

          <form
            action={updateOrderStatus.bind(
              null,
              order.id
            )}
            className="mt-6"
          >
            <select
              name="status"
              defaultValue={
                order.status
              }
              className="w-full rounded-xl border bg-white p-4"
            >
              <option value="DRAFT">
                Taslak
              </option>
              <option value="PENDING">
                Bekliyor
              </option>
              <option value="APPROVED">
                Onaylandı
              </option>
              <option value="PREPARING">
                Hazırlanıyor
              </option>
              <option value="PICKING">
                Toplanıyor
              </option>
              <option value="PACKING">
                Paketleniyor
              </option>
              <option value="READY_TO_SHIP">
                Sevke Hazır
              </option>
              <option value="SHIPPED">
                Sevk Edildi
              </option>
              <option value="DELIVERED">
                Teslim Edildi
              </option>
              <option value="CANCELLED">
                İptal
              </option>
            </select>

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-blue-900 py-4 font-bold text-white"
            >
              Durumu Güncelle
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-gray-500">
              Talep Edilen Teslim
              Tarihi
            </p>

            <p className="mt-2 font-semibold">
              {formatSimpleDate(
                order.requestedDate
              )}
            </p>
          </div>
        </article>
      </div>

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">
            Sipariş Ürünleri
          </h2>
        </div>

        <table className="w-full min-w-[1450px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Sıra
              </th>
              <th className="p-4">
                Ürün Kodu
              </th>
              <th className="p-4">
                Ürün
              </th>
              <th className="p-4">
                Miktar
              </th>
              <th className="p-4">
                Birim Fiyat
              </th>
              <th className="p-4">
                KDV Hariç Tutar
              </th>
              <th className="p-4">
                KDV Oranı
              </th>
              <th className="p-4">
                KDV Tutarı
              </th>
              <th className="p-4">
                Satır Toplamı
              </th>
            </tr>
          </thead>

          <tbody>
            {order.items.map(
              (item, index) => (
                <tr
                  key={item.id}
                  className="border-b"
                >
                  <td className="p-4">
                    {index + 1}
                  </td>

                  <td className="p-4 font-semibold text-blue-900">
                    {
                      item.productCode
                    }
                  </td>

                  <td className="p-4">
                    {
                      item.productName
                    }
                  </td>

                  <td className="p-4 font-semibold">
                    {item.quantity}
                  </td>

                  <td className="whitespace-nowrap p-4">
                    {formatCurrency(
                      item.unitPrice
                    )}{" "}
                    ₺
                  </td>

                  <td className="whitespace-nowrap p-4">
                    {formatCurrency(
                      item.lineNet
                    )}{" "}
                    ₺
                  </td>

                  <td className="p-4">
                    %{item.vatRate}
                  </td>

                  <td className="whitespace-nowrap p-4">
                    {formatCurrency(
                      item.vatAmount
                    )}{" "}
                    ₺
                  </td>

                  <td className="whitespace-nowrap p-4 font-bold">
                    {formatCurrency(
                      item.lineTotal
                    )}{" "}
                    ₺
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>

      <OperationTimeline
        orderId={order.id}
        orderNumber={
          order.orderNumber
        }
        title="Sipariş Operasyon Geçmişi"
      />

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">
            Sipariş Notları
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-5">
              {order.customerNote ||
                "Müşteri notu bulunmuyor."}
            </div>

            <div className="rounded-xl bg-yellow-50 p-5">
              {order.internalNote ||
                "İç operasyon notu bulunmuyor."}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">
            Finansal Özet
          </h2>

          <div className="mt-7 space-y-5">
            <div className="flex justify-between">
              <span>
                KDV Hariç Tutar
              </span>

              <strong>
                {formatCurrency(
                  calculatedSubtotal
                )}{" "}
                ₺
              </strong>
            </div>

            <div className="border-t pt-5">
              <p className="mb-4 font-bold">
                KDV Dağılımı
              </p>

              {vatBreakdown.map(
                (vatItem) => (
                  <div
                    key={
                      vatItem.rate
                    }
                    className="mb-3 flex justify-between"
                  >
                    <span>
                      KDV %
                      {vatItem.rate}
                    </span>

                    <strong>
                      {formatCurrency(
                        vatItem.amount
                      )}{" "}
                      ₺
                    </strong>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-between border-t pt-5">
              <span>
                Toplam KDV
              </span>

              <strong>
                {formatCurrency(
                  calculatedVatAmount
                )}{" "}
                ₺
              </strong>
            </div>

            <div className="flex justify-between border-t pt-5">
              <span className="text-lg font-bold">
                Genel Toplam
              </span>

              <strong className="text-2xl text-blue-900">
                {formatCurrency(
                  calculatedTotalAmount
                )}{" "}
                ₺
              </strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}