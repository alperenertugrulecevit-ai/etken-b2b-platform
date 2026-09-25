"use client";

import { useMemo, useState } from "react";

type Props = {
  tableId: string;
  columnIndex: number;
  label: string;
  values: string[];
};

export default function TableHeaderMultiFilter({ tableId, columnIndex, label, values }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const options = useMemo(() => Array.from(new Set(values.filter(Boolean))).sort((a,b)=>a.localeCompare(b,"tr")), [values]);

  function apply(next: string[]) {
    setSelected(next);
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll<HTMLTableRowElement>("tbody tr[data-filter-row='true']").forEach((row) => {
      row.dataset["filter" + columnIndex] = row.cells[columnIndex]?.innerText.trim() ?? "";
    });
    table.querySelectorAll<HTMLTableRowElement>("tbody tr[data-filter-row='true']").forEach((row) => {
      const filters = table.querySelectorAll<HTMLElement>("[data-column-filter]");
      let visible = true;
      filters.forEach((filter) => {
        const idx = Number(filter.dataset.columnFilter);
        const raw = filter.dataset.selected ?? "";
        const wanted = raw ? raw.split("\u001f") : [];
        if (wanted.length && !wanted.includes(row.dataset["filter" + idx] ?? "")) visible = false;
      });
      row.style.display = visible ? "" : "none";
    });
  }

  return (
    <details id={`${tableId}-filter-${columnIndex}`} className="relative mt-2 text-slate-900" data-column-filter={columnIndex} data-selected={selected.join("\u001f")}>
      <summary className="cursor-pointer list-none rounded-lg bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25">Filtre ▾</summary>
      <div className="absolute left-0 z-30 mt-1 max-h-72 min-w-56 overflow-auto rounded-xl border bg-white p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-bold">{label}</span>
          <button type="button" onClick={() => apply([])} className="text-xs font-bold text-blue-700">Temizle</button>
        </div>
        {options.length === 0 ? <p className="text-xs text-slate-500">Değer yok</p> : options.map((value) => (
          <label key={value} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1.5 text-xs hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(value)} onChange={(e) => {
              const next = e.target.checked ? [...selected, value] : selected.filter((item) => item !== value);
              apply(next);
            }} />
            <span className="max-w-64 break-words">{value}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
