"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Suggestion = { code: string; name: string; brand: string; imageUrl: string | null };

export default function ProductSearchBox({ mobile = false }: { mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setSuggestions([]); setOpen(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/public/product-search-suggestions?q=${encodeURIComponent(value)}`, { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : { suggestions: [] })
        .then((data) => { setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []); setOpen(true); })
        .catch(() => {});
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full">
      <div className={mobile ? "flex w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-50" : "flex w-full overflow-hidden rounded-xl border border-[#EF4B23] bg-white shadow-sm"}>
        <input
          type="search" name="q" value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          autoComplete="off"
          placeholder={mobile ? "Ürün veya marka ara..." : "Ürün, marka, barkod veya ürün kodu ara..."}
          className={mobile ? "min-w-0 flex-1 bg-transparent px-4 py-2 text-xs outline-none" : "min-w-0 flex-1 px-5 py-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400"}
        />
        <button type="submit" className={mobile ? "bg-[#EF4B23] px-4 text-xs font-black text-white" : "min-w-28 bg-[#EF4B23] px-6 text-xs font-black text-white transition hover:bg-[#D83D18]"}>ARA</button>
      </div>
      {open && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {suggestions.map((item) => (
            <Link key={item.code} href={`/products/${item.code}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-orange-50">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 object-contain" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">📦</span>}
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs text-slate-900">{item.name}</strong>
                <small className="mt-0.5 block truncate text-[10px] text-slate-500">{item.brand} · {item.code}</small>
              </span>
            </Link>
          ))}
          <Link href={`/products?q=${encodeURIComponent(query)}`} className="block bg-slate-50 px-4 py-2.5 text-center text-[11px] font-black text-[#EF4B23]">Tüm sonuçları gör →</Link>
        </div>
      ) : null}
    </div>
  );
}
