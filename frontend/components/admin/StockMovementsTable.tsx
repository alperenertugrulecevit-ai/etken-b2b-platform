"use client";

import Link from "next/link";
import ColumnVisibilityMenu, { useColumnVisibility } from "@/components/admin/ColumnVisibilityMenu";
const columns=[
 {key:"date",label:"Tarih"},{key:"barcode",label:"Barkod"},{key:"product",label:"Ürün"},{key:"location",label:"Lokasyon / Adres"},
 {key:"thm",label:"THM"},{key:"type",label:"Hareket Tipi"},{key:"document",label:"Belge / Sipariş"},{key:"physicalChange",label:"Fiziksel Değişim"},
 {key:"reservedChange",label:"Rezervasyon Değişimi"},{key:"physicalBalance",label:"Fiziksel Bakiye"},{key:"reservedBalance",label:"Rezerve Bakiye"},
 {key:"availableBalance",label:"Kullanılabilir Bakiye"},{key:"description",label:"Açıklama"},{key:"actions",label:"İşlemler"},
];
const labels:Record<string,string>={INITIAL_STOCK:"Açılış Stoğu",PURCHASE_RECEIPT:"Mal Kabul",MANUAL_IN:"Manuel Stok Girişi",MANUAL_OUT:"Manuel Stok Çıkışı",RESERVATION_CREATE:"Rezervasyon Oluşturma",RESERVATION_RELEASE:"Rezervasyon Çözme",SALE_SHIPMENT:"Satış Sevkiyatı",SALE_RETURN:"Satış İadesi",COUNT_INCREASE:"Sayım Fazlası",COUNT_DECREASE:"Sayım Eksiği",TRANSFER_IN:"Transfer Girişi",TRANSFER_OUT:"Transfer Çıkışı",LOST_STOCK_IN:"Kayıp Stok Girişi",LOST_STOCK_OUT:"Kayıp Stok Çıkışı"};
const classes:Record<string,string>={PURCHASE_RECEIPT:"bg-green-100 text-green-700",MANUAL_IN:"bg-green-100 text-green-700",MANUAL_OUT:"bg-red-100 text-red-700",RESERVATION_CREATE:"bg-orange-100 text-orange-700",RESERVATION_RELEASE:"bg-blue-100 text-blue-700",SALE_SHIPMENT:"bg-red-100 text-red-700",SALE_RETURN:"bg-green-100 text-green-700",COUNT_INCREASE:"bg-emerald-100 text-emerald-700",COUNT_DECREASE:"bg-rose-100 text-rose-700",TRANSFER_IN:"bg-cyan-100 text-cyan-700",TRANSFER_OUT:"bg-violet-100 text-violet-700",LOST_STOCK_IN:"bg-amber-100 text-amber-800",LOST_STOCK_OUT:"bg-red-100 text-red-800"};
const num=(v:number)=>v.toLocaleString("tr-TR"),signed=(v:number)=>v>0?`+${num(v)}`:num(v);
export type StockMovementRow={id:number;date:string;barcode:string;productId:number;productCode:string;productName:string;location:string;thm:string;type:string;document:string;orderId:number|null;orderNumber:string|null;physicalChange:number;reservedChange:number;physicalBalance:number;reservedBalance:number;availableBalance:number;description:string};

export default function StockMovementsTable({rows}:{rows:StockMovementRow[]}){
 const state=useColumnVisibility("etken:columns:stock-movements",columns),shown=state.orderedColumns.filter(c=>state.isVisible(c.key));
 const cell=(r:StockMovementRow,key:string)=>{
  switch(key){
   case"date":return r.date;case"barcode":return <span className="font-mono">{r.barcode}</span>;
   case"product":return <><p className="font-bold text-blue-900">{r.productCode}</p><p className="mt-1 max-w-64 text-sm text-gray-600">{r.productName}</p></>;
   case"location":return <span className="text-slate-500">{r.location}</span>;case"thm":return <span className="text-slate-500">{r.thm}</span>;
   case"type":return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${classes[r.type]??"bg-slate-100 text-slate-700"}`}>{labels[r.type]??r.type}</span>;
   case"document":return <><p className="font-semibold">{r.document}</p>{r.orderNumber&&<p className="mt-1 text-sm text-gray-500">{r.orderNumber}</p>}</>;
   case"physicalChange":return <span className={`font-bold ${r.physicalChange>0?"text-green-700":r.physicalChange<0?"text-red-700":"text-gray-400"}`}>{signed(r.physicalChange)}</span>;
   case"reservedChange":return <span className={`font-bold ${r.reservedChange>0?"text-orange-700":r.reservedChange<0?"text-blue-700":"text-gray-400"}`}>{signed(r.reservedChange)}</span>;
   case"physicalBalance":return <span className="font-semibold">{num(r.physicalBalance)}</span>;case"reservedBalance":return <span className="font-semibold">{num(r.reservedBalance)}</span>;
   case"availableBalance":return <span className="font-bold text-green-700">{num(r.availableBalance)}</span>;case"description":return <span className="text-sm text-gray-600">{r.description}</span>;
   case"actions":return <div className="flex flex-wrap gap-2"><Link href={`/admin/products/${r.productId}`} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white">Ürünü Aç</Link>{r.orderId&&<Link href={`/admin/orders/${r.orderId}`} className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white">Siparişi Aç</Link>}</div>;
   default:return"-";
  }
 };
 return <><div className="mt-8 flex justify-end"><ColumnVisibilityMenu columns={columns} visible={state.visible} order={state.order} onToggle={state.toggle} onMove={state.move} onShowAll={state.showAll} onReset={state.reset}/></div><div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow"><table id="stock-movements-table" className="w-full min-w-[1850px] text-left"><thead className="bg-blue-900 text-white"><tr>{shown.map(c=><th key={c.key} className="p-4">{c.label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b hover:bg-slate-50">{shown.map(c=><td key={c.key} className="whitespace-nowrap p-4">{cell(r,c.key)}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={Math.max(1,shown.length)} className="p-12 text-center text-gray-500">Seçilen filtrelere uygun stok hareketi bulunamadı.</td></tr>}</tbody></table></div></>;
}
