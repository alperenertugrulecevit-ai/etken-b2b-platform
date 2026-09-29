"use client";

import { ReactNode, useState } from "react";

export default function ExpandablePickingRows({
  rowKey,
  summaryCells,
  detail,
}: {
  rowKey: string;
  summaryCells: ReactNode;
  detail: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t border-slate-200 font-bold">
        <td className="px-3 py-3">
          <button type="button" aria-expanded={open} aria-controls={`picking-detail-${rowKey}`} onClick={() => setOpen((value) => !value)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white font-black hover:bg-slate-100">
            {open ? "−" : "+"}
          </button>
        </td>
        {summaryCells}
      </tr>
      {open ? <tr id={`picking-detail-${rowKey}`} className="bg-slate-50"><td /><td colSpan={11} className="p-0">{detail}</td></tr> : null}
    </>
  );
}
