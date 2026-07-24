import {
  InventoryCountScope,
  InventoryCountStatus,
} from "@prisma/client";

import Link from "next/link";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const STATUS_LABELS:
  Record<
    InventoryCountStatus,
    string
  > = {
    DRAFT: "Taslak",
    ACTIVE: "Aktif",
    IN_PROGRESS:
      "Sayım Devam Ediyor",
    SUBMITTED:
      "Onay Bekliyor",
    APPROVED: "Onaylandı",
    CANCELLED: "İptal Edildi",
  };

const STATUS_CLASSES:
  Record<
    InventoryCountStatus,
    string
  > = {
    DRAFT:
      "bg-slate-100 text-slate-700",

    ACTIVE:
      "bg-blue-100 text-blue-800",

    IN_PROGRESS:
      "bg-cyan-100 text-cyan-800",

    SUBMITTED:
      "bg-orange-100 text-orange-800",

    APPROVED:
      "bg-emerald-100 text-emerald-800",

    CANCELLED:
      "bg-red-100 text-red-800",
  };

function getScopeLabel(
  scope: InventoryCountScope
) {
  return scope ===
    InventoryCountScope.ALL_LOCATIONS
    ? "Tüm Depo Lokasyonları"
    : "Seçili Lokasyonlar";
}

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "—";
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

export default async function InventoryCountsPage({
  searchParams,
}: Props) {
  const [profile, query] =
    await Promise.all([
      AuthorizationService.requireAnyPermission(
        [
          "INVENTORY_COUNT_VIEW",
          "INVENTORY_COUNT_MANAGE",
          "INVENTORY_COUNT_APPROVE",
        ]
      ),

      searchParams,
    ]);

  const inventoryCounts =
    await prisma.inventoryCount.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 100,

      select: {
        id: true,
        countNumber: true,
        scope: true,
        status: true,
        notes: true,

        snapshotAt: true,
        startedAt: true,
        submittedAt: true,
        approvedAt: true,
        cancelledAt: true,

        createdByName: true,
        approvedByName: true,
        cancelledByName: true,
        cancelReason: true,

        createdAt: true,

        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },

        _count: {
          select: {
            locations: true,
            lines: true,
          },
        },
      },
    });

  const canManage =
    AuthorizationService.hasPermission(
      profile,
      "INVENTORY_COUNT_MANAGE"
    );

  const totalCount =
    inventoryCounts.length;

  const activeCount =
    inventoryCounts.filter(
      (inventoryCount) =>
        inventoryCount.status ===
          InventoryCountStatus.ACTIVE ||
        inventoryCount.status ===
          InventoryCountStatus.IN_PROGRESS
    ).length;

  const submittedCount =
    inventoryCounts.filter(
      (inventoryCount) =>
        inventoryCount.status ===
        InventoryCountStatus.SUBMITTED
    ).length;

  const approvedCount =
    inventoryCounts.filter(
      (inventoryCount) =>
        inventoryCount.status ===
        InventoryCountStatus.APPROVED
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Stok ve Sayım
              Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Planlı Sayımlar
            </h1>

            <p className="mt-3 max-w-3xl text-slate-600">
              Depo veya seçili
              lokasyonlar için sayım
              planlayın, RF sürecini
              takip edin, farkları
              inceleyin ve onaylayın.
            </p>
          </div>

          {canManage && (
            <Link
              href="/admin/inventory-counts/new"
              className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800"
            >
              Yeni Sayım Oluştur
            </Link>
          )}
        </div>

        {query.success && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800"
          >
            {query.success}
          </div>
        )}

        {query.error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800"
          >
            {query.error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Toplam
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {totalCount}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Aktif
            </p>

            <p className="mt-2 text-3xl font-black text-blue-950">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
              Onay Bekleyen
            </p>

            <p className="mt-2 text-3xl font-black text-orange-950">
              {submittedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Onaylanan
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-950">
              {approvedCount}
            </p>
          </div>
        </section>

        <section className="mt-8">
          {inventoryCounts.length ===
          0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">
                📝
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                Henüz planlı sayım
                bulunmuyor
              </h2>

              <p className="mt-2 text-slate-500">
                İlk depo sayımını
                oluşturarak
                başlayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inventoryCounts.map(
                (inventoryCount) => (
                  <article
                    key={
                      inventoryCount.id
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">
                            {
                              inventoryCount.countNumber
                            }
                          </code>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              STATUS_CLASSES[
                                inventoryCount
                                  .status
                              ]
                            }`}
                          >
                            {
                              STATUS_LABELS[
                                inventoryCount
                                  .status
                              ]
                            }
                          </span>

                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                            {getScopeLabel(
                              inventoryCount.scope
                            )}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-black text-slate-950">
                          {
                            inventoryCount
                              .warehouse.code
                          }{" "}
                          -{" "}
                          {
                            inventoryCount
                              .warehouse.name
                          }
                        </h2>

                        {inventoryCount.notes && (
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            {
                              inventoryCount.notes
                            }
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/admin/inventory-counts/${inventoryCount.id}`}
                        className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
                      >
                        Sayımı Aç
                      </Link>
                    </div>

                    <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="font-bold text-slate-500">
                          Lokasyon
                        </dt>

                        <dd className="mt-1 font-black text-slate-900">
                          {
                            inventoryCount
                              ._count
                              .locations
                          }
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold text-slate-500">
                          Sayım Satırı
                        </dt>

                        <dd className="mt-1 font-black text-slate-900">
                          {
                            inventoryCount
                              ._count.lines
                          }
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold text-slate-500">
                          Oluşturan
                        </dt>

                        <dd className="mt-1 text-slate-900">
                          {
                            inventoryCount.createdByName
                          }
                        </dd>
                      </div>

                      <div>
                        <dt className="font-bold text-slate-500">
                          Oluşturulma
                        </dt>

                        <dd className="mt-1 text-slate-900">
                          {formatDate(
                            inventoryCount.createdAt
                          )}
                        </dd>
                      </div>

                      {inventoryCount.startedAt && (
                        <div>
                          <dt className="font-bold text-slate-500">
                            Başlangıç
                          </dt>

                          <dd className="mt-1 text-slate-900">
                            {formatDate(
                              inventoryCount.startedAt
                            )}
                          </dd>
                        </div>
                      )}

                      {inventoryCount.submittedAt && (
                        <div>
                          <dt className="font-bold text-slate-500">
                            Onaya Gönderilme
                          </dt>

                          <dd className="mt-1 text-slate-900">
                            {formatDate(
                              inventoryCount.submittedAt
                            )}
                          </dd>
                        </div>
                      )}

                      {inventoryCount.approvedAt && (
                        <div>
                          <dt className="font-bold text-slate-500">
                            Onay
                          </dt>

                          <dd className="mt-1 text-slate-900">
                            {formatDate(
                              inventoryCount.approvedAt
                            )}

                            {inventoryCount.approvedByName
                              ? ` · ${inventoryCount.approvedByName}`
                              : ""}
                          </dd>
                        </div>
                      )}

                      {inventoryCount.cancelledAt && (
                        <div>
                          <dt className="font-bold text-red-600">
                            İptal
                          </dt>

                          <dd className="mt-1 text-red-800">
                            {formatDate(
                              inventoryCount.cancelledAt
                            )}

                            {inventoryCount.cancelledByName
                              ? ` · ${inventoryCount.cancelledByName}`
                              : ""}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {inventoryCount.cancelReason && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <strong>
                          İptal nedeni:
                        </strong>{" "}
                        {
                          inventoryCount.cancelReason
                        }
                      </div>
                    )}
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}