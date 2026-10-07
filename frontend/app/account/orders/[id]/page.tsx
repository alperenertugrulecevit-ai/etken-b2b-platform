import Link from "next/link";

import Header from "@/components/layout/Header";
import ProductImage from "@/components/products/ProductImage";
import RepeatOrderButton from "@/components/account/RepeatOrderButton";
import { cancelCustomerEcommerceReturn, cancelCustomerOrder, requestCustomerEcommerceReturn } from "./actions";
import {
  notFound,
  redirect,
} from "next/navigation";
import {
  B2BPaymentMethod,
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  OrderStatus,
  OrderType,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { getCustomerOrderWhere } from "@/modules/b2b/services/customer-user-access.service";
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

const CANCELLATION_STATUS_LABELS: Record<string,string> = {
  REQUESTED:"İptal Talebi Alındı",
  APPROVED:"İptal Onaylandı",
  REJECTED:"İptal Reddedildi",
  COMPLETED:"İptal Tamamlandı",
  CANCELLED:"İptal Talebi Kapatıldı",
};
const CANCELLATION_REFUND_STATUS_LABELS: Record<string,string> = {
  NOT_REQUIRED:"Para İadesi Gerekmiyor",
  WAITING:"Para İadesi Bekleniyor",
  REQUESTED:"Para İadesi Talebi Oluşturuldu",
  REFUNDED:"Para İadesi Yapıldı",
  REJECTED:"Para İadesi Reddedildi",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ödeme Bekleniyor",
  PAID: "Ödendi",
  FAILED: "Ödeme Başarısız",
  REFUNDED: "İade Edildi",
  PARTIALLY_REFUNDED: "Kısmi İade",
  CANCELLED: "İptal",
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
        ...getCustomerOrderWhere(user),
      },
      include: {
        shippingAddress: true,
        shippingHandlingUnitOrders: {
          include: {
            shippingHandlingUnit: {
              include: {
                dispatchDocument: true,
                shipmentHandlingUnit: {
                  include: {
                    shipment: { include: { carrier: true } },
                  },
                },
              },
            },
          },
        },
        items: {
          orderBy: { id: "asc" },
          include: { product: { select: { imageUrl: true, isActive: true, price: true, vat: true, stock: true, reservedStock: true, code: true, name: true } } },
        },
        accountEntries: {
          where: {
            direction: CustomerAccountEntryDirection.DEBIT,
            entryType: CustomerAccountEntryType.REFUND,
          },
          select: { amount: true },
        },
        cargoEvents: { orderBy: { eventAt: "desc" }, take: 50 },
        statusHistory: {
          where: {
            visibleToCustomer:
              true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        ecommerceReturns: {
          orderBy: { createdAt: "desc" },
          include: {
            items: { orderBy: { createdAt: "asc" } },
            refunds: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

  if (!order) {
    notFound();
  }

  const repeatOrderItems = order.items.flatMap((item) => {
    const availableStock=Math.max(0,item.product.stock-item.product.reservedStock);
    if(!item.product.isActive||item.product.price<=0||availableStock<=0)return [];
    return [{productId:item.productId,code:item.product.code,name:item.product.name,unitPrice:item.product.price,vatRate:item.product.vat,availableStock,qty:Math.min(Math.max(1,item.quantity-item.cancelledQuantity),availableStock)}];
  });
  const unavailableRepeatItemCount=order.items.length-repeatOrderItems.length;

  const shipmentDetails=Array.from(new Map(order.shippingHandlingUnitOrders.map(({shippingHandlingUnit})=>{
    const shipment=shippingHandlingUnit.shipmentHandlingUnit?.shipment;
    const shipmentNumber=shipment?.shipmentNumber??null;
    const dispatchNumber=shippingHandlingUnit.dispatchDocument?.dispatchNumber??null;
    const shippedAt=shipment?.shippedAt??shippingHandlingUnit.shippedAt??null;
    if(!shipmentNumber&&!dispatchNumber&&!shippedAt)return null;
    const key=shipmentNumber??dispatchNumber??shippedAt?.toISOString()??"";
    return [key,{shipmentNumber,dispatchNumber,carrierName:shipment?.carrier?.name??null,shippedAt}] as const;
  }).filter((item):item is NonNullable<typeof item>=>item!==null)).values());

  const refundAmount = order.accountEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const hasRefund = refundAmount > 0;
  const netAmount = Math.max(0, order.totalAmount - refundAmount);

  const showBankTransferDetails =
    order.paymentMethod === B2BPaymentMethod.BANK_TRANSFER &&
    order.status !== OrderStatus.CANCELLED &&
    !["PAID", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"].includes(
      order.paymentStatus?.toUpperCase() ?? ""
    );

  const bankAccounts =
    showBankTransferDetails
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
        <div className="flex flex-wrap gap-2">
          <RepeatOrderButton items={repeatOrderItems} unavailableCount={unavailableRepeatItemCount}/>
          <Link
            href="/account/orders"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            Siparişlerime Dön
          </Link>
        </div>
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
            {order.paymentMethod === B2BPaymentMethod.CURRENT_ACCOUNT
              ? "Cari Hesap"
              : order.paymentMethod === B2BPaymentMethod.CREDIT_CARD
                ? "Kredi Kartı"
                : order.paymentMethod === B2BPaymentMethod.BANK_TRANSFER
                  ? "Havale / EFT"
                  : "Belirtilmedi"}
          </p>
          {order.paymentStatus ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </p>
          ) : null}
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

      {hasRefund ? (
        <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <h2 className="text-lg font-black text-violet-950">
            {netAmount > 0 ? "Kısmi Para İadesi" : "Para İadesi Tamamlandı"}
          </h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-violet-700">İade edilen tutar</p>
              <p className="mt-1 text-lg font-black text-violet-950">{formatCurrency(refundAmount)} ₺</p>
            </div>
            <div>
              <p className="text-violet-700">Siparişte kalan net tutar</p>
              <p className="mt-1 text-lg font-black text-violet-950">{formatCurrency(netAmount)} ₺</p>
            </div>
          </div>
        </section>
      ) : null}

      {order.cargoTrackingNumber ? (
        <section id="cargo-tracking" className="mt-4 scroll-mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-lg font-black text-blue-950">
            Kargomu Takip Et
          </h2>
          <p className="mt-2 text-sm text-blue-900">
            Kargo takip numaranız
          </p>
          <p className="mt-1 break-all font-mono text-lg font-black text-blue-950">
            {order.cargoTrackingNumber}
          </p>
          {order.cargoTrackingUrl ? (
            <a
              href={order.cargoTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Kargomu Takip Et
            </a>
          ) : (
            <p className="mt-3 text-xs font-semibold text-blue-700">Kargo firması bağlantısı henüz tanımlı değil. Takip hareketleri geldikçe bu ekranda görüntülenecek.</p>
          )}
        </section>
      ) : null}

      {order.cargoTrackingNumber && order.cargoEvents.length ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Kargo Hareketleri</h2>
          <div className="mt-3 space-y-2">{order.cargoEvents.map(event=><div key={event.id} className="rounded-lg bg-slate-50 p-3"><div className="flex justify-between gap-3"><strong>{event.description??event.status}</strong><span className="text-xs text-slate-500">{event.eventAt.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</span></div>{event.location?<p className="mt-1 text-sm text-slate-600">{event.location}</p>:null}</div>)}</div>
        </section>
      ) : null}

      {shipmentDetails.length>0 ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Sevkiyat Bilgileri</h2>
          <div className="mt-3 space-y-3">{shipmentDetails.map((shipment,index)=><article key={shipment.shipmentNumber??shipment.dispatchNumber??index} className="rounded-xl bg-slate-50 p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {shipment.carrierName?<div><p className="text-xs font-bold uppercase text-slate-500">Taşıyıcı</p><p className="mt-1 font-bold">{shipment.carrierName}</p></div>:null}
              {shipment.shipmentNumber?<div><p className="text-xs font-bold uppercase text-slate-500">Sevkiyat No</p><p className="mt-1 font-bold">{shipment.shipmentNumber}</p></div>:null}
              {shipment.dispatchNumber?<div><p className="text-xs font-bold uppercase text-slate-500">İrsaliye / Sevk Belgesi</p><p className="mt-1 font-bold">{shipment.dispatchNumber}</p></div>:null}
              {shipment.shippedAt?<div><p className="text-xs font-bold uppercase text-slate-500">Sevk Tarihi</p><p className="mt-1 font-bold">{shipment.shippedAt.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</p></div>:null}
            </div>
          </article>)}</div>
        </section>
      ):null}

      {showBankTransferDetails ? (
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

      {order.invoiceAddress ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Fatura Bilgileri</h2>
          {order.invoiceName ? <p className="mt-3 font-semibold">{order.invoiceName}</p> : null}
          {order.invoiceTaxOffice || order.invoiceTaxNumber ? (
            <p className="mt-1 text-sm text-slate-500">
              {order.invoiceTaxOffice ? `Vergi Dairesi: ${order.invoiceTaxOffice}` : ""}
              {order.invoiceTaxOffice && order.invoiceTaxNumber ? " · " : ""}
              {order.invoiceTaxNumber ? `VKN / TCKN: ${order.invoiceTaxNumber}` : ""}
            </p>
          ) : null}
          <p className="mt-2 text-slate-600">
            {order.invoiceAddress}, {order.invoiceDistrict} / {order.invoiceCity}
            {order.invoicePostalCode ? ` · ${order.invoicePostalCode}` : ""}
          </p>
        </section>
      ) : null}

      {order.cancellationStatus ? (
        <section className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-black text-red-900">İptal / İade Durumu</h2>
          <p className="mt-2 text-sm font-semibold text-red-800">{CANCELLATION_STATUS_LABELS[order.cancellationStatus]??order.cancellationStatus}</p>
          {order.cancellationReason ? <p className="mt-1 text-sm text-red-700">{order.cancellationReason}</p> : null}
          {order.cancellationRefundStatus ? <p className="mt-2 text-sm text-red-800">Para iadesi: {CANCELLATION_REFUND_STATUS_LABELS[order.cancellationRefundStatus]??order.cancellationRefundStatus}</p> : null}
        </section>
      ) : null}

      {order.ecommerceReturns.length ? (
        <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <h2 className="text-lg font-black text-violet-950">Ürün İade Süreci</h2>
          <div className="mt-3 space-y-3">
            {order.ecommerceReturns.map((ret) => {
              const statusLabel: Record<string,string> = {REQUESTED:"İade Talebi Alındı",PRE_RECEIVED:"Depo Ön Kabulü Yapıldı",RECEIVING:"İade Girişi Devam Ediyor",QUALITY_CONTROL:"Kalite Kontrol",PARTIALLY_COMPLETED:"Kısmi Tamamlandı",WAREHOUSE_COMPLETED:"Depo İşlemi Tamamlandı",FINANCE_PENDING:"Para İadesi Bekleniyor",COMPLETED:"İade Tamamlandı",REJECTED:"İade Reddedildi",CANCELLED:"İade İptal Edildi"};
              const refundLabel: Record<string,string> = {WAITING:"Değerlendirme Bekliyor",ELIGIBLE:"Para İadesine Uygun",REVIEW_REQUIRED:"İnceleme Bekliyor",REQUESTED:"Para İadesi Talebi Oluşturuldu",REFUNDED:"Para İadesi Yapıldı",REJECTED:"Para İadesi Uygun Değil"};
              const received=ret.items.reduce((sum,item)=>sum+item.receivedQuantity,0);
              const expected=ret.items.reduce((sum,item)=>sum+item.expectedQuantity,0);
              const refunded=ret.refunds.filter(r=>r.status==="REFUNDED").reduce((sum,r)=>sum+r.amount,0);
              return <article key={ret.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-black">{ret.returnNumber}</p><p className="mt-1 text-sm text-violet-800">{statusLabel[ret.status]??ret.status}</p></div>
                  <p className="text-xs font-bold text-slate-500">{ret.createdAt.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</p>
                </div>
                {ret.externalReturnCode?<div className="mt-3 rounded-lg bg-violet-100 p-3"><p className="text-xs font-bold uppercase text-violet-700">İade Kodu</p><p className="mt-1 break-all font-mono font-black text-violet-950">{ret.externalReturnCode}</p><p className="mt-1 text-xs text-violet-700">İade gönderinizde bu kodu kullanın ve saklayın.</p></div>:null}
                {ret.note?<p className="mt-2 text-sm text-slate-600">Talep nedeni: {ret.note}</p>:null}
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div><span className="text-slate-500">Ürün kabulü</span><p className="font-bold">{received} / {expected} adet</p></div>
                  <div><span className="text-slate-500">Finans</span><p className="font-bold">{refundLabel[ret.refundStatus]??ret.refundStatus}</p></div>
                  <div><span className="text-slate-500">İade edilen</span><p className="font-bold">{formatCurrency(refunded)} ₺</p></div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">{ret.items.map(item=><p key={item.id}>{item.productCode} · {item.productName} · Beklenen {item.expectedQuantity} / Gelen {item.receivedQuantity}</p>)}</div>
                {ret.status==="REQUESTED"?<form action={cancelCustomerEcommerceReturn.bind(null,order.id,ret.id)} className="mt-3"><button className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700">İade Talebini İptal Et</button></form>:null}
              </article>;
            })}
          </div>
        </section>
      ) : null}

      {order.orderType===OrderType.ECOMMERCE && (order.status===OrderStatus.SHIPPED || order.status===OrderStatus.DELIVERED) && order.items.some(item=>{
        const previous=order.ecommerceReturns.filter(r=>!["CANCELLED","REJECTED"].includes(r.status)).flatMap(r=>r.items).filter(r=>r.orderItemId===item.id).reduce((sum,r)=>sum+r.expectedQuantity,0);
        return item.shippedQuantity>previous;
      }) ? (
        <section className="mt-4 rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="font-black">Ürün İade Talebi</h2>
          <p className="mt-1 text-sm text-slate-600">İade talebiniz depo ön kabulü, kalite kontrolü ve finans değerlendirmesiyle mevcut iade sürecine alınır. Talep oluşturmak tek başına stok veya para iadesi hareketi oluşturmaz.</p>
          <form action={requestCustomerEcommerceReturn.bind(null,order.id)} className="mt-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50"><tr><th className="px-4 py-3">Ürün</th><th className="px-4 py-3">İadeye Açık</th><th className="px-4 py-3">İade Adedi</th></tr></thead>
                <tbody>{order.items.map(item=>{
                  const previous=order.ecommerceReturns.filter(r=>!["CANCELLED","REJECTED"].includes(r.status)).flatMap(r=>r.items).filter(r=>r.orderItemId===item.id).reduce((sum,r)=>sum+r.expectedQuantity,0);
                  const maxReturn=Math.max(0,item.shippedQuantity-previous);
                  if(maxReturn<=0)return null;
                  return <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{item.productName}</strong><p className="text-xs text-slate-500">{item.productCode}</p></td><td className="px-4 py-3 font-bold">{maxReturn} adet</td><td className="px-4 py-3"><input type="number" name={`returnQty_${item.id}`} min={0} max={maxReturn} defaultValue={0} className="w-24 rounded-lg border p-2 text-center font-bold"/></td></tr>;
                })}</tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input name="reason" required minLength={5} maxLength={500} placeholder="İade nedeninizi yazın" className="min-w-0 flex-1 rounded-xl border p-3"/>
              <button className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white">İade Talebi Oluştur</button>
            </div>
          </form>
        </section>
      ) : null}

      {order.status === OrderStatus.PENDING || order.status === OrderStatus.APPROVED ? (
        <section className="mt-4 rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <h2 className="font-black">Sipariş İptali</h2>
          <form action={cancelCustomerOrder.bind(null, order.id)} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input name="reason" maxLength={500} placeholder="İptal nedeni (isteğe bağlı)" className="min-w-0 flex-1 rounded-xl border p-3" />
            <button className="rounded-xl bg-red-600 px-5 py-3 font-black text-white">Siparişi İptal Et</button>
          </form>
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
                      <div className="flex items-center gap-3">
                        <ProductImage imageUrl={item.product.imageUrl} productName={item.productName} className="h-14 w-14 shrink-0 rounded-lg border" fallbackClassName="h-14 w-14 shrink-0 rounded-lg text-xl" />
                        <strong className="block">{item.productName}</strong>
                      </div>
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
