import Link from "next/link";

import ProductExcelImportForm from "@/components/admin/ProductExcelImportForm";

export default function ProductExcelImportPage() {
  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            Ürün yönetimi
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-950">
            Excel’den Ürün İçe Aktar
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Etken Master Product Catalog dosyasındaki ürünleri
            toplu olarak sisteme ekleyin veya güncelleyin.
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
          Güvenli içe aktarma kuralları
        </h2>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
          <li>
            • Aynı ETKEN SKU varsa ürün güncellenir.
          </li>

          <li>
            • Yeni ürünün fiyatı boşsa ürün pasif oluşturulur.
          </li>

          <li>
            • Barkod boşsa geçici ve benzersiz bir barkod atanır.
          </li>

          <li>
            • Mevcut üründe boş bırakılan fiyat, stok,
            tedarikçi ve barkod alanları silinmez.
          </li>

          <li>
            • Hatalı satırlar atlanır ve sonuç tablosunda gösterilir.
          </li>
        </ul>
      </div>

      <div className="mt-8">
        <ProductExcelImportForm />
      </div>
    </section>
  );
}