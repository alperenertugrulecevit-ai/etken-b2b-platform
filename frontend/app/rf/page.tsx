import Link from "next/link";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type RFMenuItem = {
  title: string;
  description: string;
  icon: string;
  href: string;
  status: "active" | "planned";
  permissionCodes: string[];
};

const menuItems: RFMenuItem[] = [
  {
    title: "Mal Kabul",
    description:
      "Satın alma ürünlerini koli veya palete kabul edin.",
    icon: "📥",
    href: "/rf/receiving",
    status: "active",
    permissionCodes: [
      "RECEIVING_EXECUTE",
    ],
  },
  {
    title: "Sipariş Toplama",
    description:
      "Sipariş ürünlerini lokasyonlardan hedef toplama THM'sine aktarın.",
    icon: "🛒",
    href: "/rf/picking",
    status: "active",
    permissionCodes: [
      "PICKING_EXECUTE",
    ],
  },
  {
    title: "THM Ürün Transferi",
    description:
      "Koli veya paletler arasında tek ürün ve miktar transferi yapın.",
    icon: "🔄",
    href: "/rf/transfers",
    status: "active",
    permissionCodes: [
      "TRANSFER_EXECUTE",
    ],
  },
  {
    title: "Komple THM Transferi",
    description:
      "Kaynak koli veya paletteki tüm ürünleri hedef THM'ye aktarın.",
    icon: "📦",
    href: "/rf/full-transfer",
    status: "active",
    permissionCodes: [
      "TRANSFER_EXECUTE",
    ],
  },
  {
    title: "THM Adresleme",
    description:
      "Koli veya paleti barkod okutarak depo lokasyonuna yerleştirin.",
    icon: "📍",
    href: "/rf/addressing",
    status: "active",
    permissionCodes: [
      "PUTAWAY_EXECUTE",
    ],
  },
  {
    title: "Koli-Palet Bağlama",
    description:
      "Kolileri palete seri şekilde bağlayın.",
    icon: "🔗",
    href: "/rf/pallet-link",
    status: "active",
    permissionCodes: [
      "HANDLING_UNIT_MANAGE",
    ],
  },
  {
    title: "Paletten Koli Ayırma",
    description:
      "Bağlı kolileri paletten seri şekilde ayırın.",
    icon: "📤",
    href: "/rf/pallet-unlink",
    status: "active",
    permissionCodes: [
      "HANDLING_UNIT_MANAGE",
    ],
  },
  {
    title: "Cycle Count",
    description:
      "Lokasyon, THM ve ürün bazında anlık stok kontrolü ve düzeltmesi yapın.",
    icon: "🔁",
    href: "/rf/counting",
    status: "active",
    permissionCodes: [
      "COUNT_EXECUTE",
    ],
  },
  {
    title: "Planlı Sayım",
    description:
      "Size atanmış aktif sayım numarasını seçerek lokasyon ve THM sayımı yapın.",
    icon: "🔢",
    href: "/rf/inventory-counts",
    status: "active",
    permissionCodes: [
      "COUNT_EXECUTE",
    ],
  },
  {
    title: "Paketleme",
    description:
      "Toplanan siparişleri kontrol edin ve paketleyin.",
    icon: "🎁",
    href: "/rf/packing",
    status: "planned",
    permissionCodes: [
      "PICKING_EXECUTE",
    ],
  },
  {
    title: "Sevkiyat",
    description:
      "Hazır taşıma birimlerini sevkiyata aktarın.",
    icon: "🚚",
    href: "/rf/shipping",
    status: "planned",
    permissionCodes: [
      "WAVE_VIEW",
    ],
  },
];

export default async function RFHomePage() {
  const profile =
    await AuthorizationService.requireRfAccess();

  const visibleMenuItems =
    menuItems.filter(
      (item) =>
        AuthorizationService.hasAnyPermission(
          profile,
          item.permissionCodes
        )
    );

  const activeModuleCount =
    visibleMenuItems.filter(
      (item) =>
        item.status ===
        "active"
    ).length;

  return (
    <section>
      <div className="rounded-2xl bg-gradient-to-br from-blue-950 to-slate-900 p-6 text-white shadow-lg">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
          Mobil Depo Operasyonları
        </p>

        <h1 className="mt-3 text-3xl font-black md:text-4xl">
          RF Operasyon Merkezi
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-300">
          El terminali veya Android
          cihaz üzerinden barkod
          odaklı depo işlemlerini
          gerçekleştirin.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Aktif Modül
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                activeModuleCount
              }
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Yetkili Modül
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                visibleMenuItems.length
              }
            </p>
          </div>
        </div>
      </div>

      {visibleMenuItems.length ===
      0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-xl font-black">
            Atanmış RF operasyonu
            bulunmuyor
          </h2>

          <p className="mt-2 leading-6">
            RF erişiminiz açık ancak
            hesabınıza herhangi bir
            operasyon yetkisi
            atanmamış. Sistem
            yöneticinizle iletişime
            geçin.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleMenuItems.map(
            (item) => {
              const isActive =
                item.status ===
                "active";

              if (!isActive) {
                return (
                  <article
                    key={
                      item.title
                    }
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 opacity-70 shadow-sm"
                  >
                    <div className="absolute right-3 top-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      Yakında
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                        {
                          item.icon
                        }
                      </div>

                      <div className="min-w-0 pr-12">
                        <h2 className="text-xl font-black text-slate-700">
                          {
                            item.title
                          }
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {
                            item.description
                          }
                        </p>
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <Link
                  key={
                    item.title
                  }
                  href={
                    item.href
                  }
                  className="group rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-3xl text-white">
                      {
                        item.icon
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-black text-slate-900">
                          {
                            item.title
                          }
                        </h2>

                        <span className="text-2xl font-bold text-blue-900">
                          →
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {
                          item.description
                        }
                      </p>

                      <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        Kullanıma Hazır
                      </span>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
        <h2 className="font-black">
          El Terminali Kullanımı
        </h2>

        <p className="mt-2 text-sm leading-6">
          Barkod okuyucunun Enter tuşu
          gönderecek şekilde
          ayarlanması önerilir. Her
          işlemden sonra imleç
          otomatik olarak sıradaki
          barkod alanına taşınır.
        </p>
      </div>
    </section>
  );
}