import {
  InventoryCountScope,
  InventoryCountStatus,
} from "@prisma/client";

import Link from "next/link";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const STATUS_LABELS: Record<
  InventoryCountStatus,
  string
> = {
  DRAFT: "Taslak",
  ACTIVE: "Aktif",
  IN_PROGRESS: "Devam Ediyor",
  SUBMITTED: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  CANCELLED: "İptal Edildi",
};

const STATUS_STYLES: Record<
  InventoryCountStatus,
  string
> = {
  DRAFT:
    "bg-slate-100 text-slate-700",
  ACTIVE:
    "bg-blue-100 text-blue-800",
  IN_PROGRESS:
    "bg-amber-100 text-amber-800",
  SUBMITTED:
    "bg-violet-100 text-violet-800",
  APPROVED:
    "bg-emerald-100 text-emerald-800",
  CANCELLED:
    "bg-red-100 text-red-800",
};

const SCOPE_LABELS: Record<
  InventoryCountScope,
  string
> = {
  ALL_LOCATIONS:
    "Tüm Depo Lokasyonları",
  SELECTED_LOCATIONS:
    "Seçili Lokasyonlar",
};

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    }
  ).format(value);
}

export default async function RFInventoryCountsPage() {
  const profile =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  const inventoryCounts =
    await prisma.inventoryCount.findMany({
      where: {
        status: {
          in: [
            InventoryCountStatus.ACTIVE,
            InventoryCountStatus.IN_PROGRESS,
          ],
        },

        assignees: {
          some: {
            userId:
              profile.id,
          },
        },
      },

      orderBy: [
        {
          status: "desc",
        },
        {
          startedAt: "asc",
        },
        {
          countNumber: "asc",
        },
      ],

      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        locations: {
          orderBy: {
            locationCode:
              "asc",
          },

          select: {
            id: true,
            status: true,
          },
        },

        _count: {
          select: {
            locations: true,
            lines: true,
            assignees: true,
          },
        },
      },
    });

  const activeCount =
    inventoryCounts.filter(
      (inventoryCount) =>
        inventoryCount.status ===
        InventoryCountStatus.ACTIVE
    ).length;

  const inProgressCount =
    inventoryCounts.filter(
      (inventoryCount) =>
        inventoryCount.status ===
        InventoryCountStatus.IN_PROGRESS
    ).length;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-950 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Planlı Stok Sayımı
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Aktif Sayımlarım
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Size atanmış aktif sayım
              numarasını seçerek
              lokasyon, THM ve ürün
              sayımına başlayın.
            </p>
          </div>

          <Link
            href="/rf"
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-bold text-white transition hover:bg-slate-700"
          >
            RF Ana Menü
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Toplam
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                inventoryCounts.length
              }
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Aktif
            </p>

            <p className="mt-2 text-3xl font-black text-blue-300">
              {
                activeCount
              }
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Devam Eden
            </p>

            <p className="mt-2 text-3xl font-black text-amber-300">
              {
                inProgressCount
              }
            </p>
          </div>
        </div>
      </div>

      {inventoryCounts.length ===
      0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <div className="text-4xl">
            🔍
          </div>

          <h2 className="mt-4 text-xl font-black">
            Atanmış aktif sayım
            bulunmuyor
          </h2>

          <p className="mt-2 leading-6">
            Hesabınıza atanmış ve
            aktifleştirilmiş bir sayım
            numarası bulunmuyor.
            Yöneticiniz yeni bir sayım
            atadığında burada
            görünecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inventoryCounts.map(
            (inventoryCount) => {
              const completedLocations =
                inventoryCount.locations.filter(
                  (location) =>
                    location.status ===
                    "COMPLETED"
                ).length;

              const inProgressLocations =
                inventoryCount.locations.filter(
                  (location) =>
                    location.status ===
                    "IN_PROGRESS"
                ).length;

              const totalLocations =
                inventoryCount
                  ._count.locations;

              const progressRate =
                totalLocations > 0
                  ? Math.round(
                      (
                        completedLocations /
                        totalLocations
                      ) * 100
                    )
                  : 0;

              return (
                <Link
                  key={
                    inventoryCount.id
                  }
                  href={`/rf/inventory-counts/${inventoryCount.id}`}
                  className="block rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-950">
                          {
                            inventoryCount.countNumber
                          }
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            STATUS_STYLES[
                              inventoryCount.status
                            ]
                          }`}
                        >
                          {
                            STATUS_LABELS[
                              inventoryCount.status
                            ]
                          }
                        </span>
                      </div>

                      <p className="mt-2 font-bold text-blue-900">
                        {
                          inventoryCount.warehouse.code
                        }{" "}
                        -{" "}
                        {
                          inventoryCount.warehouse.name
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {
                          SCOPE_LABELS[
                            inventoryCount.scope
                          ]
                        }
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-900 px-4 py-3 text-center text-white">
                      <p className="text-xs font-bold uppercase text-blue-200">
                        İlerleme
                      </p>

                      <p className="mt-1 text-2xl font-black">
                        {progressRate}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{
                          width:
                            `${progressRate}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Lokasyon
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-900">
                        {
                          totalLocations
                        }
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs font-bold uppercase text-emerald-700">
                        Tamamlanan
                      </p>

                      <p className="mt-1 text-xl font-black text-emerald-800">
                        {
                          completedLocations
                        }
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs font-bold uppercase text-amber-700">
                        Devam Eden
                      </p>

                      <p className="mt-1 text-xl font-black text-amber-800">
                        {
                          inProgressLocations
                        }
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-xs font-bold uppercase text-blue-700">
                        Personel
                      </p>

                      <p className="mt-1 text-xl font-black text-blue-800">
                        {
                          inventoryCount
                            ._count
                            .assignees
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500">
                      Başlangıç:{" "}
                      <strong className="text-slate-700">
                        {
                          formatDate(
                            inventoryCount.startedAt
                          )
                        }
                      </strong>
                    </p>

                    <span className="font-black text-blue-900">
                      Sayımı Aç →
                    </span>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
        <h2 className="font-black">
          Sayım Uyarısı
        </h2>

        <p className="mt-2 text-sm leading-6">
          Sayım sırasında sistem
          miktarı gösterilmez. Lokasyon,
          THM ve ürün barkodlarını
          doğru sırayla okutarak
          yalnızca gördüğünüz fiziksel
          miktarı girin.
        </p>
      </div>
    </section>
  );
}