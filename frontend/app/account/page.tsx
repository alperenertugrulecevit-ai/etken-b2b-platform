import Link from "next/link";
import { redirect } from "next/navigation";
import {
  OrderStatus,
  UserType,
} from "@prisma/client";

import { customerLogoutAction } from "./actions";

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

export const metadata = {
  title:
    "Hesabım | ETKEN Ofis",
};

export default async function AccountPage() {
  const user =
    await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !==
      UserType.CUSTOMER ||
    !user.customer ||
    !user.customer.isActive ||
    !user.customerId
  ) {
    redirect(
      "/customer-login"
    );
  }

  const recentOrders =
    await prisma.order.findMany({
      where: {
        customerId:
          user.customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            Kurumsal Hesabım
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            {user.customer.companyName}
          </h1>
          <p className="mt-2 text-slate-600">
            Müşteri kodu:{" "}
            {user.customer.customerCode}
          </p>
        </div>

        <form
          action={
            customerLogoutAction
          }
        >
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
          >
            Güvenli Çıkış
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/products"
          className="rounded-2xl bg-blue-900 p-6 text-white shadow hover:bg-blue-800"
        >
          <h2 className="text-xl font-bold">
            Ürünler
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Kataloğu inceleyin ve ürünleri sepetinize ekleyin.
          </p>
        </Link>

        <Link
          href="/cart"
          className="rounded-2xl bg-emerald-700 p-6 text-white shadow hover:bg-emerald-600"
        >
          <h2 className="text-xl font-bold">
            Sepetim
          </h2>
          <p className="mt-2 text-sm text-emerald-100">
            Sepetinizi ve sipariş tutarlarınızı kontrol edin.
          </p>
        </Link>

        <Link
          href="/account/orders"
          className="rounded-2xl bg-slate-900 p-6 text-white shadow hover:bg-slate-800"
        >
          <h2 className="text-xl font-bold">
            Siparişlerim
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Siparişlerinizi ve güncel durumlarını görüntüleyin.
          </p>
        </Link>

        <Link
          href="/change-password?returnTo=%2Faccount"
          className="rounded-2xl bg-violet-800 p-6 text-white shadow hover:bg-violet-700"
        >
          <h2 className="text-xl font-bold">
            Şifrem
          </h2>
          <p className="mt-2 text-sm text-violet-100">
            Mevcut şifrenizi doğrulayarak güvenli bir yeni şifre belirleyin.
          </p>
        </Link>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold">
            Son Siparişler
          </h2>
          <Link
            href="/account/orders"
            className="font-semibold text-blue-900 hover:underline"
          >
            Tümünü Gör
          </Link>
        </div>

        {recentOrders.length ===
        0 ? (
          <p className="p-6 text-slate-500">
            Henüz siparişiniz bulunmuyor.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">
                    Sipariş No
                  </th>
                  <th className="px-5 py-3">
                    Tarih
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
                {recentOrders.map(
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
                          "tr-TR",
                          {
                            timeZone:
                              "Europe/Istanbul",
                          }
                        )}
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
