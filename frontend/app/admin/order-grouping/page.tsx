import { OrderType } from "@prisma/client";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { OrderGroupingService, ORDER_TYPE_LABELS } from "@/lib/wms/order-grouping-service";
import OrderGroupingClient from "./OrderGroupingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrderGroupingPage({ searchParams }: Props) {
  await AuthorizationService.requirePermission("WAVE_MANAGE");
  const query = await searchParams;
  const warehouseId = Number(typeof query.warehouseId === "string" ? query.warehouseId : "");
  const typeValue = typeof query.orderType === "string" ? query.orderType : "";
  const orderType = Object.values(OrderType).includes(typeValue as OrderType)
    ? (typeValue as OrderType)
    : null;
  const search = typeof query.search === "string" ? query.search : "";

  const data = await OrderGroupingService.getScreenData({
    warehouseId: Number.isInteger(warehouseId) && warehouseId > 0 ? warehouseId : null,
    orderType,
    search,
  });

  const serializedOrders = data.orders.map((order) => ({
    ...order,
    orderDate: order.orderDate.toISOString(),
    requestedDate: order.requestedDate?.toISOString() ?? null,
  }));

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-blue-700">WMS Çıkış Operasyonları</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Sipariş Gruplama</h1>
        <p className="mt-2 max-w-4xl text-slate-600">
          Onaylanmış ve depoda toplamaya hazır siparişleri depo ve sipariş tipine göre gruplayın; sipariş bazlı veya Wave toplama emrini RF terminaline gönderin.
        </p>
      </div>

      {typeof query.success === "string" && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-bold text-green-800">✓ {query.success}</div>
      )}
      {typeof query.error === "string" && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">⚠ {query.error}</div>
      )}

      <form className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-4">
        <label className="text-sm font-bold text-slate-700">
          Depo Filtresi
          <select name="warehouseId" defaultValue={Number.isInteger(warehouseId) && warehouseId > 0 ? String(warehouseId) : ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
            <option value="">Tüm Depolar</option>
            {data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Sipariş Tipi
          <select name="orderType" defaultValue={orderType ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
            <option value="">Tüm Tipler</option>
            {Object.values(OrderType).map((type) => <option key={type} value={type}>{ORDER_TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Sipariş / Müşteri Ara
          <input name="search" defaultValue={search} placeholder="Sipariş no, müşteri..." className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
        </label>
        <div className="flex items-end">
          <button className="w-full rounded-xl bg-slate-900 px-5 py-3 font-black text-white hover:bg-slate-800">Filtrele</button>
        </div>
      </form>

      <OrderGroupingClient orders={serializedOrders} warehouses={data.warehouses} pickers={data.pickers} />
    </section>
  );
}
