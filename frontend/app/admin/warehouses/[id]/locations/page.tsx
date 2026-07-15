import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Prisma,
  WarehouseLocationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import WarehouseLocationCreateForm from "@/components/admin/WarehouseLocationCreateForm";
import WarehouseLocationBulkUpdateForm from "@/components/admin/WarehouseLocationBulkUpdateForm";
import WarehouseLocationLabelSelector from "@/components/admin/WarehouseLocationLabelSelector";

import {
  toggleWarehouseLocationStatus,
} from "./actions";

type SearchParams = Promise<{
  search?: string;
  locationType?: string;
  status?: string;
}>;

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: SearchParams;
};

function getLocationTypeLabel(
  locationType: string
) {
  const labels: Record<
    string,
    string
  > = {
    PALLET: "Palet",
    BOX: "Koli",
    HANGING: "Askılı",
    FLOOR: "Zemin",
    RETURN: "İade",
    QUALITY: "Kalite",
    RFID: "RFID",
    SHIPPING: "Mal Çıkış",
    RECEIVING: "Mal Kabul",
    QUARANTINE: "Karantina",
  };

  return (
    labels[locationType] ??
    locationType
  );
}

function getLocationTypeClass(
  locationType: string
) {
  const classes: Record<
    string,
    string
  > = {
    PALLET:
      "bg-blue-100 text-blue-700",

    BOX:
      "bg-cyan-100 text-cyan-700",

    HANGING:
      "bg-violet-100 text-violet-700",

    FLOOR:
      "bg-slate-100 text-slate-700",

    RETURN:
      "bg-orange-100 text-orange-700",

    QUALITY:
      "bg-emerald-100 text-emerald-700",

    RFID:
      "bg-indigo-100 text-indigo-700",

    SHIPPING:
      "bg-red-100 text-red-700",

    RECEIVING:
      "bg-green-100 text-green-700",

    QUARANTINE:
      "bg-yellow-100 text-yellow-700",
  };

  return (
    classes[locationType] ??
    "bg-slate-100 text-slate-700"
  );
}

function isLocationType(
  value: string
): value is WarehouseLocationType {
  return Object.values(
    WarehouseLocationType
  ).includes(
    value as WarehouseLocationType
  );
}

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

export default async function WarehouseLocationsPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;

  const warehouseId = Number(id);

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    notFound();
  }

  const search =
    query.search?.trim() ?? "";

  const locationType =
    query.locationType?.trim() ?? "";

  const status =
    query.status?.trim() ?? "";

  const locationWhere:
    Prisma.WarehouseLocationWhereInput =
    {
      warehouseId,
    };

  if (search) {
    locationWhere.OR = [
      {
        code: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        aisle: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        section: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        level: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        bin: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (
    locationType &&
    isLocationType(locationType)
  ) {
    locationWhere.locationType =
      locationType;
  }

  if (status === "active") {
    locationWhere.isActive = true;
  }

  if (status === "inactive") {
    locationWhere.isActive = false;
  }

  const [warehouse, locations] =
    await Promise.all([
      prisma.warehouse.findUnique({
        where: {
          id: warehouseId,
        },

        include: {
          _count: {
            select: {
              locations: true,
            },
          },
        },
      }),

      prisma.warehouseLocation.findMany({
        where: locationWhere,

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            code: "asc",
          },
          {
            section: "asc",
          },
          {
            level: "asc",
          },
          {
            bin: "asc",
          },
        ],
      }),
    ]);

  if (!warehouse) {
    notFound();
  }

  const activeLocationCount =
    locations.filter(
      (location) =>
        location.isActive
    ).length;

  const inactiveLocationCount =
    locations.length -
    activeLocationCount;

  const totalCapacity =
    locations.reduce(
      (total, location) =>
        total + location.capacity,
      0
    );

  const bulkUpdateLocations =
    locations.map((location) => ({
      id: location.id,

      fullCode:
        createFullLocationCode({
          code: location.code,
          section: location.section,
          level: location.level,
          bin: location.bin,
        }),

      locationType:
        getLocationTypeLabel(
          location.locationType
        ),

      capacity:
        location.capacity,

      sortOrder:
        location.sortOrder,

      isActive:
        location.isActive,
    }));

  const labelLocations =
    locations.map((location) => ({
      id: location.id,

      fullCode:
        createFullLocationCode({
          code: location.code,
          section: location.section,
          level: location.level,
          bin: location.bin,
        }),

      locationType:
        getLocationTypeLabel(
          location.locationType
        ),

      isActive:
        location.isActive,
    }));

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Lokasyon Yönetimi
          </h1>

          <p className="mt-3 text-xl font-bold text-blue-900">
            {warehouse.code} —{" "}
            {warehouse.name}
          </p>

          <p className="mt-2 text-gray-500">
            Depo içindeki raf, zemin ve
            operasyon lokasyonlarını yönetin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/warehouses/${warehouse.id}/locations/bulk`}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Toplu Lokasyon Oluştur
          </Link>

          <Link
            href="/admin/warehouses"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Depo Listesine Dön
          </Link>
        </div>
      </div>

      {!warehouse.isActive && (
        <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
          Bu depo pasif durumdadır. Mevcut
          lokasyonları inceleyebilirsiniz;
          ancak yeni lokasyon oluşturamazsınız.
        </div>
      )}

      <div className="mt-10 grid gap-5 md:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Toplam Lokasyon
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {warehouse._count.locations}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Gösterilen Aktif
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {activeLocationCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Gösterilen Pasif
          </p>

          <p className="mt-3 text-4xl font-bold text-red-700">
            {inactiveLocationCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Gösterilen Kapasite
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {totalCapacity}
          </p>
        </article>
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[460px_1fr]">
        <WarehouseLocationCreateForm
          warehouseId={warehouse.id}
          warehouseIsActive={
            warehouse.isActive
          }
        />

        <div className="space-y-6">
          <form className="rounded-2xl bg-white p-6 shadow">
            <div className="grid gap-5 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Arama
                </span>

                <input
                  name="search"
                  defaultValue={search}
                  placeholder="Lokasyon kodu, koridor veya açıklama"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Lokasyon Tipi
                </span>

                <select
                  name="locationType"
                  defaultValue={
                    locationType
                  }
                  className="w-full rounded-xl border bg-white p-4"
                >
                  <option value="">
                    Tüm tipler
                  </option>

                  {Object.values(
                    WarehouseLocationType
                  ).map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {getLocationTypeLabel(
                        type
                      )}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Durum
                </span>

                <select
                  name="status"
                  defaultValue={status}
                  className="w-full rounded-xl border bg-white p-4"
                >
                  <option value="">
                    Tüm durumlar
                  </option>

                  <option value="active">
                    Aktif
                  </option>

                  <option value="inactive">
                    Pasif
                  </option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
              >
                Filtrele
              </button>

              <Link
                href={`/admin/warehouses/${warehouse.id}/locations`}
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold hover:bg-slate-50"
              >
                Filtreleri Temizle
              </Link>
            </div>
          </form>

          <WarehouseLocationLabelSelector
            locations={labelLocations}
          />

          <div className="overflow-x-auto rounded-2xl bg-white shadow">
            <table className="w-full min-w-[1550px] text-left">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="p-4">
                    Tam Lokasyon
                  </th>

                  <th className="p-4">
                    Kod
                  </th>

                  <th className="p-4">
                    Koridor
                  </th>

                  <th className="p-4">
                    Bölüm
                  </th>

                  <th className="p-4">
                    Kat
                  </th>

                  <th className="p-4">
                    Göz
                  </th>

                  <th className="p-4">
                    Tip
                  </th>

                  <th className="p-4">
                    Kapasite
                  </th>

                  <th className="p-4">
                    Sıra
                  </th>

                  <th className="p-4">
                    Açıklama
                  </th>

                  <th className="p-4">
                    Durum
                  </th>

                  <th className="p-4">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody>
                {locations.map(
                  (location) => {
                    const fullLocationCode =
                      createFullLocationCode({
                        code:
                          location.code,

                        section:
                          location.section,

                        level:
                          location.level,

                        bin:
                          location.bin,
                      });

                    return (
                      <tr
                        key={location.id}
                        className={`border-b hover:bg-slate-50 ${
                          !location.isActive
                            ? "opacity-60"
                            : ""
                        }`}
                      >
                        <td className="p-4">
                          <span className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 font-mono font-bold text-white">
                            {fullLocationCode}
                          </span>
                        </td>

                        <td className="p-4 font-bold text-blue-900">
                          {location.code}
                        </td>

                        <td className="p-4 font-semibold">
                          {location.aisle ||
                            "-"}
                        </td>

                        <td className="p-4">
                          {location.section ||
                            "-"}
                        </td>

                        <td className="p-4">
                          {location.level ||
                            "-"}
                        </td>

                        <td className="p-4">
                          {location.bin ||
                            "-"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${getLocationTypeClass(
                              location.locationType
                            )}`}
                          >
                            {getLocationTypeLabel(
                              location.locationType
                            )}
                          </span>
                        </td>

                        <td className="p-4 font-bold">
                          {location.capacity}
                        </td>

                        <td className="p-4">
                          {location.sortOrder}
                        </td>

                        <td className="max-w-72 p-4 text-sm text-gray-600">
                          {location.description ||
                            "-"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${
                              location.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {location.isActive
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/warehouses/${warehouse.id}/locations/${location.id}/edit`}
                              className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                            >
                              Düzenle
                            </Link>

                            <Link
                              href={`/labels/print?type=location&ids=${location.id}&layout=thermal-70x40`}
                              target="_blank"
                              className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                            >
                              Etiket
                            </Link>

                            <form
                              action={toggleWarehouseLocationStatus.bind(
                                null,
                                warehouse.id,
                                location.id,
                                location.isActive
                              )}
                            >
                              <button
                                type="submit"
                                className={`rounded-lg px-4 py-2 font-semibold text-white ${
                                  location.isActive
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-green-600 hover:bg-green-700"
                                }`}
                              >
                                {location.isActive
                                  ? "Pasif Yap"
                                  : "Aktifleştir"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}

                {locations.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-12 text-center text-gray-500"
                    >
                      Seçilen filtrelere uygun
                      lokasyon bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-right text-sm text-gray-400">
            Gösterilen lokasyon:{" "}
            {locations.length}
          </p>

          <WarehouseLocationBulkUpdateForm
            warehouseId={warehouse.id}
            locations={
              bulkUpdateLocations
            }
          />
        </div>
      </div>
    </section>
  );
}