import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
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
  });

  return (
    <section className="p-10">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Sipariş Yönetimi
          </h1>

          <p className="mt-2 text-gray-500">
            Satış siparişlerini görüntüleyin ve yönetin.
          </p>
        </div>

        <Link
          href="/admin/orders/new"
          className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
        >
          + Yeni Sipariş
        </Link>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1350px] text-left">
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
                Vade
              </th>

              <th className="p-4">
                Toplam
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
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b hover:bg-slate-50"
              >
                <td className="p-4 font-bold text-blue-900">
                  {order.orderNumber}
                </td>

                <td className="p-4 whitespace-nowrap">
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
                        {order.shippingAddress.district}
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="p-4">
                  {order._count.items} ürün satırı
                </td>

                <td className="p-4">
                  {order.paymentTermDays} gün
                </td>

                <td className="p-4 whitespace-nowrap font-bold">
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
                    {getStatusLabel(
                      order.status
                    )}
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

            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="p-10 text-center text-gray-500"
                >
                  Henüz sipariş oluşturulmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}