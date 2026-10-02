"use client";

import { useMemo, useState } from "react";
import ColumnVisibilityMenu,{ColumnOption,useColumnVisibility} from "@/components/admin/ColumnVisibilityMenu";

export type ReceivingTrackingRow={
  id:string|number;
  date:string;
  warehouseCode:string;
  person:string;
  movementType:string;
  orderNo:string;
  supplierCode:string;
  supplierName:string;
  deliveryNoteNumber:string;
  deliveryNoteDate:string;
  thm:string;
  productCode:string;
  productName:string;
  quantity:number;
};

const columns:ColumnOption[]=[
  {key:"date",label:"Giriş Okutma Tarihi"},
  {key:"warehouseCode",label:"Depo Kodu"},
  {key:"person",label:"Personel"},
  {key:"movementType",label:"Hareket Tipi"},
  {key:"orderNo",label:"Giriş Sipariş No"},
  {key:"supplierCode",label:"Tedarikçi Kodu"},
  {key:"supplierName",label:"Tedarikçi İsmi"},
  {key:"deliveryNoteNumber",label:"İrsaliye No"},
  {key:"deliveryNoteDate",label:"İrsaliye Tarihi"},
  {key:"thm",label:"THM"},
  {key:"productCode",label:"Ürün Kodu"},
  {key:"productName",label:"Ürün Tanımı"},
  {key:"quantity",label:"Miktar"},
];

const text=(v:unknown)=>String(v??"").toLocaleLowerCase("tr-TR");

export default function ReceivingTrackingTable({rows}:{rows:ReceivingTrackingRow[]}){
  const s=useColumnVisibility("etken:columns:receiving-tracking-report",columns);
  const shown=s.orderedColumns.filter(c=>s.isVisible(c.key));
  const [filters,setFilters]=useState<Record<string,string>>({});
  const filtered=useMemo(()=>rows.filter(row=>shown.every(col=>{
    const q=(filters[col.key]??"").trim().toLocaleLowerCase("tr-TR");
    if(!q)return true;
    return text(row[col.key as keyof ReceivingTrackingRow]).includes(q);
  })),[rows,shown,filters]);
  const total=filtered.reduce((sum,row)=>sum+row.quantity,0);
  const distinct=(key:keyof ReceivingTrackingRow)=>new Set(filtered.map(r=>r[key]).filter(v=>v!==""&&v!=="-")).size;
  const totals:Record<string,string|number>={
    date:"Toplam",
    movementType:distinct("movementType"),
    orderNo:distinct("orderNo"),
    supplierCode:distinct("supplierCode"),
    supplierName:distinct("supplierName"),
    deliveryNoteNumber:distinct("deliveryNoteNumber"),
    thm:distinct("thm"),
    productCode:distinct("productCode"),
    quantity:total.toLocaleString("tr-TR"),
  };
  return <>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm font-semibold text-slate-600">{filtered.length.toLocaleString("tr-TR")} kayıt</div>
      <ColumnVisibilityMenu columns={columns} visible={s.visible} order={s.order} onToggle={s.toggle} onMove={s.move} onShowAll={s.showAll} onReset={s.reset}/>
    </div>
    <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <table id="wms-receiving-tracking-table" className="w-full" style={{minWidth:"1750px"}}>
        <thead>
          <tr>{shown.map(c=><th key={c.key} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",c.key)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();s.move(e.dataTransfer.getData("text/plain"),c.key)}} className="cursor-move select-none whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">{c.label}</th>)}</tr>
          <tr data-export-ignore="true">{shown.map(c=><th key={c.key} className="border-b border-slate-200 bg-white px-2 py-2"><input value={filters[c.key]??""} onChange={e=>setFilters(v=>({...v,[c.key]:e.target.value}))} placeholder="Filtrele..." className="w-full min-w-[105px] rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-normal text-slate-700 outline-none focus:border-blue-500"/></th>)}</tr>
        </thead>
        <tbody>
          {filtered.map(r=><tr key={r.id} className="hover:bg-slate-50">{shown.map(c=><td key={c.key} className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{c.key==="quantity"?r.quantity.toLocaleString("tr-TR"):String(r[c.key as keyof ReceivingTrackingRow]??"-")}</td>)}</tr>)}
          {filtered.length===0?<tr><td colSpan={Math.max(1,shown.length)} className="p-10 text-center text-slate-500">Filtreye uygun giriş okutma kaydı bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold">{shown.map(c=><td key={c.key} className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{totals[c.key]??"-"}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  </>;
}
