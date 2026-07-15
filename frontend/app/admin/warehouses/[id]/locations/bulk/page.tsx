import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import WarehouseLocationBulkCreateForm from "@/components/admin/WarehouseLocationBulkCreateForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BulkWarehouseLocationsPage({
  params,
}: Props) {
  const { id } = await params;
  const warehouseId = Number(id);

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    notFound();
  }

  const warehouse =
    await prisma.warehouse.findUnique({
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
    });

  if (!warehouse) {
    notFound();
  }

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Toplu Lokasyon Oluştur
          </h1>

          <p className="mt-3 text-xl font-bold text-blue-900">
            {warehouse.code} —{" "}
            {warehouse.name}
          </p>

          <p className="mt-2 text-gray-500">
            Bölüm, kat ve göz aralıklarına
            göre raf lokasyonlarını otomatik
            oluşturun.
          </p>
        </div>

        <Link
          href={`/admin/warehouses/${warehouse.id}/locations`}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Lokasyon Listesine Dön
        </Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Mevcut Lokasyon
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {warehouse._count.locations}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Depo Durumu
          </p>

          <p
            className={`mt-3 text-3xl font-bold ${
              warehouse.isActive
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {warehouse.isActive
              ? "Aktif"
              : "Pasif"}
          </p>
        </article>
      </div>

      <div className="mx-auto mt-8 max-w-5xl">
        <WarehouseLocationBulkCreateForm
          warehouseId={warehouse.id}
          warehouseIsActive={
            warehouse.isActive
          }
        />
      </div>
    </section>
  );
}