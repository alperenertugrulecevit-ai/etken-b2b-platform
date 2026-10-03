import Link from "next/link";
import Header from "@/components/layout/Header";

export const metadata = { title: "Sipariş Alındı | ETKEN Ofis" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const query = await searchParams;
  const orderNumber = query.order?.trim() || "";

  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-slate-100 px-4 py-12">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
          <h1 className="mt-5 text-3xl font-black text-slate-900">Siparişiniz Alındı</h1>
          {orderNumber ? (
            <p className="mt-3 text-slate-600">Sipariş numaranız: <strong className="text-slate-900">{orderNumber}</strong></p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Siparişiniz ödeme ve stok kontrolü sonrasında hazırlanacaktır. Havale / EFT ödeme bilgileri sipariş sürecinde paylaşılacaktır.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="rounded-xl bg-[#EF4B23] px-5 py-3 text-sm font-black text-white">Alışverişe Devam Et</Link>
            <Link
              href={orderNumber ? "/order-tracking?order=" + encodeURIComponent(orderNumber) : "/order-tracking"}
              className="rounded-xl border border-[#202B38] px-5 py-3 text-sm font-bold text-[#202B38]"
            >
              Siparişi Takip Et
            </Link>
            <Link href="/" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700">Ana Sayfa</Link>
          </div>
        </section>
      </main>
    </>
  );
}
