import Link from "next/link";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import type { AuthorizationProfile } from "@/modules/authorization/types/authorization.types";

type MenuItem = {
  href: string;
  icon: string;
  label: string;
  permissionCodes?: string[];
};

const mainMenuItems: MenuItem[] = [
  {
    href: "/admin",
    icon: "📊",
    label: "Dashboard",
    permissionCodes: ["DASHBOARD_VIEW"],
  },
  {
    href: "/admin/products",
    icon: "📦",
    label: "Ürün Yönetimi",
  },
  {
    href: "/admin/categories",
    icon: "📁",
    label: "Kategori Yönetimi",
  },
  {
    href: "/admin/brands",
    icon: "🏷️",
    label: "Marka Yönetimi",
  },
  {
    href: "/admin/suppliers",
    icon: "🏭",
    label: "Tedarikçi Yönetimi",
    permissionCodes: ["RECEIVING_VIEW"],
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
    permissionCodes: ["WAVE_VIEW"],
  },
  {
    href: "/admin/purchase-orders",
    icon: "🧾",
    label: "Satın Alma",
    permissionCodes: ["RECEIVING_VIEW"],
  },
];

const stockMenuItems: MenuItem[] = [
  {
    href: "/admin/stock/movements",
    icon: "📋",
    label: "Stok Hareketleri",
    permissionCodes: ["INVENTORY_VIEW"],
  },
  {
    href: "/admin/stock/manual",
    icon: "📥",
    label: "Manuel Stok İşlemi",
    permissionCodes: ["INVENTORY_ADJUST"],
  },
  {
    href: "/admin/stock/locations",
    icon: "📍",
    label: "Lokasyon Bazlı Stok",
    permissionCodes: ["INVENTORY_VIEW"],
  },
  {
    href: "/admin/stock/location-map",
    icon: "🗺️",
    label: "Lokasyon Stok Haritası",
    permissionCodes: [
      "INVENTORY_VIEW",
      "LOCATION_VIEW",
    ],
  },
];

const handlingUnitMenuItems: MenuItem[] = [
  {
    href: "/admin/handling-units",
    icon: "🧱",
    label: "Koli / Palet Yönetimi",
    permissionCodes: ["HANDLING_UNIT_VIEW"],
  },
  {
    href: "/admin/handling-units/transfers",
    icon: "🔄",
    label: "Koli / Palet Transferi",
    permissionCodes: [
      "TRANSFER_EXECUTE",
      "HANDLING_UNIT_MANAGE",
    ],
  },
  {
    href: "/admin/handling-units/merge",
    icon: "🔗",
    label: "Toplu Birleştirme",
    permissionCodes: ["HANDLING_UNIT_MANAGE"],
  },
  {
    href: "/admin/handling-units/pallet-link",
    icon: "🔗",
    label: "Koli-Palet Bağlama",
    permissionCodes: ["HANDLING_UNIT_MANAGE"],
  },
  {
    href: "/admin/handling-units/addressing",
    icon: "📌",
    label: "Tekli Adresleme",
    permissionCodes: [
      "PUTAWAY_EXECUTE",
      "HANDLING_UNIT_MANAGE",
    ],
  },
  {
    href: "/admin/handling-units/addressing/bulk",
    icon: "📌",
    label: "Toplu Adresleme",
    permissionCodes: [
      "PUTAWAY_EXECUTE",
      "HANDLING_UNIT_MANAGE",
    ],
  },
  {
    href: "/admin/handling-units/unaddressing",
    icon: "📤",
    label: "Adres Kaldırma",
    permissionCodes: [
      "LOCATION_MANAGE",
      "HANDLING_UNIT_MANAGE",
    ],
  },
];

const wmsMenuItems: MenuItem[] = [
  {
    href: "/admin/wms-dashboard",
    icon: "📊",
    label: "WMS Dashboard",
    permissionCodes: ["DASHBOARD_VIEW"],
  },
  {
    href: "/admin/waves",
    icon: "🌊",
    label: "Wave Yönetimi",
    permissionCodes: ["WAVE_VIEW"],
  },
  {
    href: "/admin/waves/new",
    icon: "➕",
    label: "Yeni Wave Oluştur",
    permissionCodes: ["WAVE_MANAGE"],
  },
];

const warehouseMenuItems: MenuItem[] = [
  {
    href: "/admin/warehouses",
    icon: "🏬",
    label: "Depo Yönetimi",
    permissionCodes: ["WAREHOUSE_VIEW"],
  },
];

const systemMenuItems: MenuItem[] = [
  {
    href: "/admin/users",
    icon: "👤",
    label: "Kullanıcı Yönetimi",
    permissionCodes: ["USER_VIEW", "USER_MANAGE"],
  },
  {
    href: "/admin/roles",
    icon: "🛡️",
    label: "Rol ve Yetki Yönetimi",
    permissionCodes: ["ROLE_VIEW", "ROLE_MANAGE"],
  },
];

function canShowItem(
  profile: AuthorizationProfile,
  item: MenuItem
) {
  if (
    !item.permissionCodes ||
    item.permissionCodes.length === 0
  ) {
    return true;
  }

  return AuthorizationService.hasAnyPermission(
    profile,
    item.permissionCodes
  );
}

function filterMenuItems(
  profile: AuthorizationProfile,
  items: MenuItem[]
) {
  return items.filter((item) =>
    canShowItem(profile, item)
  );
}

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
      <span className="text-lg">{icon}</span>
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

function MenuGroup({
  title,
  items,
  highlighted = false,
}: {
  title: string;
  items: MenuItem[];
  highlighted?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <MenuTitle>{title}</MenuTitle>

      <div
        className={
          highlighted
            ? "space-y-1 rounded-2xl border border-blue-800 bg-blue-950/40 p-2"
            : "space-y-1"
        }
      >
        {items.map((item) => (
          <MenuLink
            key={item.href}
            {...item}
          />
        ))}
      </div>
    </>
  );
}

export default async function AdminSidebar() {
  const profile =
    await AuthorizationService.requireAdminPortalAccess();

  const visibleMainMenuItems = filterMenuItems(
    profile,
    mainMenuItems
  );

  const visibleStockMenuItems = filterMenuItems(
    profile,
    stockMenuItems
  );

  const visibleHandlingUnitMenuItems =
    filterMenuItems(
      profile,
      handlingUnitMenuItems
    );

  const visibleWmsMenuItems = filterMenuItems(
    profile,
    wmsMenuItems
  );

  const visibleWarehouseMenuItems =
    filterMenuItems(
      profile,
      warehouseMenuItems
    );

  const visibleSystemMenuItems = filterMenuItems(
    profile,
    systemMenuItems
  );

  const canUseRf = Boolean(
    profile.isRfUser &&
      profile.employee?.isActive &&
      profile.employee.canUseRf
  );

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
          <MenuGroup
            title="Genel Yönetim"
            items={visibleMainMenuItems}
          />

          <div className="my-5 border-t border-slate-700" />

          <MenuGroup
            title="Stok Yönetimi"
            items={visibleStockMenuItems}
          />

          <MenuGroup
            title="Handling Unit"
            items={visibleHandlingUnitMenuItems}
          />

          <MenuGroup
            title="WMS Operasyonları"
            items={visibleWmsMenuItems}
            highlighted
          />

          <MenuGroup
            title="Depo Yönetimi"
            items={visibleWarehouseMenuItems}
          />

          {visibleSystemMenuItems.length > 0 && (
            <>
              <MenuTitle>
                Sistem Yönetimi
              </MenuTitle>

              <div className="space-y-1 rounded-2xl border border-violet-800 bg-violet-950/30 p-2">
                {visibleSystemMenuItems.map((item) => (
                  <MenuLink
                    key={item.href}
                    {...item}
                  />
                ))}
              </div>
            </>
          )}

          <div className="my-5 border-t border-slate-700" />

          <div className="space-y-2">
            {canUseRf && (
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
            )}

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