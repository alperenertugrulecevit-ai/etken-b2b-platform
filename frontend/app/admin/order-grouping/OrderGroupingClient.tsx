"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { prepareWavePickingAction, startDirectPickingAction } from "./actions";

type OrderRow = {
  id: number;
  orderNumber: string;
  orderType: string;
  orderDate: string;
  requestedDate: string | null;
  totalAmount: number;
  fulfillmentWarehouseId: number | null;
  fulfillmentWarehouse: { id: number; code: string; name: string } | null;
  customer: { customerCode: string; companyName: string };
  shippingAddress: { city: string; district: string } | null;
  stockReserved: boolean;
  items: { id: number; productCode: string; productName: string; quantity: number }[];
  _count: { items: number };
  plannedQuantity: number;
};

type Warehouse = { id: number; code: string; name: string };
const typeLabels: Record<string, string> = {
  ECOMMERCE: "E-Ticaret",
  STORE: "Mağaza",
  CUSTOMER: "Müşteri",
  OTHER: "Diğer",
};

function date(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function OrderGroupingClient({
  orders,
  warehouses,
}: {
  orders: OrderRow[];
  warehouses: Warehouse[];
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [showMode, setShowMode] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selected.includes(order.id)),
    [orders, selected]
  );

  const toggle = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  const allSelected = orders.length > 0 && selected.length === orders.length;

  useEffect(() => {
    if (selectedOrders.length === 0) {
      setWarehouseId("");
      return;
    }
    const assigned = Array.from(new Set(selectedOrders.map((order) => order.fulfillmentWarehouseId).filter((id): id is number => id !== null)));
    if (assigned.length === 1) setWarehouseId(String(assigned[0]));
    else if (assigned.length > 1) setWarehouseId("");
  }, [selectedOrders]);

  const hidden = (
    <>
      {selected.map((id) => <input key={id} type="hidden" name="orderId" value={id} />)}
      <input type="hidden" name="warehouseId" value={warehouseId} />
    </>
  );

  return (
    <>
      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><b>Zone bazlı toplama:</b> Personel bu ekrandan atanmaz. Sipariş başlatıldığında stok lokasyonlarına göre Zone görevleri oluşur; RF personeli Zone seçerek görev alır.</div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold text-slate-600">
          {orders.length} onaylı sipariş · <span className="text-blue-800">{selected.length} seçili</span>
        </div>
        <div className="flex min-w-[420px] items-end gap-3">
          <label className="min-w-[230px] text-sm font-bold text-slate-700">
            Toplama Deposu
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">Depo seçin</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>
              ))}
            </select>
          </label>
        <button
          type="button"
          disabled={selected.length === 0 || !warehouseId}
          onClick={() => setShowMode(true)}
          className="rounded-xl bg-blue-900 px-6 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Toplama Başlat
        </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="w-10 p-4"></th>
              <th className="p-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : orders.map((order) => order.id))}
                  aria-label="Tüm siparişleri seç"
                />
              </th>
              <th className="p-4">Sipariş No</th>
              <th className="p-4">Sipariş Tipi</th>
              <th className="p-4">Depo</th>
              <th className="p-4">Müşteri</th>
              <th className="p-4">Sipariş Tarihi</th>
              <th className="p-4">Talep Tarihi</th>
              <th className="p-4">Kalem Sayısı</th>
              <th className="p-4">Toplam Adet</th>
              <th className="p-4">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}><tr className={`border-b ${selected.includes(order.id) ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <td className="p-4">
                  <button type="button" onClick={() => setExpanded((current) => current.includes(order.id) ? current.filter((id) => id !== order.id) : [...current, order.id])} className="font-black text-slate-700" aria-label="Sipariş detayını aç/kapat">
                    {expanded.includes(order.id) ? "−" : "+"}
                  </button>
                </td>
                <td className="p-4">
                  <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggle(order.id)} />
                </td>
                <td className="p-4 font-black text-blue-900">{order.orderNumber}</td>
                <td className="p-4"><span className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-800">{typeLabels[order.orderType] || order.orderType}</span></td>
                <td className="p-4">
                  {order.fulfillmentWarehouse
                    ? <><div className="font-bold">{order.fulfillmentWarehouse.code}</div><div className="text-slate-500">{order.fulfillmentWarehouse.name}</div></>
                    : <span className="text-amber-700">Başlatırken atanacak</span>}
                </td>
                <td className="p-4"><div className="font-bold">{order.customer.companyName}</div><div className="text-slate-500">{order.customer.customerCode}</div></td>
                <td className="p-4 whitespace-nowrap">{date(order.orderDate)}</td>
                <td className="p-4 whitespace-nowrap">{date(order.requestedDate)}</td>
                <td className="p-4">{order._count.items}</td>
                <td className="p-4 font-bold">{order.plannedQuantity}</td>
                <td className="p-4 whitespace-nowrap font-bold">{order.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
              </tr>
              {expanded.includes(order.id) && (
                <tr className="border-b bg-slate-50">
                  <td colSpan={11} className="p-0">
                    <div className="overflow-x-auto p-4">
                      <div className="mb-3 grid gap-3 text-sm md:grid-cols-5">
                        <div><b>Firma Kodu:</b> {order.customer.customerCode}</div>
                        <div><b>İl:</b> {order.shippingAddress?.city || "-"}</div>
                        <div><b>İlçe:</b> {order.shippingAddress?.district || "-"}</div>
                        <div><b>Sipariş Miktarı:</b> {order.plannedQuantity}</div>
                        <div><b>Rezervasyon:</b> {order.stockReserved ? order.plannedQuantity : 0}</div>
                      </div>
                      <table className="w-full min-w-[800px] border-collapse text-sm">
                        <thead><tr className="bg-white text-slate-700">
                          <th className="border p-2">Kalem No</th><th className="border p-2">Ürün Kodu</th><th className="border p-2 text-left">Ürün Tanımı</th><th className="border p-2">Sipariş Miktarı</th><th className="border p-2">Rezervasyon Miktarı</th><th className="border p-2">Karşılama Oranı</th>
                        </tr></thead>
                        <tbody>
                          {order.items.map((item, index) => {
                            const reserved = order.stockReserved ? item.quantity : 0;
                            const ratio = item.quantity > 0 ? Math.round((reserved / item.quantity) * 100) : 0;
                            return <tr key={item.id} className="bg-white">
                              <td className="border p-2 text-center">{index + 1}</td><td className="border p-2 text-center">{item.productCode}</td><td className="border p-2">{item.productName}</td><td className="border p-2 text-center">{item.quantity}</td><td className="border p-2 text-center">{reserved}</td><td className="border p-2 text-center font-bold">{ratio}%</td>
                            </tr>;
                          })}
                        </tbody>
                        <tfoot><tr className="bg-white font-black"><td className="border p-2" colSpan={3}>Toplam</td><td className="border p-2 text-center">{order.plannedQuantity}</td><td className="border p-2 text-center">{order.stockReserved ? order.plannedQuantity : 0}</td><td className="border p-2 text-center">{order.stockReserved ? "100%" : "0%"}</td></tr></tfoot>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={11} className="p-12 text-center text-slate-500">Filtrelere uygun, toplamaya hazır onaylı sipariş bulunmuyor.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showMode && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Toplama Yöntemi</h2>
            <p className="mt-2 text-slate-600">{selected.length} sipariş seçildi. Toplama emrinin RF terminaline nasıl gönderileceğini seçin.</p>

            <div className="mt-6 grid gap-4">
              <form action={startDirectPickingAction}>
                {hidden}
                <button className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 text-left hover:border-blue-500">
                  <span className="block text-lg font-black text-blue-950">Sipariş Bazlı Toplama</span>
                  <span className="mt-1 block text-sm text-blue-800">Her sipariş stok lokasyonlarına göre Zone görevlerine bölünür ve ortak RF görev havuzuna gönderilir.</span>
                </button>
              </form>

              <form action={prepareWavePickingAction}>
                {hidden}
                <button disabled={selected.length < 2} className="w-full rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 text-left hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="block text-lg font-black text-violet-950">Wave Toplama</span>
                  <span className="mt-1 block text-sm text-violet-800">En az 2 sipariş ile Yeni Wave Oluştur ekranına geçilir.</span>
                </button>
              </form>
            </div>

            {selected.length < 2 && <p className="mt-4 text-sm font-bold text-amber-700">Wave toplama için en az 2 sipariş seçilmelidir.</p>}

            <button type="button" onClick={() => setShowMode(false)} className="mt-6 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </>
  );
}
