import Link from "next/link";

import {
  getCities,
  getDistrictsOfEachCity,
} from "turkey-neighbourhoods";

import { prisma } from "@/lib/prisma";

import WarehouseCreateForm from "@/components/admin/WarehouseCreateForm";

import {
  toggleWarehouseStatus,
} from "./actions";

export default async function WarehousesPage() {
  const warehouses =
    await prisma.warehouse.findMany({
      orderBy: [
        {
          isActive: "desc",
        },
        {
          code: "asc",
        },
      ],

      include: {
        _count: {
          select: {
            locations: true,
          },
        },
      },
    });

  const cities = getCities();

  const districtsByCityCode =
    getDistrictsOfEachCity();

  const activeWarehouseCount =
    warehouses.filter(
      (warehouse) =>
        warehouse.isActive
    ).length;

  const inactiveWarehouseCount =
    warehouses.length -
    activeWarehouseCount;

  const totalLocationCount =
    warehouses.reduce(
      (total, warehouse) =>
        total +
        warehouse._count.locations,
      0
    );

  return (
    <section className="p-10">
      <div>
        <h1 className="text-4xl font-bold">
          Depo Yönetimi
        </h1>

        <p className="mt-2 text-gray-500">
          Depoları, adres bilgilerini ve
          lokasyon yapılarını yönetin.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Aktif Depo
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {activeWarehouseCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pasif Depo
          </p>

          <p className="mt-3 text-4xl font-bold text-red-700">
            {inactiveWarehouseCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Toplam Lokasyon
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {totalLocationCount}
          </p>
        </article>
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[460px_1fr]">
        <WarehouseCreateForm
          cities={cities}
          districtsByCityCode={
            districtsByCityCode
          }
        />

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full min-w-[1250px] text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">
                  Depo Kodu
                </th>

                <th className="p-4">
                  Depo Adı
                </th>

                <th className="p-4">
                  Konum
                </th>

                <th className="p-4">
                  Açık Adres
                </th>

                <th className="p-4">
                  Lokasyon
                </th>

                <th className="p-4">
                  Durum
                </th>

                <th className="p-4">
                  İşlemler
                </th>
              </tr>
            </thead>

            <tbody>
              {warehouses.map(
                (warehouse) => (
                  <tr
                    key={warehouse.id}
                    className={`border-b hover:bg-slate-50 ${
                      !warehouse.isActive
                        ? "opacity-60"
                        : ""
                    }`}
                  >
                    <td className="p-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-900">
                        {warehouse.code}
                      </span>
                    </td>

                    <td className="p-4">
                      <p className="font-bold">
                        {warehouse.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Depo No:{" "}
                        {warehouse.id}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-semibold">
                        {warehouse.city || "-"}

                        {warehouse.district
                          ? ` / ${warehouse.district}`
                          : ""}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="max-w-80 text-sm text-gray-600">
                        {warehouse.address ||
                          "Adres girilmedi"}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="text-xl font-bold text-blue-900">
                        {
                          warehouse._count
                            .locations
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        lokasyon
                      </p>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          warehouse.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {warehouse.isActive
                          ? "Aktif"
                          : "Pasif"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/warehouses/${warehouse.id}/locations`}
                          className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                        >
                          Lokasyonlar
                        </Link>

                        <Link
                          href={`/admin/warehouses/${warehouse.id}/edit`}
                          className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                        >
                          Düzenle
                        </Link>

                        <form
                          action={toggleWarehouseStatus.bind(
                            null,
                            warehouse.id,
                            warehouse.isActive
                          )}
                        >
                          <button
                            type="submit"
                            className={`rounded-lg px-4 py-2 font-semibold text-white ${
                              warehouse.isActive
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {warehouse.isActive
                              ? "Pasif Yap"
                              : "Aktifleştir"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {warehouses.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-gray-500"
                  >
                    Henüz depo tanımlanmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}