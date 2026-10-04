"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { submitEcommerceOrderAction } from "@/app/checkout/ecommerce-actions";
import { useCart } from "@/context/CartContext";
import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

function money(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EcommerceCheckoutForm({ cities, districtsByCityCode }: { cities: Array<{code:string;name:string}>; districtsByCityCode: Record<string,string[]> }) {
  const router = useRouter();
  const { cart, isHydrated, clearCart } = useCart();
  const [invoiceType, setInvoiceType] = useState<"INDIVIDUAL" | "CORPORATE">("INDIVIDUAL");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const totals = useMemo(() => {
    const net = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const vat = cart.reduce(
      (sum, item) => sum + item.unitPrice * item.qty * (item.vatRate / 100),
      0
    );
    return { net, vat, total: net + vat };
  }, [cart]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || cart.length === 0) return;

    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");

    try {
      const result = await submitEcommerceOrderAction({
        firstName: String(data.get("firstName") ?? ""),
        lastName: String(data.get("lastName") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        address: String(data.get("address") ?? ""),
        city: String(data.get("city") ?? ""),
        district: String(data.get("district") ?? ""),
        postalCode: String(data.get("postalCode") ?? "") || null,
        invoiceType,
        invoiceName: String(data.get("invoiceName") ?? ""),
        invoiceTaxOffice: String(data.get("invoiceTaxOffice") ?? "") || null,
        invoiceTaxNumber: String(data.get("invoiceTaxNumber") ?? "") || null,
        customerNote: String(data.get("customerNote") ?? "") || null,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.qty })),
      });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      clearCart();
      router.replace("/checkout/success?order=" + encodeURIComponent(result.orderNumber));
    } catch (error) {
      console.error(error);
      setMessage("Sipariş gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setPending(false);
    }
  }

  if (!isHydrated) {
    return <div className="rounded-2xl bg-white p-10 text-center shadow">Sepet yükleniyor...</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow">
        <h2 className="text-2xl font-black">Sepetiniz boş</h2>
        <Link href="/products" className="mt-6 inline-flex rounded-xl bg-[#202B38] px-6 py-3 font-bold text-white">
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-[#EF4B23]";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Teslimat Bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Ad<input name="firstName" required maxLength={80} className={field} /></label>
            <label className="text-sm font-semibold">Soyad<input name="lastName" required maxLength={80} className={field} /></label>
            <label className="text-sm font-semibold">E-posta<input name="email" type="email" required maxLength={160} className={field} /></label>
            <label className="text-sm font-semibold">Telefon<input name="phone" type="tel" required maxLength={30} className={field} /></label>
            <CityDistrictSelect cities={cities} districtsByCityCode={districtsByCityCode} />
            <label className="text-sm font-semibold sm:col-span-2">Adres<textarea name="address" required maxLength={500} rows={3} className={field} /></label>
            <label className="text-sm font-semibold">Posta Kodu<input name="postalCode" maxLength={20} className={field} /></label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Fatura Bilgileri</h2>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => setInvoiceType("INDIVIDUAL")}
              className={"rounded-xl px-4 py-3 text-sm font-bold " + (invoiceType === "INDIVIDUAL" ? "bg-[#202B38] text-white" : "bg-slate-100")}>
              Bireysel
            </button>
            <button type="button" onClick={() => setInvoiceType("CORPORATE")}
              className={"rounded-xl px-4 py-3 text-sm font-bold " + (invoiceType === "CORPORATE" ? "bg-[#202B38] text-white" : "bg-slate-100")}>
              Kurumsal Fatura
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              {invoiceType === "CORPORATE" ? "Firma Unvanı" : "Fatura Adı Soyadı"}
              <input name="invoiceName" required={invoiceType === "CORPORATE"} maxLength={180} className={field} />
            </label>
            {invoiceType === "CORPORATE" ? (
              <>
                <label className="text-sm font-semibold">Vergi Dairesi<input name="invoiceTaxOffice" maxLength={100} className={field} /></label>
                <label className="text-sm font-semibold">Vergi No<input name="invoiceTaxNumber" required maxLength={30} className={field} /></label>
              </>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Ödeme</h2>
          <div className="mt-5 rounded-xl border-2 border-[#EF4B23] bg-orange-50 p-4">
            <strong>Havale / EFT</strong>
            <p className="mt-1 text-sm text-slate-600">Siparişiniz oluşturulduktan sonra ödeme bilgileri paylaşılır.</p>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
            <strong>Kredi / Banka Kartı</strong>
            <p className="mt-1 text-sm">Güvenli kart ödeme entegrasyonu tamamlandığında aktif olacaktır.</p>
          </div>
          <label className="mt-5 block text-sm font-semibold">Sipariş Notu
            <textarea name="customerNote" maxLength={1000} rows={3} className={field} />
          </label>
        </section>
      </div>

      <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-5">
        <h2 className="text-xl font-black">Sipariş Özeti</h2>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><span>Ürünler</span><strong>{money(totals.net)} ₺</strong></div>
          <div className="flex justify-between"><span>KDV</span><strong>{money(totals.vat)} ₺</strong></div>
          <hr />
          <div className="flex justify-between text-xl"><span className="font-black">Toplam</span><strong className="text-[#EF4B23]">{money(totals.total)} ₺</strong></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Tüm fiyatlar KDV dahildir. Bireysel alışverişte minimum sipariş tutarı yoktur.</p>
        {message ? <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div> : null}
        <button type="submit" disabled={pending}
          className="mt-6 w-full rounded-xl bg-[#EF4B23] py-4 font-black text-white hover:bg-[#D83D18] disabled:bg-slate-300">
          {pending ? "Sipariş oluşturuluyor..." : "Siparişi Tamamla"}
        </button>
        <Link href="/cart" className="mt-4 block text-center text-sm font-semibold text-slate-700">Sepete Dön</Link>
      </aside>
    </form>
  );
}
