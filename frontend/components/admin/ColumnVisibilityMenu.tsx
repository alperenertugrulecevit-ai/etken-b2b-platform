"use client";

import { useEffect, useMemo, useState } from "react";

export type ColumnOption = { key: string; label: string; defaultVisible?: boolean };

export function useColumnVisibility(storageKey: string, columns: ColumnOption[]) {
  const defaults = useMemo(() => Object.fromEntries(columns.map(c => [c.key, c.defaultVisible !== false])), [columns]);
  const [visible, setVisible] = useState<Record<string, boolean>>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setVisible({ ...defaults, ...JSON.parse(raw) });
    } catch {}
  }, [storageKey, defaults]);

  const update = (next: Record<string, boolean>) => {
    setVisible(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  return {
    visible,
    isVisible: (key: string) => visible[key] !== false,
    toggle: (key: string) => update({ ...visible, [key]: visible[key] === false }),
    showAll: () => update(Object.fromEntries(columns.map(c => [c.key, true]))),
    reset: () => update(defaults),
  };
}

export default function ColumnVisibilityMenu({
  columns, visible, onToggle, onShowAll, onReset, label = "Kolonlar",
}: {
  columns: ColumnOption[];
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onReset: () => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
        ⚙ {label}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-3 font-black text-slate-900">Göster / Gizle</div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {columns.map(column => (
              <label key={column.key} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                <input type="checkbox" checked={visible[column.key] !== false} onChange={() => onToggle(column.key)} />
                <span className="text-sm font-semibold text-slate-700">{column.label}</span>
              </label>
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
