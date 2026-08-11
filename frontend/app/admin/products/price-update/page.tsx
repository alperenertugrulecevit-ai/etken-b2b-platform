import Link from "next/link";

import ProductPriceUpdateForm from "@/components/admin/ProductPriceUpdateForm";

export default function ProductPriceUpdatePage() {
  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-700">
            Ürün yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
            Excel’den Toplu
            Fiyat Güncelle
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Mevcut ürünlerin
            satış fiyatlarını
            ETKEN SKU üzerinden
            toplu olarak
            güncelleyin.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
        >
          Ürün Listesine Dön
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-bold text-amber-900">
          Güvenli fiyat
          güncelleme
        </h2>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
          <li>
            • Eşleştirme yalnızca
            ETKEN SKU üzerinden
            yapılır.
          </li>

          <li>
            • Ürün adı, kategori,
            stok, barkod ve görsel
            değiştirilmez.
          </li>

          <li>
            • Fiyatı değişmeyen
            ürünler güncellenmez.
          </li>

          <li>
            • Sistemde bulunmayan
            SKU’lar atlanır ve
            raporlanır.
          </li>

          <li>
            • Negatif veya geçersiz
            fiyatlar kabul edilmez.
          </li>

          <li>
            • Excel’e Aktar ile
            indirdiğiniz dosyayı
            düzenleyip yeniden
            yükleyebilirsiniz.
          </li>
        </ul>
      </div>

      <div className="mt-8">
        <ProductPriceUpdateForm />
      </div>
    </section>
  );
}