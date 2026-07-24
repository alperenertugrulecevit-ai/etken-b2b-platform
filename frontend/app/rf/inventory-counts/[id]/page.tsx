import {
  InventoryCountStatus,
} from "@prisma/client";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type RFInventoryCountDetailPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
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

export default async function RFInventoryCountDetailPage({
  params,
  searchParams,
}: RFInventoryCountDetailPageProps) {
  const profile =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  const [
    {
      id,
    },
    query,
  ] = await Promise.all([
    params,
    searchParams,
  ]);

  const inventoryCountId =
    Number(id);

  if (
    !Number.isInteger(
      inventoryCountId
    ) ||
    inventoryCountId <= 0
  ) {
    notFound();
  }

  const inventoryCount =
    await prisma.inventoryCount.findFirst({
      where: {
        id:
          inventoryCountId,

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

      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },

        assignees: {
          orderBy: {
            fullName: "asc",
          },

          select: {
            id: true,
            userId: true,
            fullName: true,
            employeeCode: true,
          },
        },

        locations: {
          orderBy: [
            {
              status: "asc",
            },
            {
              locationCode: "asc",
            },
          ],

          include: {
            lines: {
              select: {
                id: true,
                status: true,
                countedQuantity:
                  true,
              },
            },

            _count: {
              select: {
                lines: true,
              },
            },
          },
        },
      },
    });

  if (!inventoryCount) {
    notFound();
  }

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

  const pendingLocations =
    inventoryCount.locations.filter(
      (location) =>
        location.status ===
        "PENDING"
    ).length;

  const totalLocations =
    inventoryCount.locations.length;

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
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-950 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Planlı Sayım
            </p>

            <h1 className="mt-3 text-3xl font-black">
              {
                inventoryCount.countNumber
              }
            </h1>

            <p className="mt-2 font-bold text-blue-200">
              {
                inventoryCount.warehouse.code
              }{" "}
              -{" "}
              {
                inventoryCount.warehouse.name
              }
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Sayım yapılacak
              lokasyonu seçin.
              Tamamlanan lokasyonlar
              yeniden sayıma açılamaz.
            </p>
          </div>

          <Link
            href="/rf/inventory-counts"
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-bold text-white transition hover:bg-slate-700"
          >
            Sayım Listesine Dön
          </Link>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 text-sm font-bold">
            <span>
              Genel İlerleme
            </span>

            <span>
              {progressRate}%
            </span>
          </div>

          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width:
                  `${progressRate}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Toplam
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                totalLocations
              }
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Bekliyor
            </p>

            <p className="mt-2 text-3xl font-black text-slate-200">
              {
                pendingLocations
              }
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Devam Eden
            </p>

            <p className="mt-2 text-3xl font-black text-amber-300">
              {
                inProgressLocations
              }
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Tamamlandı
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-300">
              {
                completedLocations
              }
            </p>
          </div>
        </div>
      </div>

      {query.success && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800"
        >
          {query.success}
        </div>
      )}

      {query.error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800"
        >
          {query.error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          Sayım Lokasyonları
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Barkod sayımına başlamak
          için bekleyen veya devam eden
          bir lokasyonu seçin.
        </p>

        {inventoryCount.locations.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Bu sayıma atanmış lokasyon
            bulunmuyor.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {inventoryCount.locations.map(
              (location) => {
                const countedLineCount =
                  location.lines.filter(
                    (line) =>
                      line.status ===
                        "COUNTED" ||
                      line.status ===
                        "RECOUNT_REQUIRED" ||
                      line.status ===
                        "APPROVED"
                  ).length;

                const totalLineCount =
                  location
                    ._count.lines;

                const isCompleted =
                  location.status ===
                  "COMPLETED";

                const statusLabel =
                  location.status ===
                  "PENDING"
                    ? "Bekliyor"
                    : location.status ===
                        "IN_PROGRESS"
                      ? "Devam Ediyor"
                      : "Tamamlandı";

                const statusStyle =
                  location.status ===
                  "PENDING"
                    ? "bg-slate-100 text-slate-700"
                    : location.status ===
                        "IN_PROGRESS"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800";

                const cardContent = (
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                        isCompleted
                          ? "bg-emerald-100"
                          : "bg-blue-900 text-white"
                      }`}
                    >
                      {isCompleted
                        ? "✓"
                        : "📍"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-black text-slate-950">
                          {
                            location.locationCode
                          }
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}
                        >
                          {
                            statusLabel
                          }
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>
                          Sayılan satır:{" "}
                          <strong className="text-slate-700">
                            {
                              countedLineCount
                            }
                          </strong>
                        </span>

                        <span>
                          Snapshot satırı:{" "}
                          <strong className="text-slate-700">
                            {
                              totalLineCount
                            }
                          </strong>
                        </span>
                      </div>

                      {location.countedByName && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Son işlem:{" "}
                          {
                            location.countedByName
                          }
                        </p>
                      )}
                    </div>

                    {!isCompleted && (
                      <span className="text-2xl font-black text-blue-900">
                        →
                      </span>
                    )}
                  </div>
                );

                if (isCompleted) {
                  return (
                    <article
                      key={
                        location.id
                      }
                      className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 opacity-80"
                    >
                      {
                        cardContent
                      }
                    </article>
                  );
                }

                return (
                  <Link
                    key={
                      location.id
                    }
                    href={`/rf/inventory-counts/${inventoryCount.id}/locations/${location.id}`}
                    className="block rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-md active:scale-[0.99]"
                  >
                    {
                      cardContent
                    }
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
        <h2 className="font-black">
          Atanan Personeller
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {inventoryCount.assignees.map(
            (assignee) => (
              <span
                key={
                  assignee.id
                }
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  assignee.userId ===
                  profile.id
                    ? "bg-blue-900 text-white"
                    : "bg-white text-blue-900"
                }`}
              >
                {
                  assignee.fullName
                }
              </span>
            )
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
        <h2 className="font-black">
          Kör Sayım
        </h2>

        <p className="mt-2 text-sm leading-6">
          Sistem miktarları RF
          ekranında gösterilmez.
          Lokasyonda fiziksel olarak
          gördüğünüz THM, ürün ve
          miktarları okutun.
        </p>

        <p className="mt-2 text-xs font-semibold">
          Sayım başlangıcı:{" "}
          {
            formatDate(
              inventoryCount.startedAt
            )
          }
        </p>
      </section>
    </section>
  );
}