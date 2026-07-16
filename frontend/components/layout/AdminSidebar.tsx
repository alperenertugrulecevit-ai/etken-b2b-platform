import Link from "next/link";

export default function AdminSidebar() {
  return (
    <aside className="min-h-screen w-72 shrink-0 bg-slate-900 p-6 text-white">
      <h2 className="mb-2 text-2xl font-bold">
        ETKEN Admin
      </h2>

      <p className="mb-10 text-sm text-slate-400">
        Yönetim Merkezi
      </p>

      <nav className="space-y-3">
        <Link
          href="/admin"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📊 Dashboard
        </Link>

        <Link
          href="/admin/products"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📦 Ürün Yönetimi
        </Link>

        <Link
          href="/admin/categories"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📂 Kategori Yönetimi
        </Link>

        <Link
          href="/admin/brands"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🏷️ Marka Yönetimi
        </Link>

        <Link
          href="/admin/suppliers"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🏢 Tedarikçi Yönetimi
        </Link>

        <Link
          href="/admin/customers"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          👥 Müşteri Yönetimi
        </Link>

        <Link
          href="/admin/orders"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🛒 Sipariş Yönetimi
        </Link>

        <Link
          href="/admin/purchase-orders"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🧾 Satın Alma
        </Link>

        <div className="my-5 border-t border-slate-700" />

        <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Stok ve WMS
        </p>

        <Link
          href="/admin/stock/movements"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📋 Stok Hareketleri
        </Link>

        <Link
          href="/admin/stock/manual"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📥 Manuel Stok İşlemi
        </Link>

        <Link
          href="/admin/stock/locations"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📍 Lokasyon Bazlı Stok
        </Link>

        <Link
          href="/admin/stock/location-map"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🗺️ Lokasyon Stok Haritası
        </Link>

        <Link
          href="/admin/handling-units"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🧱 Koli / Palet Yönetimi
        </Link>

        <Link
          href="/admin/handling-units/transfers"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🔄 Koli / Palet Transferi
        </Link>

        <Link
          href="/admin/handling-units/merge"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🔗 Toplu Birleştirme
        </Link>

        <Link
          href="/admin/handling-units/pallet-link"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🧩 Koli–Palet Bağlama
        </Link>

        <Link
          href="/admin/handling-units/addressing"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📌 Tekli Adresleme
        </Link>

        <Link
          href="/admin/handling-units/addressing/bulk"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📌 Toplu Adresleme
        </Link>

        <Link
          href="/admin/handling-units/unaddressing"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          📤 Adres Kaldırma
        </Link>

        <Link
          href="/admin/warehouses"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          🏬 Depo Yönetimi
        </Link>

        <div className="my-5 border-t border-slate-700" />

        <div className="my-5 border-t border-slate-700" />

<Link
  href="/"
  className="block rounded-xl p-3 hover:bg-slate-800"
>
  🏠 Ana Sayfa
</Link>

<Link
  href="/rf"
  className="block rounded-xl bg-blue-700 p-3 font-bold hover:bg-blue-600"
>
  📱 RF Operasyon Merkezi
  
          ← Siteye Dön
        </Link>
      </nav>
    </aside>
  );
}