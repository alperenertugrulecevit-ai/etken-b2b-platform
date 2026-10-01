"use client";
import { useActionState,useEffect,useRef,useState } from "react";
import { initialReturnReceiveState,rfReceiveReturnItem } from "@/app/rf/return-receiving/actions";

type ReturnData={returnNumber:string;orderNumber:string;customerName:string;deliveryNoteNumber:string;deliveryNoteDate:string;status:string;items:{id:string;productCode:string;productBarcode:string;productName:string;expectedQuantity:number;receivedQuantity:number}[]};
type Hu={id:number;barcode:string;warehouseCode:string;locationCode:string};

export default function RFReturnReceivingForm({returns,handlingUnits}:{returns:ReturnData[];handlingUnits:Hu[]}){
 const [state,action,pending]=useActionState(rfReceiveReturnItem,initialReturnReceiveState);
 const [returnNumber,setReturnNumber]=useState(""),[deliveryNoteNumber,setDeliveryNoteNumber]=useState(""),[deliveryNoteDate,setDeliveryNoteDate]=useState(""),[hu,setHu]=useState(""),[product,setProduct]=useState("");
 const returnRef=useRef<HTMLInputElement>(null),noteRef=useRef<HTMLInputElement>(null),dateRef=useRef<HTMLInputElement>(null),huRef=useRef<HTMLInputElement>(null),productRef=useRef<HTMLInputElement>(null);
 const selected=returns.find(x=>x.returnNumber.toUpperCase()===returnNumber.trim().toUpperCase());
 useEffect(()=>{if(selected){setDeliveryNoteNumber(selected.deliveryNoteNumber);setDeliveryNoteDate(selected.deliveryNoteDate)}else{setDeliveryNoteNumber("");setDeliveryNoteDate("")}},[selected]);
 useEffect(()=>{if(state.success){setProduct("");setTimeout(()=>productRef.current?.focus(),80)}},[state.success,state.message]);
 return <form action={action} className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
  <h2 className="text-xl font-black">İade Giriş Barkod Akışı</h2><p className="mt-1 text-xs text-slate-500">İade Siparişi → İrsaliye → İrsaliye Tarihi → Hedef THM → Ürün (tekil okutma)</p>
  {state.message&&<div className={`mt-4 rounded-xl p-4 font-bold ${state.success?"bg-green-50 text-green-800":"bg-red-50 text-red-700"}`}>{state.success?"✓ ":"✕ "}{state.message}{state.success&&<div className="mt-2 text-sm">Satır kalan: {state.remainingQuantity} · İade durumu: {state.status}</div>}</div>}
  <datalist id="return-orders">{returns.map(x=><option key={x.returnNumber} value={x.returnNumber}>{x.orderNumber} — {x.customerName}</option>)}</datalist>
  <datalist id="return-hus">{handlingUnits.map(x=><option key={x.id} value={x.barcode}>{x.warehouseCode} — {x.locationCode}</option>)}</datalist>
  <datalist id="return-products">{selected?.items.filter(x=>x.receivedQuantity<x.expectedQuantity).flatMap(x=>[<option key={x.id} value={x.productBarcode}>{x.productCode} — Kalan {x.expectedQuantity-x.receivedQuantity}</option>,<option key={`c-${x.id}`} value={x.productCode}>{x.productBarcode} — Kalan {x.expectedQuantity-x.receivedQuantity}</option>])}</datalist>
  <div className="mt-5 space-y-4">
   <label className="block"><b>1. İade Giriş Siparişi</b><input ref={returnRef} list="return-orders" name="returnNumber" value={returnNumber} onChange={e=>setReturnNumber(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"&&selected){e.preventDefault();noteRef.current?.focus()}}} className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-bold uppercase" placeholder="IAD... okut / gir" required/></label>
   {selected&&<div className="rounded-xl bg-blue-50 p-3 text-sm"><b>{selected.orderNumber} · {selected.customerName}</b><div className="mt-1">Kalan kalem: {selected.items.filter(x=>x.receivedQuantity<x.expectedQuantity).length}</div></div>}
   <div className="grid gap-4 md:grid-cols-2"><label><b>2. İrsaliye No *</b><input ref={noteRef} name="deliveryNoteNumber" value={deliveryNoteNumber} onChange={e=>setDeliveryNoteNumber(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();dateRef.current?.focus()}}} className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-bold uppercase" required/></label><label><b>3. İrsaliye Tarihi *</b><input ref={dateRef} type="date" name="deliveryNoteDate" value={deliveryNoteDate} onChange={e=>setDeliveryNoteDate(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();huRef.current?.focus()}}} className="mt-2 w-full rounded-xl border-2 p-4 text-xl font-bold" required/></label></div>
   <label className="block"><b>4. Hedef Stok THM</b><input ref={huRef} list="return-hus" name="handlingUnitBarcode" value={hu} onChange={e=>setHu(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();productRef.current?.focus()}}} className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-bold uppercase" required/></label>
   <label className="block"><b>5. Ürün Barkodu</b><input ref={productRef} list="return-products" name="productBarcode" value={product} onChange={e=>setProduct(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"&&selected&&hu&&product){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} className="mt-2 w-full rounded-xl border-2 border-blue-700 p-4 font-mono text-2xl font-black uppercase" placeholder="Her adet için 1 kez okut" required/></label>
  </div>
  <button disabled={pending||!selected||!hu||!product} className="mt-5 w-full rounded-xl bg-blue-950 p-4 text-lg font-black text-white disabled:opacity-40">{pending?"İşleniyor...":"1 Adet İade Stoğa Al"}</button>
 </form>
}
