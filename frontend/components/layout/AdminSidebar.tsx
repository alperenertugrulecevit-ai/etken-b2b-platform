import Link from "next/link";

type MenuItem = {
  href: string;
  icon: string;
  label: string;
};

const mainMenuItems: MenuItem[] = [
  {
    href: "/admin",
    icon: "📊",
    label: "Dashboard",
  },
  {
    href: "/admin/products",
    icon: "📦",
    label: "Ürün Yönetimi",
  },
  {
    href: "/admin/categories",
    icon: "📂",
    label: "Kategori Yönetimi",
  },
  {
    href: "/admin/brands",
    icon: "🏷️",
    label: "Marka Yönetimi",
  },
  {
    href: "/admin/suppliers",
    icon: "🏢",
    label: "Tedarikçi Yönetimi",
  },
  {
    href: "/admin/customers",
    icon: "👥",
    label: "Müşteri Yönetimi",
  },
  {
    href: "/admin/orders",
    icon: "🛒",
    label: "Sipariş Yönetimi",
  },
  {
    href: "/admin/purchase-orders",
    icon: "🧾",
    label: "Satın Alma",
  },
];

const stockMenuItems: MenuItem[] = [
  {
    href: "/admin/stock/movements",
    icon: "📋",
    label: "Stok Hareketleri",
  },
  {
    href: "/admin/stock/manual",
    icon: "📥",
    label: "Manuel Stok İşlemi",
  },
  {
    href: "/admin/stock/locations",
    icon: "📍",
    label: "Lokasyon Bazlı Stok",
  },
  {
    href: "/admin/stock/location-map",
    icon: "🗺️",
    label: "Lokasyon Stok Haritası",
  },
];

const handlingUnitMenuItems: MenuItem[] = [
  {
    href: "/admin/handling-units",
    icon: "🧱",
    label: "Koli / Palet Yönetimi",
  },
  {
    href: "/admin/handling-units/transfers",
    icon: "🔄",
    label: "Koli / Palet Transferi",
  },
  {
    href: "/admin/handling-units/merge",
    icon: "🔗",
    label: "Toplu Birleştirme",
  },
  {
    href: "/admin/handling-units/pallet-link",
    icon: "🧩",
    label: "Koli–Palet Bağlama",
  },
  {
    href: "/admin/handling-units/addressing",
    icon: "📌",
    label: "Tekli Adresleme",
  },
  {
    href: "/admin/handling-units/addressing/bulk",
    icon: "📌",
    label: "Toplu Adresleme",
  },
  {
    href: "/admin/handling-units/unaddressing",
    icon: "📤",
    label: "Adres Kaldırma",
  },
];

const systemMenuItems: MenuItem[] = [
  {
    href: "/admin/users",
    icon: "👤",
    label: "Kullanıcı Yönetimi",
  },
];

function MenuLink({
  href,
  icon,
  label,
}: MenuItem) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
    >
      <span className="text-lg">
        {icon}
      </span>

      <span>{label}</span>
    </Link>
  );
}

function MenuTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mb-2 mt-6 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </p>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="min-h-screen w-72 shrink-0 bg-slate-900 p-6 text-white">
      <div className="sticky top-6">
        <h2 className="text-2xl font-bold">
          ETKEN Admin
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Yönetim ve WMS Merkezi
        </p>

        <nav className="mt-8">
          <MenuTitle>
            Genel Yönetim
          </MenuTitle>

          <div className="space-y-1">
            {mainMenuItems.map(
              (item) => (
                <MenuLink
                  key={item.href}
                  {...item}
                />
              )
            )}
          </div>

          <div className="my-5 border-t border-slate-700" />

          <MenuTitle>
            Stok Yönetimi
          </MenuTitle>

          <div className="space-y-1">
            {stockMenuItems.map(
              (item) => (
                <MenuLink
                  key={item.href}
                  {...item}
                />
              )
            )}
          </div>

          <MenuTitle>
            Handling Unit
          </MenuTitle>

          <div className="space-y-1">
            {handlingUnitMenuItems.map(
              (item) => (
                <MenuLink
                  key={item.href}
                  {...item}
                />
              )
            )}
          </div>

          <MenuTitle>
            WMS Operasyonları
          </MenuTitle>

          <div className="space-y-1 rounded-2xl border border-blue-800 bg-blue-950/40 p-2">
            <MenuLink
              href="/admin/wms-dashboard"
              icon="📊"
              label="WMS Dashboard"
            />

            <MenuLink
              href="/admin/waves"
              icon="🌊"
              label="Wave Yönetimi"
            />

            <MenuLink
              href="/admin/waves/new"
              icon="➕"
              label="Yeni Wave Oluştur"
            />
          </div>

          <MenuTitle>
            Depo Yönetimi
          </MenuTitle>

          <div className="space-y-1">
            <MenuLink
              href="/admin/warehouses"
              icon="🏬"
              label="Depo Yönetimi"
            />
          </div>

          <MenuTitle>
            Sistem Yönetimi
          </MenuTitle>

          <div className="space-y-1 rounded-2xl border border-violet-800 bg-violet-950/30 p-2">
            {systemMenuItems.map(
              (item) => (
                <MenuLink
                  key={item.href}
                  {...item}
                />
              )
            )}
          </div>

          <div className="my-5 border-t border-slate-700" />

          <div className="space-y-2">
            <Link
              href="/rf"
              className="flex items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-600"
            >
              <span className="text-xl">
                📱
              </span>

              <span>
                RF Operasyon Merkezi
              </span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span className="text-xl">
                🏠
              </span>

              <span>Siteye Dön</span>
            </Link>
          </div>
        </nav>
      </div>
    </aside>
  );
}