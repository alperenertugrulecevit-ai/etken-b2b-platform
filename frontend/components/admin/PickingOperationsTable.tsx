"use client";

import { Fragment, useState } from "react";
import ColumnVisibilityMenu, { useColumnVisibility } from "@/components/admin/ColumnVisibilityMenu";
import { reopenPickingShortageAction, refreshPickingReservationAction } from "@/app/admin/picking-operations/actions";

const mainColumns=[
 {key:"date",label:"Toplama Görev Tarihi"},{key:"type",label:"Toplama Tipi"},{key:"orderType",label:"Sipariş Tipi"},
 {key:"person",label:"Toplama Personeli"},{key:"waveNo",label:"Wave No"},{key:"orderNo",label:"Sipariş No"},
 {key:"zone",label:"Zone"},{key:"planned",label:"Toplanacak Miktar"},{key:"picked",label:"Toplanan Miktar"},
 {key:"difference",label:"Fark"},{key:"percentage",label:"Tamamlanma Yüzdesi"},{key:"status",label:"Toplama Durumu"},
];
const detailColumns=[
 {key:"date",label:"Toplama Görev Tarihi"},{key:"barcode",label:"Barkod"},{key:"productCode",label:"Ürün Kodu"},
 {key:"productName",label:"Ürün Tanımı"},{key:"planned",label:"Toplanacak Miktar"},{key:"picked",label:"Toplanan Miktar"},
 {key:"difference",label:"Fark"},{key:"percentage",label:"Tamamlanma Yüzdesi"},{key:"shortage",label:"Eksik Kapatma Nedeni"},
];
const reasonLabel:Record<string,string>={NOT_FOUND:"Ürün Bulunamadı",DAMAGED:"Hasarlı",STOCK_DIFFERENCE:"Stok Farkı",QUALITY_REJECTED:"Kalite Reddi",OTHER:"Diğer"};
const pct=(done:number,total:number)=>total>0?Math.min(100,Math.round(done/total*100)):0;

export default function PickingOperationsTable({groups}:{groups:any[]}){
 const main=useColumnVisibility("etken:columns:picking-operations:main",mainColumns);
 const detail=useColumnVisibility("etken:columns:picking-operations:detail",detailColumns);
 const [open,setOpen]=useState<string[]>([]);
 const mainValue=(g:any,key:string)=>{
  switch(key){case"date":return g.dateText;case"type":return g.type;case"orderType":return g.orderType;case"person":return g.person;case"waveNo":return g.waveNo;case"orderNo":return g.orderNo;case"zone":return g.zone;case"planned":return g.planned;case"picked":return g.picked;case"difference":return Math.max(0,g.planned-g.picked-g.short);case"percentage":return `%${pct(g.picked+g.short,g.planned)}`;case"status":return g.status;default:return"-";}
 };
 return <>
  <div className="mb-3 flex flex-wrap justify-end gap-2">
   <ColumnVisibilityMenu label="Ana Kolonlar" columns={mainColumns} visible={main.visible} order={main.order} onToggle={main.toggle} onMove={main.move} onShowAll={main.showAll} onReset={main.reset}/>
   <ColumnVisibilityMenu label="Detay Kolonları" columns={detailColumns} visible={detail.visible} order={detail.order} onToggle={detail.toggle} onMove={detail.move} onShowAll={detail.showAll} onReset={detail.reset}/>
  </div>
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
   <table className="min-w-[1250px] w-full text-sm"><thead className="bg-slate-900 text-white"><tr><th className="px-3 py-3"></th>{main.orderedColumns.filter(c=>main.isVisible(c.key)).map(c=><th key={c.key} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",c.key)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();main.move(e.dataTransfer.getData("text/plain"),c.key)}} className="cursor-move select-none px-3 py-3 text-left">{c.label}</th>)}</tr></thead>
   <tbody>{groups.map(g=>{const key=String(g.key);const isOpen=open.includes(key);return <Fragment key={key}>
    <tr className="border-t border-slate-200 font-bold"><td className="px-3 py-3"><button type="button" onClick={()=>setOpen(v=>isOpen?v.filter(x=>x!==key):[...v,key])} className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white font-black hover:bg-slate-100">{isOpen?"−":"+"}</button></td>{main.orderedColumns.filter(c=>main.isVisible(c.key)).map(c=><td key={c.key} className="px-3 py-3">{mainValue(g,c.key)}</td>)}</tr>
    {isOpen&&<tr className="bg-slate-50"><td></td><td colSpan={main.orderedColumns.filter(c=>main.isVisible(c.key)).length} className="p-0"><table className="w-full text-xs"><thead className="bg-slate-200"><tr>{detail.orderedColumns.filter(c=>detail.isVisible(c.key)).map(c=><th key={c.key} className="px-3 py-2 text-left">{c.label}</th>)}</tr></thead><tbody>{g.items.map((i:any)=>{const sh=i.pickingShortages.reduce((a:number,r:any)=>a+r.quantity,0);return <tr key={i.id} className="border-t border-slate-200">{detail.orderedColumns.filter(c=>detail.isVisible(c.key)).map(c=><td key={c.key} className="px-3 py-2">{c.key==="date"?g.dateText:c.key==="barcode"?(i.barcode??"-"):c.key==="productCode"?i.productCode:c.key==="productName"?i.productName:c.key==="planned"?i.quantity:c.key==="picked"?i.pickedQuantity:c.key==="difference"?Math.max(0,i.quantity-i.pickedQuantity-sh):c.key==="percentage"?`%${pct(i.pickedQuantity+sh,i.quantity)}`:c.key==="shortage"?<div className="space-y-2">{i.pickingShortages.length===0?<span>-</span>:i.pickingShortages.map((r:any)=><div key={r.id} className="flex flex-wrap items-center gap-2"><span>{reasonLabel[r.reason]??r.reason} ({r.quantity})</span><form action={reopenPickingShortageAction}><input type="hidden" name="shortageId" value={r.id}/><input type="hidden" name="note" value="Toplama Operasyonları İzleme ekranından yeniden açıldı."/><button className="rounded bg-blue-700 px-2 py-1 font-bold text-white">Yeniden Toplamaya Aç</button></form></div>)}{Math.max(0,i.quantity-i.pickedQuantity-sh)>0&&<form action={refreshPickingReservationAction}><input type="hidden" name="orderId" value={i.orderId}/><input type="hidden" name="note" value="Toplama Operasyonları İzleme ekranından rezervasyon yenilendi."/><button className="rounded bg-emerald-700 px-2 py-1 font-bold text-white">Rezervasyon Yenile</button></form>}</div>:"-"}</td>)}</tr>})}</tbody></table></td></tr>}
   </Fragment>})}</tbody></table>
  </div>
 </>;
}
