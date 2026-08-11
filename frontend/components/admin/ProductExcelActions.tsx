import Link from "next/link";

export default function ProductExcelActions() {
  return (
    <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
      <Link
        href="/admin/products/export"
        className="rounded-xl border border-emerald-700 bg-white px-6 py-3 text-center font-bold text-emerald-700 hover:bg-emerald-50"
      >
        Excel’e Aktar
      </Link>

      <Link
        href="/admin/products/import"
        className="rounded-xl border border-blue-900 bg-white px-6 py-3 text-center font-bold text-blue-900 hover:bg-blue-50"
      >
        Excel’den Ürün Yükle
      </Link>

      <Link
        href="/admin/products/price-update"
        className="rounded-xl border border-amber-600 bg-white px-6 py-3 text-center font-bold text-amber-700 hover:bg-amber-50"
      >
        Toplu Fiyat Güncelle
      </Link>

      <Link
        href="/admin/products/new"
        className="rounded-xl bg-blue-900 px-6 py-3 text-center font-bold text-white hover:bg-blue-800"
      >
        + Yeni Ürün Ekle
      </Link>
    </div>
  );
}