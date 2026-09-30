"use client";

import { useEffect, useMemo, useState } from "react";

export type ColumnOption = { key: string; label: string; defaultVisible?: boolean };
type StoredColumnState = { visible?: Record<string, boolean>; order?: string[] };

export function useColumnVisibility(storageKey: string, columns: ColumnOption[]) {
  const defaultVisible = useMemo(() => Object.fromEntries(columns.map(c => [c.key, c.defaultVisible !== false])), [columns]);
  const defaultOrder = useMemo(() => columns.map(c => c.key), [columns]);
  const [visible, setVisible] = useState<Record<string, boolean>>(defaultVisible);
  const [order, setOrder] = useState<string[]>(defaultOrder);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredColumnState | Record<string, boolean>;
      if ("visible" in parsed || "order" in parsed) {
        const stored = parsed as StoredColumnState;
        setVisible({ ...defaultVisible, ...(stored.visible ?? {}) });
        const known = (stored.order ?? []).filter(key => defaultOrder.includes(key));
        setOrder([...known, ...defaultOrder.filter(key => !known.includes(key))]);
      } else {
        // Eski sadece görünürlük formatını geriye dönük destekle.
        setVisible({ ...defaultVisible, ...(parsed as Record<string, boolean>) });
      }
    } catch {}
  }, [storageKey, defaultVisible, defaultOrder]);

  const persist = (nextVisible: Record<string, boolean>, nextOrder: string[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ visible: nextVisible, order: nextOrder })); } catch {}
  };
  const updateVisible = (next: Record<string, boolean>) => { setVisible(next); persist(next, order); };
  const updateOrder = (next: string[]) => { setOrder(next); persist(visible, next); };
  const move = (dragKey: string, targetKey: string) => {
    if (dragKey === targetKey) return;
    const next = order.filter(key => key !== dragKey);
    const targetIndex = next.indexOf(targetKey);
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragKey);
    updateOrder(next);
  };

  return {
    visible, order,
    orderedColumns: order.map(key => columns.find(c => c.key === key)).filter((c): c is ColumnOption => Boolean(c)),
    isVisible: (key: string) => visible[key] !== false,
    toggle: (key: string) => updateVisible({ ...visible, [key]: visible[key] === false }),
    showAll: () => updateVisible(Object.fromEntries(columns.map(c => [c.key, true]))),
    move,
    reset: () => { setVisible(defaultVisible); setOrder(defaultOrder); persist(defaultVisible, defaultOrder); },
  };
}

export default function ColumnVisibilityMenu({
  columns, visible, order, onToggle, onMove, onShowAll, onReset, label = "Kolonlar",
}: {
  columns: ColumnOption[];
  visible: Record<string, boolean>;
  order?: string[];
  onToggle: (key: string) => void;
  onMove?: (dragKey: string, targetKey: string) => void;
  onShowAll: () => void;
  onReset: () => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const ordered = (order ?? columns.map(c => c.key))
    .map(key => columns.find(c => c.key === key))
    .filter((c): c is ColumnOption => Boolean(c));

  return (
    <div className="relative inline-block translate-x-[5cm] text-left">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
        ⚙ {label}
      </button>
      {open && (
        <div className="absolute left-1/2 z-[100] mt-2 w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="font-black text-slate-900">Kolon Düzeni</div>
          <p className="mb-3 mt-1 text-xs text-slate-500">☰ tutamacından sürükleyerek sırayı değiştirin.</p>
          <div className="max-h-80 space-y-2 overflow-auto">
            {ordered.map(column => (
              <div key={column.key} draggable={Boolean(onMove)}
                onDragStart={event => { setDragKey(column.key); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", column.key); }}
                onDragOver={event => event.preventDefault()}
                onDrop={event => { event.preventDefault(); const source = event.dataTransfer.getData("text/plain") || dragKey; if (source && onMove) onMove(source, column.key); setDragKey(null); }}
                onDragEnd={() => setDragKey(null)}
                className={`flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-slate-200 hover:bg-slate-50 ${dragKey === column.key ? "opacity-50" : ""}`}>
                <span className="cursor-grab select-none text-slate-400" title="Sürükle">☰</span>
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={visible[column.key] !== false} onChange={() => onToggle(column.key)} />
                  <span className="text-sm font-semibold text-slate-700">{column.label}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2 border-t pt-3">
            <button type="button" onClick={onShowAll} className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Tümünü Göster</button>
            <button type="button" onClick={onReset} className="flex-1 rounded-lg border px-3 py-2 text-xs font-bold">Varsayılana Dön</button>
          </div>
        </div>
      )}
    </div>
  );
}
