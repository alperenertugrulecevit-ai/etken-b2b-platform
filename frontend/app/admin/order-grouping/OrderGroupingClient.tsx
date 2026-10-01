"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { checkPickingStockAction, holdShortageOrdersAction, prepareWavePickingAction, startDirectPickingAction } from "./actions";
import type { PickingStockShortage } from "@/lib/wms/order-picking-preflight-service";
import ColumnVisibilityMenu, { useColumnVisibility } from "@/components/admin/ColumnVisibilityMenu";

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
  carrier: { code: string; name: string } | null;
  shippingAddress: { city: string; district: string } | null;
  stockReserved: boolean;
  items: {
    id: number;
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    reservedQuantity: number;
    reservationRate: number;
    product: { id: number; barcode: string | null };
  }[];
  _count: { items: number };
  plannedQuantity: number;
  reservedQuantity: number;
  reservationStatus: "FULL" | "PARTIAL" | "NONE";
};

type Warehouse = { id: number; code: string; name: string };
const orderColumns = [
  { key: "orderNo", label: "Sipariş No" }, { key: "orderType", label: "Sipariş Tipi" },
  { key: "city", label: "İl" }, { key: "district", label: "İlçe" }, { key: "warehouse", label: "Depo" },
  { key: "customer", label: "Müşteri" }, { key: "carrier", label: "Nakliyeci" }, { key: "orderDate", label: "Sipariş Tarihi" },
  { key: "requestedDate", label: "Talep Tarihi" }, { key: "lineCount", label: "Kalem Sayısı" },
  { key: "quantity", label: "Toplam Adet" }, { key: "reservation", label: "Rezervasyon" }, { key: "amount", label: "Tutar" },
];

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
  const [shortages, setShortages] = useState<PickingStockShortage[]>([]);
  const [pendingMode, setPendingMode] = useState<"direct" | "wave" | null>(null);
  const [preflightError, setPreflightError] = useState("");
  const [isChecking, startChecking] = useTransition();
  const directFormRef = useRef<HTMLFormElement>(null);
  const waveFormRef = useRef<HTMLFormElement>(null);
  const directPartialRef = useRef<HTMLInputElement>(null);
  const wavePartialRef = useRef<HTMLInputElement>(null);
  const columnVisibility = useColumnVisibility("etken:columns:order-grouping", orderColumns);

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

  const submitMode = (mode: "direct" | "wave", allowPartialStock: boolean) => {
    const partialRef = mode === "direct" ? directPartialRef : wavePartialRef;
    const formRef = mode === "direct" ? directFormRef : waveFormRef;
    if (partialRef.current) partialRef.current.value = allowPartialStock ? "true" : "false";
    formRef.current?.requestSubmit();
  };

  const preflightAndStart = (mode: "direct" | "wave") => {
    if (!warehouseId || selected.length === 0) return;
    setPreflightError("");
    startChecking(async () => {
      try {
        const result = await checkPickingStockAction(selected, Number(warehouseId));
        if (result.shortages.length === 0) {
          setShowMode(false);
          submitMode(mode, false);
          return;
        }
        setPendingMode(mode);
        setShortages(result.shortages);
        setShowMode(false);
      } catch (error) {
        setPreflightError(error instanceof Error ? error.message : "Stok kontrolü yapılamadı.");
      }
    });
  };

  const holdShortages = () => {
    const deficientOrderIds = Array.from(new Set(shortages.map(row => row.orderId)));
    startChecking(async () => {
      try {
        await holdShortageOrdersAction(deficientOrderIds);
        window.location.href = `/admin/order-grouping?success=${encodeURIComponent(`${deficientOrderIds.length} sipariş Bekliyor durumuna alındı ve açık rezervasyonları çözüldü.`)}`;
      } catch (error) {
        setPreflightError(error instanceof Error ? error.message : "Siparişler beklemeye alınamadı.");
      }
    });
  };

  const hiddenInputs = (
    <>
      {selected.map((id) => <input key={id} type="hidden" name="orderId" value={id} />)}
      <input type="hidden" name="warehouseId" value={warehouseId} />
    </>
  );

  return (
    <>
      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><b>Zone bazlı toplama:</b> Personel bu ekrandan atanmaz. Sipariş başlatıldığında stok lokasyonlarına göre Zone görevleri oluşur; RF personeli Zone seçerek görev alır.</div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <ColumnVisibilityMenu columns={orderColumns} visible={columnVisibility.visible} order={columnVisibility.order} onToggle={columnVisibility.toggle} onMove={columnVisibility.move} onShowAll={columnVisibility.showAll} onReset={columnVisibility.reset} />
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
              {columnVisibility.orderedColumns.filter(column => columnVisibility.isVisible(column.key)).map(column => (
                <th key={column.key} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",column.key)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();columnVisibility.move(e.dataTransfer.getData("text/plain"),column.key)}} className="cursor-move select-none p-4">{column.label}</th>
              ))}
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
                {columnVisibility.orderedColumns.filter(column => columnVisibility.isVisible(column.key)).map(column => {
                  switch (column.key) {
                    case "orderNo": return <td key={column.key} className="p-4 font-black text-blue-900">{order.orderNumber}</td>;
                    case "orderType": return <td key={column.key} className="p-4"><span className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-800">{typeLabels[order.orderType] || order.orderType}</span></td>;
                    case "city": return <td key={column.key} className="p-4">{order.shippingAddress?.city || "-"}</td>;
                    case "district": return <td key={column.key} className="p-4">{order.shippingAddress?.district || "-"}</td>;
                    case "warehouse": return <td key={column.key} className="p-4">{order.fulfillmentWarehouse ? <><div className="font-bold">{order.fulfillmentWarehouse.code}</div><div className="text-slate-500">{order.fulfillmentWarehouse.name}</div></> : <span className="text-amber-700">Başlatırken atanacak</span>}</td>;
                    case "customer": return <td key={column.key} className="p-4"><div className="font-bold">{order.customer.companyName}</div><div className="text-slate-500">{order.customer.customerCode}</div></td>;
                    case "carrier": return <td key={column.key} className="p-4">{order.carrier ? <><div className="font-bold">{order.carrier.name}</div><div className="text-slate-500">{order.carrier.code}</div></> : "—"}</td>;
                    case "orderDate": return <td key={column.key} className="p-4 whitespace-nowrap">{date(order.orderDate)}</td>;
                    case "requestedDate": return <td key={column.key} className="p-4 whitespace-nowrap">{date(order.requestedDate)}</td>;
                    case "lineCount": return <td key={column.key} className="p-4">{order._count.items}</td>;
                    case "quantity": return <td key={column.key} className="p-4 font-bold">{order.plannedQuantity}</td>;
                    case "reservation": {
                      const label = order.reservationStatus === "FULL" ? "Tam Rezerve" : order.reservationStatus === "PARTIAL" ? "Kısmi Rezerve" : "Rezerve Değil";
                      return <td key={column.key} className="p-4 whitespace-nowrap"><div className="font-black">{label}</div><div className="text-xs text-slate-500">{order.reservedQuantity} / {order.plannedQuantity}</div></td>;
                    }
                    case "amount": return <td key={column.key} className="p-4 whitespace-nowrap font-bold">{order.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>;
                    default: return null;
                  }
                })}
              </tr>
              {expanded.includes(order.id) && (
                <tr className="border-b bg-slate-50">
                  <td colSpan={2 + columnVisibility.orderedColumns.filter(column => columnVisibility.isVisible(column.key)).length} className="p-0">
                    <div className="overflow-x-auto p-4">
                      <div className="mb-3 grid gap-3 text-sm md:grid-cols-5">
                        <div><b>Firma Kodu:</b> {order.customer.customerCode}</div>
                        <div><b>İl:</b> {order.shippingAddress?.city || "-"}</div>
                        <div><b>İlçe:</b> {order.shippingAddress?.district || "-"}</div>
                        <div><b>Sipariş Miktarı:</b> {order.plannedQuantity}</div>
                        <div><b>Rezervasyon:</b> {order.reservedQuantity} / {order.plannedQuantity} — {order.reservationStatus === "FULL" ? "Tam Rezerve" : order.reservationStatus === "PARTIAL" ? "Kısmi Rezerve" : "Rezerve Değil"}</div>
                      </div>
                      <table className="w-full min-w-[800px] border-collapse text-sm">
                        <thead><tr className="bg-white text-slate-700">
                          <th className="border p-2">Kalem No</th><th className="border p-2">Barkod</th><th className="border p-2">Ürün Kodu</th><th className="border p-2 text-left">Ürün Tanımı</th><th className="border p-2">Sipariş Miktarı</th><th className="border p-2">Rezervasyon Miktarı</th><th className="border p-2">Karşılama Oranı</th>
                        </tr></thead>
                        <tbody>
                          {order.items.map((item, index) => {
                            const reserved = item.reservedQuantity;
                            const ratio = item.reservationRate;
                            return <tr key={item.id} className="bg-white">
                              <td className="border p-2 text-center">{index + 1}</td><td className="border p-2 text-center">{item.product.barcode || "-"}</td><td className="border p-2 text-center">{item.productCode}</td><td className="border p-2">{item.productName}</td><td className="border p-2 text-center">{item.quantity}</td><td className="border p-2 text-center">{reserved}</td><td className="border p-2 text-center font-bold">{ratio}%</td>
                            </tr>;
                          })}
                        </tbody>
                        <tfoot><tr className="bg-white font-black"><td className="border p-2" colSpan={4}>Toplam</td><td className="border p-2 text-center">{order.plannedQuantity}</td><td className="border p-2 text-center">{order.reservedQuantity}</td><td className="border p-2 text-center">{order.plannedQuantity > 0 ? `${Math.round((order.reservedQuantity / order.plannedQuantity) * 100)}%` : "100%"}</td></tr></tfoot>
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

      <form ref={directFormRef} action={startDirectPickingAction} className="hidden">
        {hiddenInputs}
        <input ref={directPartialRef} type="hidden" name="allowPartialStock" defaultValue="false" />
      </form>
      <form ref={waveFormRef} action={prepareWavePickingAction} className="hidden">
        {hiddenInputs}
        <input ref={wavePartialRef} type="hidden" name="allowPartialStock" defaultValue="false" />
      </form>

      {preflightError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">⚠ {preflightError}</div>
      )}

      {showMode && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Toplama Yöntemi</h2>
            <p className="mt-2 text-slate-600">{selected.length} sipariş seçildi. Toplama emrinin RF terminaline nasıl gönderileceğini seçin.</p>

            <div className="mt-6 grid gap-4">
              <button type="button" disabled={isChecking} onClick={() => preflightAndStart("direct")} className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 text-left hover:border-blue-500 disabled:opacity-50">
                <span className="block text-lg font-black text-blue-950">Sipariş Bazlı Toplama</span>
                <span className="mt-1 block text-sm text-blue-800">Her sipariş stok lokasyonlarına göre Zone görevlerine bölünür ve ortak RF görev havuzuna gönderilir.</span>
              </button>

              <button type="button" onClick={() => preflightAndStart("wave")} disabled={selected.length < 2 || isChecking} className="w-full rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 text-left hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
                <span className="block text-lg font-black text-violet-950">Wave Toplama</span>
                <span className="mt-1 block text-sm text-violet-800">En az 2 sipariş ile Yeni Wave Oluştur ekranına geçilir.</span>
              </button>
            </div>

            {selected.length < 2 && <p className="mt-4 text-sm font-bold text-amber-700">Wave toplama için en az 2 sipariş seçilmelidir.</p>}

            <button type="button" onClick={() => setShowMode(false)} className="mt-6 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {shortages.length > 0 && pendingMode && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-2xl font-black text-amber-950">Eksik stok uyarısı</h2>
            <p className="mt-2 text-slate-700">
              Seçilen siparişlerde mevcut WMS toplanabilir stok, sipariş ihtiyacının altına düşmüş. Siparişleri eksik toplama riskiyle yine de başlatabilir veya stok eksiği bulunan siparişleri Bekliyor durumuna alabilirsiniz.
            </p>
            <div className="mt-5 space-y-3">
              {shortages.map((row) => (
                <div key={`${row.orderItemId}:${row.productId}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-black text-slate-950">{row.orderNumber} nolu siparişin içeriğindeki {row.productCode} kodlu ürün eksik rezerve olmuştur. Sipariş yine de başlatılsın mı?</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{row.productName}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-white p-3"><div className="text-slate-500">İhtiyaç</div><b className="text-lg">{row.requestedQuantity}</b></div>
                    <div className="rounded-xl bg-white p-3"><div className="text-slate-500">Toplanabilir</div><b className="text-lg">{row.availableQuantity}</b></div>
                    <div className="rounded-xl bg-white p-3"><div className="text-slate-500">Eksik</div><b className="text-lg text-red-700">{row.shortageQuantity}</b></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button type="button" disabled={isChecking} onClick={() => { const mode = pendingMode; setShortages([]); setPendingMode(null); submitMode(mode, true); }} className="rounded-xl bg-blue-900 px-5 py-3 font-black text-white disabled:opacity-50">Yine de Başlat</button>
              <button type="button" disabled={isChecking} onClick={holdShortages} className="rounded-xl bg-amber-600 px-5 py-3 font-black text-white disabled:opacity-50">Beklet</button>
              <button type="button" disabled={isChecking} onClick={() => { setShortages([]); setPendingMode(null); }} className="rounded-xl border border-slate-300 px-5 py-3 font-black text-slate-700">Vazgeç</button>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">Beklet seçeneği yalnızca stok eksiği bulunan siparişleri PENDING / Bekliyor durumuna alır ve açık merkezi rezervasyonlarını çözer.</p>
          </div>
        </div>
      )}
    </>
  );
}
