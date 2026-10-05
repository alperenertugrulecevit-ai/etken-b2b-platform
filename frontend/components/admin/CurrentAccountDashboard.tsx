"use client";

import { useMemo, useState } from "react";

export type CurrentAccountRow = {
  id: string;
  customerType: "Bireysel" | "Kurumsal";
  movement: "Gelir" | "Gider" | "İade";
  date: string;
  customerCode: string;
  customerName: string;
  orderNo: string;
  documentNo: string;
  amount: number;
  vatAmount: number;
  grandTotal: number;
  description: string;
};

type ColumnKey = keyof Omit<CurrentAccountRow, "id">;
type Column = { key: ColumnKey; label: string };

const initialColumns: Column[] = [
  { key: "customerType", label: "Müşteri Tipi" },
  { key: "movement", label: "Cari Hareket" },
  { key: "date", label: "Tarih" },
  { key: "customerCode", label: "Müşteri Kodu" },
  { key: "customerName", label: "Müşteri İsmi" },
  { key: "orderNo", label: "Sipariş No" },
  { key: "documentNo", label: "Belge/İrsaliye No" },
  { key: "amount", label: "Tutar" },
  { key: "vatAmount", label: "KDV" },
  { key: "grandTotal", label: "Genel Toplam" },
  { key: "description", label: "Açıklama" },
];

const filterKeys: ColumnKey[] = [
  "customerType", "movement", "date", "customerCode",
  "customerName", "orderNo", "documentNo",
];

const formatMoney = (value: number) =>
  value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function CurrentAccountDashboard({ rows }: { rows: CurrentAccountRow[] }) {
  const [columns, setColumns] = useState(initialColumns);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState<ColumnKey | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => rows.filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return filterKeys.filter((key) => key !== "date").every((key) => {
      const needle = (filters[key] ?? "").trim().toLocaleLowerCase("tr-TR");
      if (!needle) return true;
      return String(row[key] ?? "").toLocaleLowerCase("tr-TR").includes(needle);
    });
  }), [rows, filters, startDate, endDate]);

  const totals = useMemo(() => filtered.reduce((acc, row) => {
    acc[row.movement] += row.grandTotal;
    return acc;
  }, { Gelir: 0, Gider: 0, "İade": 0 }), [filtered]);

  function drop(target: ColumnKey) {
    if (!dragged || dragged === target) return setDragged(null);
    setColumns((current) => {
      const next = [...current];
      const from = next.findIndex((x) => x.key === dragged);
      const to = next.findIndex((x) => x.key === target);
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragged(null);
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-5 shadow"><p className="text-sm font-bold text-slate-500">Hareket Sayısı</p><p className="mt-2 text-3xl font-black">{filtered.length.toLocaleString("tr-TR")}</p></article>
        <article className="rounded-2xl bg-white p-5 shadow"><p className="text-sm font-bold text-slate-500">Gelir</p><p className="mt-2 text-3xl font-black text-emerald-700">{formatMoney(totals.Gelir)}</p></article>
        <article className="rounded-2xl bg-white p-5 shadow"><p className="text-sm font-bold text-slate-500">Gider</p><p className="mt-2 text-3xl font-black text-red-700">{formatMoney(totals.Gider)}</p></article>
        <article className="rounded-2xl bg-white p-5 shadow"><p className="text-sm font-bold text-slate-500">İade</p><p className="mt-2 text-3xl font-black text-amber-700">{formatMoney(totals["İade"])}</p></article>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <label>
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Başlangıç Tarihi</span>
            <input type="date" className="w-full rounded-xl border p-3" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Bitiş Tarihi</span>
            <input type="date" className="w-full rounded-xl border p-3" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          {initialColumns.filter((c) => filterKeys.includes(c.key) && c.key !== "date").map((column) => (
            <label key={column.key}>
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{column.label}</span>
              {column.key === "customerType" || column.key === "movement" ? (
                <select className="w-full rounded-xl border bg-white p-3" value={filters[column.key] ?? ""} onChange={(e) => setFilters((f) => ({ ...f, [column.key]: e.target.value }))}>
                  <option value="">Tümü</option>
                  {(column.key === "customerType" ? ["Bireysel", "Kurumsal"] : ["Gelir", "Gider", "İade"]).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              ) : (
                <input type={column.key === "date" ? "date" : "text"} className="w-full rounded-xl border p-3" value={filters[column.key] ?? ""} onChange={(e) => setFilters((f) => ({ ...f, [column.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>
        <button type="button" onClick={() => { setFilters({}); setStartDate(""); setEndDate(""); }} className="mt-4 rounded-xl border px-4 py-2 font-bold hover:bg-slate-50">Filtreleri Temizle</button>
      </div>

      <p className="mt-4 text-sm text-slate-500">Kolon sırasını değiştirmek için başlığı sürükleyip istediğiniz konuma bırakın.</p>
      <div className="mt-2 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1700px] text-left text-sm">
          <thead className="bg-blue-950 text-white">
            <tr>
              {columns.map((column) => (
                <th key={column.key} draggable onDragStart={() => setDragged(column.key)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(column.key)} className="cursor-grab select-none whitespace-nowrap p-4 active:cursor-grabbing" title="Sürükleyerek kolon sırasını değiştir">
                  {column.label} <span className="ml-1 opacity-60">↔</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className={"p-4 " + (["amount", "vatAmount", "grandTotal"].includes(column.key) ? "whitespace-nowrap text-right font-black" : "")}>
                    {["amount", "vatAmount", "grandTotal"].includes(column.key) ? formatMoney(Number(row[column.key])) : row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={columns.length} className="p-12 text-center text-slate-500">Filtrelere uygun cari hareket bulunamadı.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
