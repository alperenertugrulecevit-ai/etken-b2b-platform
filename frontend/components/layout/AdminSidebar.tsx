import Link from "next/link";

export default function AdminSidebar() {
  return (
    <aside className="w-72 bg-slate-900 text-white min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-10">ETKEN Admin</h2>

      <nav className="space-y-3">
        <Link href="/admin" className="block p-3 rounded-xl hover:bg-slate-800">
          📊 Dashboard
        </Link>

        <Link href="/admin/products" className="block p-3 rounded-xl hover:bg-slate-800">
          📦 Ürün Yönetimi
        </Link>

        <Link href="#" className="block p-3 rounded-xl hover:bg-slate-800">
          🏢 Tedarikçiler
        </Link>

        <Link href="#" className="block p-3 rounded-xl hover:bg-slate-800">
          👥 Müşteriler
        </Link>

        <Link href="#" className="block p-3 rounded-xl hover:bg-slate-800">
          🛒 Siparişler
        </Link>

        <Link href="#" className="block p-3 rounded-xl hover:bg-slate-800">
          🏬 Depo / WMS
        </Link>

        <Link href="/" className="block p-3 rounded-xl hover:bg-slate-800">
          ← Siteye Dön
        </Link>
      </nav>
    </aside>
  );
}