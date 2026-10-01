"use client";

import Link from "next/link";
import ColumnVisibilityMenu, { useColumnVisibility } from "@/components/admin/ColumnVisibilityMenu";

const columns=[
 {key:"warehouse",label:"Depo"},{key:"barcode",label:"Barkod"},{key:"productCode",label:"Ürün Kodu"},{key:"productName",label:"Ürün Tanımı"},
 {key:"thm",label:"THM"},{key:"location",label:"Lokasyon / Tam Adres"},{key:"physical",label:"Fiziksel"},{key:"reserved",label:"Rezerve"},{key:"available",label:"Kullanılabilir"},
];
export type SkuStockRow={id:number;warehouse:string;barcode:string;productCode:string;productName:string;thm:string;location:string;physical:number;reserved:number;available:number};

export default function SkuStockTable({rows}:{rows:SkuStockRow[]}){
 const state=useColumnVisibility("etken:columns:sku-stock-control",columns);
 const shown=state.orderedColumns.filter(c=>state.isVisible(c.key));
 const value=(r:SkuStockRow,key:string)=>key==="warehouse"?r.warehouse:key==="barcode"?r.barcode:key==="productCode"?r.productCode:key==="productName"?r.productName:key==="thm"?r.thm:key==="location"?r.location:key==="physical"?r.physical:key==="reserved"?r.reserved:key==="available"?r.available:"-";
 return <><div className="mt-7 flex justify-end"><ColumnVisibilityMenu columns={columns} visible={state.visible} order={state.order} onToggle={state.toggle} onMove={state.move} onShowAll={state.showAll} onReset={state.reset}/></div>
 <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr>{shown.map(c=><th key={c.key} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",c.key)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();state.move(e.dataTransfer.getData("text/plain"),c.key)}} className={`cursor-move select-none p-3 ${["physical","reserved","available"].includes(c.key)?"text-right":"text-left"}`}>{c.label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t">{shown.map(c=><td key={c.key} className={`p-3 ${["physical","reserved","available"].includes(c.key)?"text-right":""} ${c.key==="productCode"||c.key==="available"?"font-bold":""}`}>{value(r,c.key)}</td>)}</tr>)}</tbody></table></div></>;
}
