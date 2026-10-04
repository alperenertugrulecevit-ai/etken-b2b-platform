import { CustomerAccountEntryDirection, CustomerAccountEntryType, OrderStatus } from "@prisma/client";
import Link from "next/link";

import Header from "@/components/layout/Header";
import ProductImage from "@/components/products/ProductImage";
import GuestOrderCancellationForm from "@/components/ecommerce/GuestOrderCancellationForm";
import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABELS: Record<OrderStatus, string> = {
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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ödeme Bekleniyor",
  WAITING: "Ödeme Bekleniyor",
  PAID: "Ödendi",
  COMPLETED: "Ödendi",
  FAILED: "Ödeme Başarısız",
  CANCELLED: "İptal Edildi",
  REFUNDED: "İade Edildi",
};

function paymentStatusLabel(value: string | null) {
  if (!value) return "Ödeme Bekleniyor";
  return PAYMENT_STATUS_LABELS[value.toUpperCase()] ?? value;
}

const ORDER_PROGRESS: Array<{ label: string; statuses: OrderStatus[] }> = [
  { label: "Sipariş Alındı", statuses: [OrderStatus.PENDING, OrderStatus.APPROVED] },
  { label: "Hazırlanıyor", statuses: [OrderStatus.PREPARING, OrderStatus.PICKING] },
  { label: "Paketleniyor", statuses: [OrderStatus.PACKING] },
  { label: "Sevke Hazır", statuses: [OrderStatus.READY_TO_SHIP] },
  { label: "Sevk Edildi", statuses: [OrderStatus.SHIPPED] },
  { label: "Teslim Edildi", statuses: [OrderStatus.DELIVERED] },
];

function progressIndex(status: OrderStatus) {
  if (status === OrderStatus.CANCELLED || status === OrderStatus.DRAFT) return -1;
  return ORDER_PROGRESS.findIndex((step) => step.statuses.includes(status));
}

function money(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function OrderTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; email?: string }>;
}) {
  const query = await searchParams;
  const orderNumber = String(query.order ?? "").trim().slice(0, 100);
  const email = String(query.email ?? "").trim().toLowerCase().slice(0, 160);
  const submitted = Boolean(orderNumber || email);

  const order =
    orderNumber && email
      ? await prisma.order.findFirst({
          where: {
            orderNumber: { equals: orderNumber, mode: "insensitive" },
            ecommerceEmail: { equals: email, mode: "insensitive" },
            source: "ECOMMERCE",
          },
          select: {
            orderNumber: true,
            status: true,
            createdAt: true,
            totalAmount: true,
            paymentStatus: true,
            cargoTrackingNumber: true,
            cargoTrackingUrl: true,
            accountEntries: {
              where: {
                direction: CustomerAccountEntryDirection.DEBIT,
                entryType: CustomerAccountEntryType.REFUND,
              },
              select: { amount: true },
            },
            shippingHandlingUnitOrders: {
              select: {
                shippingHandlingUnit: {
                  select: {
                    shippedAt: true,
                    dispatchDocument: {
                      select: {
                        dispatchNumber: true,
                      },
                    },
                    shipmentHandlingUnit: {
                      select: {
                        shipment: {
                          select: {
                            shipmentNumber: true,
                            shippedAt: true,
                            carrier: {
                              select: {
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            items: {
              select: {
                productName: true,
                quantity: true,
                lineTotal: true,
                product: { select: { imageUrl: true } },
              },
              orderBy: { id: "asc" },
            },
            statusHistory: {
              where: { visibleToCustomer: true },
              select: {
                status: true,
                note: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        })
      : null;

  const currentProgressIndex = order ? progressIndex(order.status) : -1;
  const refundAmount = order?.accountEntries.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
  const hasRefund = refundAmount > 0;
  const netAmount = order ? Math.max(0, order.totalAmount - refundAmount) : 0;
  const bankAccounts = order && order.paymentStatus?.toUpperCase() !== "PAID" && order.paymentStatus?.toUpperCase() !== "REFUNDED"
    ? await prisma.b2BBankAccount.findMany({
        where: { tenantId: B2B_CONSTANTS.TENANT_ID, companyId: B2B_CONSTANTS.COMPANY_ID, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id:true, bankName:true, branchName:true, accountHolder:true, iban:true, currency:true },
      })
    : [];

  const shipmentDetails = order
    ? Array.from(
        new Map(
          order.shippingHandlingUnitOrders
            .map(({ shippingHandlingUnit }) => {
              const shipment = shippingHandlingUnit.shipmentHandlingUnit?.shipment;
              const shipmentNumber = shipment?.shipmentNumber ?? null;
              const dispatchNumber = shippingHandlingUnit.dispatchDocument?.dispatchNumber ?? null;
              const shippedAt = shipment?.shippedAt ?? shippingHandlingUnit.shippedAt ?? null;

              if (!shipmentNumber && !dispatchNumber && !shippedAt) {
                return null;
              }

              const key = shipmentNumber ?? dispatchNumber ?? shippedAt?.toISOString() ?? "";
              return [
                key,
                {
                  shipmentNumber,
                  dispatchNumber,
                  carrierName: shipment?.carrier?.name ?? null,
                  shippedAt,
                },
              ] as const;
            })
            .filter((item): item is NonNullable<typeof item> => item !== null),
        ).values(),
      )
    : [];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#EF4B23]">
            E-Ticaret
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Sipariş Takibi</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Misafir siparişinizi görüntülemek için sipariş numarası ve siparişte kullandığınız e-posta adresini girin.
          </p>

          <form action="/order-tracking" method="get" className="mt-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Sipariş Numarası
              <input
                name="order"
                required
                maxLength={100}
                defaultValue={orderNumber}
                placeholder="WEB..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#EF4B23]"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              E-posta
              <input
                name="email"
                type="email"
                required
                maxLength={160}
                defaultValue={email}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#EF4B23]"
              />
            </label>
            <button type="submit" className="rounded-xl bg-[#202B38] px-5 py-3 font-black text-white hover:bg-[#111923] sm:col-span-2">
              Siparişi Görüntüle
            </button>
          </form>

          {submitted && orderNumber && email && !order ? (
            <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              Bu sipariş numarası ve e-posta adresiyle eşleşen e-ticaret siparişi bulunamadı.
            </div>
          ) : null}

          {order ? (
            <section className="mt-6 space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Sipariş</p>
                    <h2 className="mt-1 text-xl font-black">{order.orderNumber}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase text-slate-500">Durum</p>
                    <p className="mt-1 font-black text-[#EF4B23]">{STATUS_LABELS[order.status]}</p>
                    <p className="mt-2 text-xl font-black">{money(order.totalAmount)} ₺</p>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      {hasRefund ? (netAmount > 0 ? "Kısmi İade" : "İade Edildi") : paymentStatusLabel(order.paymentStatus)}
                    </p>
                  </div>
                </div>
              </div>

              {hasRefund ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                  <h2 className="text-lg font-black text-violet-950">
                    {netAmount > 0 ? "Kısmi Para İadesi" : "Para İadesi Tamamlandı"}
                  </h2>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-violet-700">İade edilen tutar</p>
                      <p className="mt-1 text-lg font-black text-violet-950">{money(refundAmount)} ₺</p>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-violet-700">Siparişte kalan net tutar</p>
                      <p className="mt-1 text-lg font-black text-violet-950">{money(netAmount)} ₺</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {bankAccounts.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h2 className="text-lg font-black text-amber-950">Havale / EFT Bilgileri</h2>
                  <p className="mt-2 text-sm text-amber-900">Ödeme açıklamasına sipariş numaranızı yazın: <strong>{order.orderNumber}</strong></p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {bankAccounts.map((account) => <div key={account.id} className="rounded-xl bg-white p-4">
                      <p className="font-black">{account.bankName}</p>
                      {account.branchName ? <p className="text-xs text-slate-500">{account.branchName}</p> : null}
                      <p className="mt-3 text-xs text-slate-500">Hesap Sahibi</p><p className="font-bold">{account.accountHolder}</p>
                      <p className="mt-3 text-xs text-slate-500">IBAN · {account.currency}</p>
                      <p className="mt-1 break-all font-mono font-black text-[#EF4B23]">{account.iban.replace(/(.{4})/g, "$1 ").trim()}</p>
                    </div>)}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Sipariş Süreci</h2>
                {order.status === OrderStatus.CANCELLED ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    Bu sipariş iptal edildi.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {ORDER_PROGRESS.map((step, index) => {
                      const completed = currentProgressIndex >= index;
                      const current = currentProgressIndex === index;

                      return (
                        <div
                          key={step.label}
                          className={
                            "rounded-xl border p-3 " +
                            (current
                              ? "border-[#EF4B23] bg-orange-50"
                              : completed
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-200 bg-slate-50")
                          }
                        >
                          <div
                            className={
                              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black " +
                              (completed ? "bg-[#202B38] text-white" : "bg-slate-200 text-slate-500")
                            }
                          >
                            {completed ? "✓" : index + 1}
                          </div>
                          <p className={"mt-2 text-sm font-bold " + (completed ? "text-slate-900" : "text-slate-500")}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Sipariş Hareketleri</h2>
                <div className="mt-4 space-y-3">
                  {order.statusHistory.length > 0 ? order.statusHistory.map((item, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>{STATUS_LABELS[item.status]}</strong>
                        <span className="text-xs text-slate-500">
                          {item.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                        </span>
                      </div>
                      {item.note ? <p className="mt-2 text-sm text-slate-600">{item.note}</p> : null}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">Sipariş hareketi henüz bulunmuyor.</p>
                  )}
                </div>
              </div>

              {order.cargoTrackingNumber ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <h2 className="text-lg font-black text-blue-950">Kargo Takibi</h2>
                  <p className="mt-2 text-sm text-blue-900">Takip numarası: <strong>{order.cargoTrackingNumber}</strong></p>
                  {order.cargoTrackingUrl ? (
                    <a href={order.cargoTrackingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-xl bg-blue-900 px-4 py-2 text-sm font-black text-white">Kargoyu Takip Et</a>
                  ) : null}
                </div>
              ) : null}

              {shipmentDetails.length > 0 ? (
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black">Sevkiyat Bilgileri</h2>
                  <div className="mt-4 space-y-3">
                    {shipmentDetails.map((shipment, index) => (
                      <div key={shipment.shipmentNumber ?? shipment.dispatchNumber ?? index} className="rounded-xl bg-slate-50 p-4">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          {shipment.carrierName ? (
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">Taşıyıcı</p>
                              <p className="mt-1 font-bold text-slate-900">{shipment.carrierName}</p>
                            </div>
                          ) : null}
                          {shipment.shipmentNumber ? (
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">Sevkiyat No</p>
                              <p className="mt-1 font-bold text-slate-900">{shipment.shipmentNumber}</p>
                            </div>
                          ) : null}
                          {shipment.dispatchNumber ? (
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">İrsaliye / Sevk Belgesi</p>
                              <p className="mt-1 font-bold text-slate-900">{shipment.dispatchNumber}</p>
                            </div>
                          ) : null}
                          {shipment.shippedAt ? (
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">Sevk Tarihi</p>
                              <p className="mt-1 font-bold text-slate-900">
                                {shipment.shippedAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Ürünler</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductImage imageUrl={item.product.imageUrl} productName={item.productName} className="h-16 w-16 shrink-0 rounded-xl border border-slate-200" fallbackClassName="h-16 w-16 shrink-0 rounded-xl text-2xl" />
                        <span className="min-w-0"><strong>{item.quantity} ×</strong> {item.productName}</span>
                      </div>
                      <strong className="whitespace-nowrap">{money(item.lineTotal)} ₺</strong>
                    </div>
                  ))}
                </div>
              </div>

              {[OrderStatus.PENDING, OrderStatus.APPROVED].includes(order.status) ? (
                <GuestOrderCancellationForm orderNumber={order.orderNumber} email={email} />
              ) : null}

              <Link href="/products" className="inline-flex rounded-xl bg-[#EF4B23] px-5 py-3 text-sm font-black text-white">
                Alışverişe Devam Et
              </Link>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
