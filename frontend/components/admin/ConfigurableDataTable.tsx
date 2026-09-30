"use client";

import { ReactNode } from "react";
import ColumnVisibilityMenu, { ColumnOption, useColumnVisibility } from "@/components/admin/ColumnVisibilityMenu";

export default function ConfigurableDataTable({
 storageKey, columns, rows, tableId, minWidth="1100px", toolbar,
}:{
 storageKey:string; columns:ColumnOption[]; rows:Array<{key:string|number;cells:Record<string,ReactNode>}>;
 tableId?:string; minWidth?:string; toolbar?:ReactNode;
}){
 const state=useColumnVisibility(storageKey,columns);
 const shown=state.orderedColumns.filter(c=>state.isVisible(c.key));
 return <>
  <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{toolbar}<ColumnVisibilityMenu columns={columns} visible={state.visible} order={state.order} onToggle={state.toggle} onMove={state.move} onShowAll={state.showAll} onReset={state.reset}/></div>
  <div className="overflow-x-auto rounded-2xl bg-white shadow">
   <table id={tableId} className="w-full text-sm" style={{minWidth}}>
    <thead className="bg-slate-100"><tr>{shown.map(c=><th key={c.key} className="whitespace-nowrap p-3 text-left font-bold text-slate-700">{c.label}</th>)}</tr></thead>
    <tbody>{rows.map(row=><tr key={row.key} className="border-t hover:bg-slate-50">{shown.map(c=><td key={c.key} className="whitespace-nowrap p-3">{row.cells[c.key]??"-"}</td>)}</tr>)}</tbody>
   </table>
  </div>
 </>;
}
