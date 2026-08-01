import Link from "next/link";

import Header from "@/components/layout/Header";
import {
  notFound,
  redirect,
} from "next/navigation";
import {
  B2BPaymentMethod,
  OrderStatus,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import B2BOrderStatusTracker from "@/components/b2b/B2BOrderStatusTracker";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

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

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
  }>;
};

export default async function CustomerOrderDetailPage({
  params,
  searchParams,
}: Props) {
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

  const [
    route,
    query,
  ] = await Promise.all([
    params,
    searchParams,
  ]);
  const orderId =
    Number(route.id);

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    notFound();
  }

  const order =
    await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId:
          user.customerId,
      },
      include: {
        shippingAddress: true,
        items: {
          orderBy: {
            id: "asc",
          },
        },
        statusHistory: {
          where: {
            visibleToCustomer:
              true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (!order) {
    notFound();
  }

  const bankAccounts =
    order.paymentMethod ===
    B2BPaymentMethod.BANK_TRANSFER
      ? await prisma.b2BBankAccount.findMany({
          where: {
            tenantId:
              B2B_CONSTANTS.TENANT_ID,
            companyId:
              B2B_CONSTANTS.COMPANY_ID,
            isActive: true,
          },
          orderBy: [
            { sortOrder: "asc" },
            { id: "asc" },
          ],
        })
      : [];

  return (
    <>
      <Header />

      <main className="mx-auto min-h-screen max-w-[1080px] px-4 py-4 sm:px-6">
      {query.created ===
      "true" ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 font-semibold text-emerald-800">
          Siparişiniz başarıyla oluşturuldu. Sipariş numaranız:{" "}
          {order.orderNumber}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">
            Sipariş Detayı
          </p>
          <h1 className="mt-1 text-2xl font-black">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-slate-500">
            {order.createdAt.toLocaleString(
              "tr-TR",
              {
                timeZone:
                  "Europe/Istanbul",
              }
            )}
          </p>
        </div>
        <Link
          href="/account/orders"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Siparişlerime Dön
        </Link>
      </div>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Durum
          </p>
          <p className="mt-2 font-bold">
            {STATUS_LABELS[
              order.status
            ]}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Ödeme
          </p>
          <p className="mt-2 font-bold">
            {order.paymentMethod ===
            B2BPaymentMethod.CURRENT_ACCOUNT
              ? "Cari Hesap"
              : "Havale / EFT"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Genel Toplam
          </p>
          <p className="mt-2 text-lg font-black text-[#EF4B23]">
            {formatCurrency(
              order.totalAmount
            )}{" "}
            ₺
          </p>
        </div>
      </section>

      <B2BOrderStatusTracker
        currentStatus={order.status}
        history={order.statusHistory}
      />

      {order.paymentMethod ===
      B2BPaymentMethod.BANK_TRANSFER ? (
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-black text-amber-950">
            Havale / EFT Bilgileri
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            Ödeme açıklamasına sipariş numaranızı yazınız:{" "}
            <strong>{order.orderNumber}</strong>
          </p>

          {bankAccounts.length === 0 ? (
            <p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-600">
              Banka hesap bilgileri sipariş onayından sonra paylaşılacaktır.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bankAccounts.map(
                (account) => (
                  <article
                    key={account.id}
                    className="rounded-lg bg-white p-4 shadow-sm"
                  >
                    <p className="font-black">
                      {account.bankName}
                    </p>
                    {account.branchName ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {account.branchName}
                      </p>
                    ) : null}
                    <p className="mt-4 text-sm text-slate-500">
                      Hesap Sahibi
                    </p>
                    <p className="font-semibold">
                      {account.accountHolder}
                    </p>
                    <p className="mt-4 text-sm text-slate-500">
                      IBAN · {account.currency}
                    </p>
                    <p className="mt-1 break-all font-mono font-black text-[#EF4B23]">
                      {account.iban.replace(
                        /(.{4})/g,
                        "$1 "
                      ).trim()}
                    </p>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      ) : null}

      {order.shippingAddress ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">
            Teslimat Adresi
          </h2>
          <p className="mt-3 font-semibold">
            {order.shippingAddress.title}
          </p>
          <p className="mt-1 text-slate-600">
            {order.shippingAddress.address},{" "}
            {order.shippingAddress.district} /{" "}
            {order.shippingAddress.city}
          </p>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-black">
            Ürünler
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-5 py-3">
                  Ürün
                </th>
                <th className="px-5 py-3">
                  Miktar
                </th>
                <th className="px-5 py-3">
                  Birim Fiyat
                </th>
                <th className="px-5 py-3">
                  Satır Toplamı
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <strong className="block">
                        {item.productName}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {item.productCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(
                        item.unitPrice
                      )}{" "}
                      ₺
                    </td>
                    <td className="px-5 py-4 font-bold">
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
        </div>
      </section>

      <section className="mt-6 ml-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Ara Toplam</span>
            <strong>
              {formatCurrency(
                order.subtotal
              )}{" "}
              ₺
            </strong>
          </div>
          {order.discountAmount >
          0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>
                İskonto %
                {order.discountRate}
              </span>
              <strong>
                -
                {formatCurrency(
                  order.discountAmount
                )}{" "}
                ₺
              </strong>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>KDV</span>
            <strong>
              {formatCurrency(
                order.vatAmount
              )}{" "}
              ₺
            </strong>
          </div>
          <hr />
          <div className="flex justify-between text-xl">
            <span className="font-bold">
              Genel Toplam
            </span>
            <strong className="text-[#EF4B23]">
              {formatCurrency(
                order.totalAmount
              )}{" "}
              ₺
            </strong>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
