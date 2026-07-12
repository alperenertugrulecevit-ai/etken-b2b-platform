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

        <span className="block rounded-xl p-3 text-slate-500">
          🏬 Depo / WMS
        </span>

        <div className="my-5 border-t border-slate-700" />

        <Link
          href="/"
          className="block rounded-xl p-3 hover:bg-slate-800"
        >
          ← Siteye Dön
        </Link>
      </nav>
    </aside>
  );
}