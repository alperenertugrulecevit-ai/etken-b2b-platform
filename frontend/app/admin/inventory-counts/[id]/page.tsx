import {
  InventoryCountScope,
  InventoryCountStatus,
} from "@prisma/client";

import Link from "next/link";
import { notFound } from "next/navigation";

import InventoryCountApprovalPanel from "@/components/admin/InventoryCountApprovalPanel";

import type {
  InventoryCountApprovalLine,
} from "@/components/admin/InventoryCountApprovalPanel";

import InventoryCountAssigneeManager from "@/components/admin/InventoryCountAssigneeManager";

import type {
  AvailableInventoryCountAssignee,
} from "@/components/admin/InventoryCountAssigneeManager";

import InventoryCountStatusActions from "@/components/admin/InventoryCountStatusActions";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type InventoryCountDetailPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

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

export default async function InventoryCountDetailPage({
  params,
  searchParams,
}: InventoryCountDetailPageProps) {
  const profile =
    await AuthorizationService.requireAnyPermission(
      [
        "INVENTORY_COUNT_VIEW",
        "INVENTORY_COUNT_MANAGE",
        "INVENTORY_COUNT_APPROVE",
      ]
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
    await prisma.inventoryCount.findUnique({
      where: {
        id:
          inventoryCountId,
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
          orderBy: [
            {
              fullName: "asc",
            },
            {
              username: "asc",
            },
          ],
        },

        locations: {
          orderBy: {
            locationCode:
              "asc",
          },

          include: {
            _count: {
              select: {
                lines: true,
              },
            },
          },
        },

        lines: {
          orderBy: [
            {
              locationCode:
                "asc",
            },
            {
              handlingUnitBarcode:
                "asc",
            },
            {
              productCode:
                "asc",
            },
          ],

          select: {
            id: true,
            locationCode: true,

            handlingUnitBarcode:
              true,

            handlingUnitType:
              true,

            productCode: true,
            productBarcode: true,
            productName: true,

            systemQuantity: true,
            countedQuantity: true,
            difference: true,

            countedByName: true,
            countedAt: true,
            note: true,

            isDiscovered: true,
            status: true,

            appliedQuantityChange:
              true,
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

  if (!inventoryCount) {
    notFound();
  }

  const assignedUserIds =
    inventoryCount.assignees.map(
      (assignee) =>
        assignee.userId
    );

  const availableAssigneeRecords =
    await prisma.user.findMany({
      where: {
        status: "ACTIVE",

        employee: {
          is: {
            isActive: true,
          },
        },

        ...(assignedUserIds.length > 0
          ? {
              id: {
                notIn:
                  assignedUserIds,
              },
            }
          : {}),
      },

      orderBy: {
        username: "asc",
      },

      select: {
        id: true,
        username: true,

        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            title: true,
          },
        },
      },
    });

  const availableAssignees:
    AvailableInventoryCountAssignee[] =
    availableAssigneeRecords
      .flatMap((user) => {
        if (!user.employee) {
          return [];
        }

        return [
          {
            userId:
              user.id,

            username:
              user.username,

            employeeCode:
              user.employee.employeeCode,

            fullName:
              `${user.employee.firstName} ${user.employee.lastName}`,

            department:
              user.employee.department ??
              "",

            title:
              user.employee.title ??
              "",
          },
        ];
      })
      .sort(
        (
          firstAssignee,
          secondAssignee
        ) =>
          firstAssignee.fullName.localeCompare(
            secondAssignee.fullName,
            "tr"
          )
      );

  const approvalLines:
    InventoryCountApprovalLine[] =
    inventoryCount.lines.map(
      (line) => ({
        id: line.id,

        locationCode:
          line.locationCode,

        handlingUnitBarcode:
          line.handlingUnitBarcode,

        handlingUnitType:
          line.handlingUnitType,

        productCode:
          line.productCode,

        productBarcode:
          line.productBarcode,

        productName:
          line.productName,

        systemQuantity:
          line.systemQuantity,

        countedQuantity:
          line.countedQuantity,

        difference:
          line.difference,

        countedByName:
          line.countedByName ??
          "",

        countedAt:
          formatDate(
            line.countedAt
          ),

        note:
          line.note ??
          "",

        isDiscovered:
          line.isDiscovered,

        status:
          line.status,

        appliedQuantityChange:
          line.appliedQuantityChange,
      })
    );

  const canManage =
    AuthorizationService.hasPermission(
      profile,
      "INVENTORY_COUNT_MANAGE"
    );

  const canApprove =
    AuthorizationService.hasPermission(
      profile,
      "INVENTORY_COUNT_APPROVE"
    );

  const completedLocationCount =
    inventoryCount.locations.filter(
      (location) =>
        location.status ===
        "COMPLETED"
    ).length;

  const inProgressLocationCount =
    inventoryCount.locations.filter(
      (location) =>
        location.status ===
        "IN_PROGRESS"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Planlı Sayım
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {
                inventoryCount.countNumber
              }
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
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

              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-sm">
                {
                  SCOPE_LABELS[
                    inventoryCount.scope
                  ]
                }
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">
                {
                  inventoryCount.warehouse.code
                }{" "}
                -{" "}
                {
                  inventoryCount.warehouse.name
                }
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Oluşturan:{" "}
              <strong>
                {
                  inventoryCount.createdByName
                }
              </strong>
              {" · "}
              {
                formatDate(
                  inventoryCount.createdAt
                )
              }
            </p>
          </div>

          <Link
            href="/admin/inventory-counts"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Sayım Listesine Dön
          </Link>
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

        {inventoryCount.status ===
          InventoryCountStatus.CANCELLED && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <h2 className="font-black">
              Sayım iptal edildi
            </h2>

            <p className="mt-2">
              İptal eden:{" "}
              <strong>
                {
                  inventoryCount.cancelledByName ??
                  "-"
                }
              </strong>
            </p>

            <p className="mt-1">
              İptal zamanı:{" "}
              {
                formatDate(
                  inventoryCount.cancelledAt
                )
              }
            </p>

            <p className="mt-2">
              Gerekçe:{" "}
              {
                inventoryCount.cancelReason ??
                "-"
              }
            </p>
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lokasyon
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {
                inventoryCount
                  ._count.locations
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tamamlanan
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-700">
              {
                completedLocationCount
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Devam Eden
            </p>

            <p className="mt-2 text-3xl font-black text-amber-700">
              {
                inProgressLocationCount
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sayım Satırı
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {
                inventoryCount
                  ._count.lines
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Personel
            </p>

            <p className="mt-2 text-3xl font-black text-blue-800">
              {
                inventoryCount
                  ._count.assignees
              }
            </p>
          </div>
        </div>

        <div className="mt-7">
          <InventoryCountApprovalPanel
            inventoryCountId={
              inventoryCount.id
            }
            countNumber={
              inventoryCount.countNumber
            }
            status={
              inventoryCount.status
            }
            canApprove={
              canApprove
            }
            lines={
              approvalLines
            }
          />
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Sayım Lokasyonları
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sayım planına dahil
                edilen lokasyonlar ve
                işlem durumları.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3">
                      Lokasyon
                    </th>

                    <th className="px-3 py-3">
                      Durum
                    </th>

                    <th className="px-3 py-3">
                      Satır
                    </th>

                    <th className="px-3 py-3">
                      Sayan
                    </th>

                    <th className="px-3 py-3">
                      Tamamlanma
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventoryCount.locations.map(
                    (location) => (
                      <tr
                        key={
                          location.id
                        }
                        className="border-b border-slate-100"
                      >
                        <td className="whitespace-nowrap px-3 py-4 font-black text-slate-900">
                          {
                            location.locationCode
                          }
                        </td>

                        <td className="px-3 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {location.status ===
                            "PENDING"
                              ? "Bekliyor"
                              : location.status ===
                                  "IN_PROGRESS"
                                ? "Devam Ediyor"
                                : "Tamamlandı"}
                          </span>
                        </td>

                        <td className="px-3 py-4 font-bold text-slate-700">
                          {
                            location
                              ._count
                              .lines
                          }
                        </td>

                        <td className="px-3 py-4 text-slate-600">
                          {
                            location.countedByName ??
                            "-"
                          }
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-slate-600">
                          {
                            formatDate(
                              location.completedAt
                            )
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-6">
            <InventoryCountStatusActions
              inventoryCountId={
                inventoryCount.id
              }
              countNumber={
                inventoryCount.countNumber
              }
              status={
                inventoryCount.status
              }
              canManage={
                canManage
              }
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Atanan Personeller
              </h2>

              {inventoryCount.assignees.length ===
              0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Atanmış personel
                  bulunmuyor.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {inventoryCount.assignees.map(
                    (assignee) => (
                      <div
                        key={
                          assignee.id
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="font-black text-slate-900">
                          {
                            assignee.fullName
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          @
                          {
                            assignee.username
                          }
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Sicil:{" "}
                          {
                            assignee.employeeCode ??
                            "-"
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <InventoryCountAssigneeManager
              inventoryCountId={
                inventoryCount.id
              }
              status={
                inventoryCount.status
              }
              canManage={
                canManage
              }
              availableAssignees={
                availableAssignees
              }
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Sayım Zamanları
              </h2>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-bold text-slate-500">
                    Snapshot
                  </dt>

                  <dd className="mt-1 text-slate-900">
                    {
                      formatDate(
                        inventoryCount.snapshotAt
                      )
                    }
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-slate-500">
                    Başlangıç
                  </dt>

                  <dd className="mt-1 text-slate-900">
                    {
                      formatDate(
                        inventoryCount.startedAt
                      )
                    }
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-slate-500">
                    Gönderilme
                  </dt>

                  <dd className="mt-1 text-slate-900">
                    {
                      formatDate(
                        inventoryCount.submittedAt
                      )
                    }
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-slate-500">
                    Onaylanma
                  </dt>

                  <dd className="mt-1 text-slate-900">
                    {
                      formatDate(
                        inventoryCount.approvedAt
                      )
                    }
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Açıklama
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {
                  inventoryCount.notes ??
                  "Açıklama girilmedi."
                }
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}