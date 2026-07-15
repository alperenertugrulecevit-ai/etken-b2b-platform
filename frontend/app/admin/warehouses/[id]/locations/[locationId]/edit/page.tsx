import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import WarehouseLocationEditForm from "@/components/admin/WarehouseLocationEditForm";

type Props = {
  params: Promise<{
    id: string;
    locationId: string;
  }>;
};

function createFullLocationCode({
  code,
  section,
  level,
  bin,
}: {
  code: string;
  section: string;
  level: string;
  bin: string;
}) {
  return [
    code,
    section,
    level,
    bin,
  ]
    .filter(Boolean)
    .join("-");
}

export default async function EditWarehouseLocationPage({
  params,
}: Props) {
  const {
    id,
    locationId: locationIdValue,
  } = await params;

  const warehouseId = Number(id);

  const locationId = Number(
    locationIdValue
  );

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0 ||
    !Number.isInteger(locationId) ||
    locationId <= 0
  ) {
    notFound();
  }

  const location =
    await prisma.warehouseLocation.findFirst({
      where: {
        id: locationId,
        warehouseId,
      },

      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

  if (!location) {
    notFound();
  }

  const fullLocationCode =
    createFullLocationCode({
      code: location.code,
      section: location.section,
      level: location.level,
      bin: location.bin,
    });

  return (
    <section className="p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Lokasyon Düzenle
            </h1>

            <p className="mt-3 text-xl font-bold text-blue-900">
              {fullLocationCode}
            </p>

            <p className="mt-2 text-gray-500">
              {location.warehouse.code}
              {" — "}
              {location.warehouse.name}
            </p>
          </div>

          <Link
            href={`/admin/warehouses/${warehouseId}/locations`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Lokasyon Listesine Dön
          </Link>
        </div>

        {!location.warehouse
          .isActive && (
          <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
            Depo pasif durumda. Mevcut
            lokasyon bilgilerini yine de
            güncelleyebilirsiniz.
          </div>
        )}

        <WarehouseLocationEditForm
          warehouseId={warehouseId}
          locationId={location.id}
          initialCode={location.code}
          initialAisle={location.aisle}
          initialSection={
            location.section
          }
          initialLevel={location.level}
          initialBin={location.bin}
          initialLocationType={
            location.locationType
          }
          initialCapacity={
            location.capacity
          }
          initialSortOrder={
            location.sortOrder
          }
          initialDescription={
            location.description ?? ""
          }
        />
      </div>
    </section>
  );
}