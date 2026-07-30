import Link from "next/link";
import { redirect } from "next/navigation";
import {
  OrderStatus,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

const STATUS_LABELS:
  Record<OrderStatus, string> = {
    DRAFT: "Taslak",
    PENDING: "Onay Bekliyor",
    APPROVED: "Onaylandı",
    PREPARING: "Hazırlanıyor",
    PICKING: "Toplanıyor",
    PACKING: "Paketleniyor",
    READY_TO_SHIP: "Sevke Hazır",
    SHIPPED: "Sevk Edildi",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal Edildi",
  };

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

export default async function CustomerOrdersPage() {
  const user =
    await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !==
      UserType.CUSTOMER ||
    !user.customerId ||
    !user.customer?.isActive
  ) {
    redirect(
      "/customer-login"
    );
  }

  const orders =
    await prisma.order.findMany({
      where: {
        customerId:
          user.customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            Kurumsal Hesabım
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Siparişlerim
          </h1>
        </div>
        <Link
          href="/account"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800"
        >
          Hesabıma Dön
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow">
        {orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500">
              Henüz siparişiniz bulunmuyor.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-flex rounded-xl bg-blue-900 px-6 py-3 font-bold text-white"
            >
              Ürünleri İncele
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-5 py-3">
                    Sipariş No
                  </th>
                  <th className="px-5 py-3">
                    Tarih
                  </th>
                  <th className="px-5 py-3">
                    Satır
                  </th>
                  <th className="px-5 py-3">
                    Durum
                  </th>
                  <th className="px-5 py-3">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={
                            "/account/orders/" +
                            order.id
                          }
                          className="font-bold text-blue-900 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        {order.createdAt.toLocaleDateString(
                          "tr-TR"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {order._count.items}
                      </td>
                      <td className="px-5 py-4">
                        {STATUS_LABELS[
                          order.status
                        ]}
                      </td>
                      <td className="px-5 py-4 font-bold">
                        {formatCurrency(
                          order.totalAmount
                        )}{" "}
                        ₺
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
