import {
  InventoryCountLineStatus,
  InventoryCountStatus,
} from "@prisma/client";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import RFInventoryCountForm from "@/components/rf/RFInventoryCountForm";

import type {
  RFCountedLineSummary,
} from "@/components/rf/RFInventoryCountForm";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type RFInventoryCountLocationPageProps = {
  params: Promise<{
    id: string;
    locationId: string;
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
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    }
  ).format(value);
}

export default async function RFInventoryCountLocationPage({
  params,
}: RFInventoryCountLocationPageProps) {
  const profile =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  const {
    id,
    locationId,
  } = await params;

  const inventoryCountId =
    Number(id);

  const inventoryCountLocationId =
    Number(locationId);

  if (
    !Number.isInteger(
      inventoryCountId
    ) ||
    inventoryCountId <= 0 ||
    !Number.isInteger(
      inventoryCountLocationId
    ) ||
    inventoryCountLocationId <= 0
  ) {
    notFound();
  }

  const countLocation =
    await prisma.inventoryCountLocation.findFirst({
      where: {
        id:
          inventoryCountLocationId,

        inventoryCountId,

        inventoryCount: {
          is: {
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
        },
      },

      include: {
        inventoryCount: {
          select: {
            id: true,
            countNumber: true,
            status: true,
            startedAt: true,

            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },

        lines: {
          where: {
            status: {
              in: [
                InventoryCountLineStatus.COUNTED,
                InventoryCountLineStatus.RECOUNT_REQUIRED,
                InventoryCountLineStatus.APPROVED,
              ],
            },

            countedQuantity: {
              not: null,
            },
          },

          orderBy: [
            {
              countedAt:
                "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            handlingUnitBarcode:
              true,
            productCode: true,
            productName: true,
            countedQuantity:
              true,
            countedByName:
              true,
            countedAt: true,
            isDiscovered: true,
          },
        },

        _count: {
          select: {
            lines: true,
          },
        },
      },
    });

  if (!countLocation) {
    notFound();
  }

  if (
    countLocation.status ===
    "COMPLETED"
  ) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <div className="text-4xl">
            ✓
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Lokasyon Sayımı
            Tamamlandı
          </h1>

          <p className="mt-2 text-lg font-bold">
            {
              countLocation.locationCode
            }
          </p>

          <p className="mt-3 text-sm leading-6">
            Bu lokasyonun sayımı
            tamamlandığı için yeniden
            giriş yapılamaz.
          </p>
        </div>

        <Link
          href={`/rf/inventory-counts/${inventoryCountId}`}
          className="block rounded-xl bg-blue-900 px-5 py-4 text-center font-black text-white hover:bg-blue-800"
        >
          Sayım Lokasyonlarına Dön
        </Link>
      </section>
    );
  }

  const isLockedByAnotherUser =
    countLocation.status ===
      "IN_PROGRESS" &&
    Boolean(
      countLocation.countedById
    ) &&
    countLocation.countedById !==
      profile.id;

  if (
    isLockedByAnotherUser
  ) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <div className="text-4xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Lokasyon Başka Bir
            Personelde
          </h1>

          <p className="mt-2 text-lg font-bold">
            {
              countLocation.locationCode
            }
          </p>

          <p className="mt-3 leading-6">
            Bu lokasyonda{" "}
            <strong>
              {
                countLocation.countedByName ??
                "başka bir personel"
              }
            </strong>{" "}
            sayım yapıyor. Aynı
            lokasyonda eş zamanlı işlem
            yapılamaz.
          </p>
        </div>

        <Link
          href={`/rf/inventory-counts/${inventoryCountId}`}
          className="block rounded-xl bg-blue-900 px-5 py-4 text-center font-black text-white hover:bg-blue-800"
        >
          Başka Lokasyon Seç
        </Link>
      </section>
    );
  }

  const countedLines:
    RFCountedLineSummary[] =
    countLocation.lines.flatMap(
      (line) => {
        if (
          line.countedQuantity ===
          null
        ) {
          return [];
        }

        return [
          {
            id: line.id,

            handlingUnitBarcode:
              line.handlingUnitBarcode,

            productCode:
              line.productCode,

            productName:
              line.productName,

            countedQuantity:
              line.countedQuantity,

            countedByName:
              line.countedByName ??
              "-",

            countedAt:
              formatDate(
                line.countedAt
              ),

            isDiscovered:
              line.isDiscovered,
          },
        ];
      }
    );

  const operatorName =
    profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/rf/inventory-counts/${inventoryCountId}`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
        >
          ← Lokasyonlara Dön
        </Link>

        <div className="text-right text-sm text-slate-500">
          <p className="font-bold text-slate-700">
            {
              operatorName
            }
          </p>

          <p>
            @
            {
              profile.username
            }
          </p>
        </div>
      </div>

      <RFInventoryCountForm
        inventoryCountId={
          countLocation.inventoryCount.id
        }
        inventoryCountLocationId={
          countLocation.id
        }
        countNumber={
          countLocation.inventoryCount.countNumber
        }
        locationCode={
          countLocation.locationCode
        }
        countedLines={
          countedLines
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <h2 className="font-black text-slate-900">
          Sayım Bilgisi
        </h2>

        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-bold text-slate-500">
              Depo
            </dt>

            <dd className="mt-1 font-semibold text-slate-900">
              {
                countLocation.inventoryCount.warehouse.code
              }{" "}
              -{" "}
              {
                countLocation.inventoryCount.warehouse.name
              }
            </dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Snapshot satırı
            </dt>

            <dd className="mt-1 font-semibold text-slate-900">
              {
                countLocation
                  ._count.lines
              }
            </dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Sayım başlangıcı
            </dt>

            <dd className="mt-1 font-semibold text-slate-900">
              {
                formatDate(
                  countLocation.inventoryCount.startedAt
                )
              }
            </dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Lokasyon durumu
            </dt>

            <dd className="mt-1 font-semibold text-slate-900">
              {countLocation.status ===
              "PENDING"
                ? "Bekliyor"
                : "Devam Ediyor"}
            </dd>
          </div>
        </dl>
      </section>
    </section>
  );
}