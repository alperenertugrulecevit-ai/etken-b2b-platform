import Link from "next/link";

import { prisma } from "@/lib/prisma";
import WarehouseLocationCreateForm from "@/components/admin/WarehouseLocationCreateForm";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props = {
  searchParams: Promise<{
    warehouseId?: string;
  }>;
};

export default async function HandlingUnitLocationCreatePage({
  searchParams,
}: Props) {
  await AuthorizationService.requirePermission("LOCATION_MANAGE");

  const query = await searchParams;
  const warehouses = await prisma.warehouse.findMany({
    orderBy: [
      { isActive: "desc" },
      { code: "asc" },
    ],
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  });

  const requestedWarehouseId = Number(query.warehouseId ?? "");
  const selectedWarehouse =
    warehouses.find(
      (warehouse) =>
        Number.isInteger(requestedWarehouseId) &&
        warehouse.id === requestedWarehouseId
    ) ?? null;

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">Lokasyon Oluşturma</h1>
          <p className="mt-2 text-gray-500">
            Handling Unit operasyonlarında kullanılacak depo lokasyonlarını tanımlayın.
          </p>
        </div>

        <Link
          href="/admin/handling-units"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Handling Unit
        </Link>
      </div>

      <form className="mt-8 rounded-2xl bg-white p-6 shadow">
        <label className="block max-w-2xl">
          <span className="mb-2 block text-sm font-semibold">Depo Seçimi</span>
          <select
            name="warehouseId"
            defaultValue={selectedWarehouse?.id ?? ""}
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="">Depo seçin</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
                {warehouse.isActive ? "" : " (Pasif)"}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="mt-4 rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
        >
          Depoyu Seç
        </button>
      </form>

      {selectedWarehouse ? (
        <div className="mt-8 max-w-2xl">
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
            <span className="font-bold">{selectedWarehouse.code}</span>
            {" — "}
            {selectedWarehouse.name}
          </div>

          <WarehouseLocationCreateForm
            warehouseId={selectedWarehouse.id}
            warehouseIsActive={selectedWarehouse.isActive}
          />
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
          Lokasyon oluşturmak için önce depo seçin.
        </div>
      )}
    </section>
  );
}
