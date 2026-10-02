"use client";

import { useActionState,useEffect,useMemo,useRef,useState } from "react";
import { processEcommerceReturnItemState,type EcommerceReturnProcessState } from "@/app/admin/e-ticaret/returns/actions";

const initial:EcommerceReturnProcessState={success:false,message:""};

type Item={id:string;productCode:string;productBarcode:string;productName:string;imageUrl:string|null;expectedQuantity:number;receivedQuantity:number;acceptedQuantity:number;rejectedQuantity:number;refundStatus:string;refundAmount:number};

export default function EcommerceReturnReceivingPanel({preReceiptId,returnNumber,orderNumber,customerName,items}:{preReceiptId:string;returnNumber:string;orderNumber:string;customerName:string;items:Item[]}){
 const [state,action,pending]=useActionState(processEcommerceReturnItemState,initial);
 const [quality,setQuality]=useState("SELLABLE"),[product,setProduct]=useState(""),[thm,setThm]=useState(""),[location,setLocation]=useState("");
 const [currentImage,setCurrentImage]=useState<string|null>(items.length===1?items[0].imageUrl:null);
 const thmRef=useRef<HTMLInputElement>(null),locationRef=useRef<HTMLInputElement>(null),productRef=useRef<HTMLInputElement>(null),formRef=useRef<HTMLFormElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const complete=items.reduce((s,i)=>s+i.receivedQuantity,0),total=items.reduce((s,i)=>s+i.expectedQuantity,0);
 const currentItem=useMemo(()=>items.find(i=>i.productBarcode.toUpperCase()===product.trim().toUpperCase()||i.productCode.toUpperCase()===product.trim().toUpperCase()),[items,product]);
 useEffect(()=>{if(currentItem?.imageUrl)setCurrentImage(currentItem.imageUrl)},[currentItem]);
 useEffect(()=>{if(state.success){setProduct("");requestAnimationFrame(()=>{productRef.current?.focus();productRef.current?.scrollIntoView({block:"center",behavior:"smooth"})})}},[state]);
 useEffect(()=>{requestAnimationFrame(()=>{thmRef.current?.focus();thmRef.current?.scrollIntoView({block:"center"})})},[]);

 function nextAfterScan(value:string,next:React.RefObject<HTMLInputElement|null>){if(timer.current)clearTimeout(timer.current);if(value.trim())timer.current=setTimeout(()=>{next.current?.focus();next.current?.scrollIntoView({block:"center",behavior:"smooth"})},180)}

 return <div className="space-y-4">
  <div className="grid grid-cols-3 gap-4">
   <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-bold text-slate-500">İADE DOSYASI</p><h2 className="mt-1 text-xl font-black">{returnNumber}</h2>
    <dl className="mt-3 space-y-1 text-sm"><div><b>Sipariş:</b> {orderNumber}</div><div><b>Müşteri:</b> {customerName}</div><div><b>İlerleme:</b> {complete}/{total}</div></dl>
    <div className="mt-4 flex h-64 items-center justify-center overflow-hidden rounded-2xl border bg-slate-50">{currentImage?<img src={currentImage} alt="İade ürünü" className="h-full w-full object-contain p-3"/>:<div className="px-5 text-center text-sm font-bold text-slate-400">Ürün okutulduğunda ürün görseli burada gösterilir.</div>}</div>
    {currentItem&&<div className="mt-2 text-center text-sm"><b>{currentItem.productCode}</b><br/>{currentItem.productName}</div>}
   </section>
   <section className="col-span-2 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Kalite ve Ürün Kabul</h2><p className="mt-1 text-sm text-slate-500">Fare yalnız seçim alanlarında kullanılır. Okutma sırası: Hedef THM → Hedef Adres → Ürün Barkodu.</p>
    <form ref={formRef} action={action} className="mt-4 grid grid-cols-2 gap-3">
     <input type="hidden" name="preReceiptId" value={preReceiptId}/>
     <label className="text-sm font-bold">Kalite Sonucu<select name="qualityResult" value={quality} onChange={e=>{setQuality(e.target.value);requestAnimationFrame(()=>thmRef.current?.focus())}} className="mt-1 w-full rounded-xl border p-3"><option value="SELLABLE">Satılabilir</option><option value="PACKAGING_DAMAGED">Ambalaj Hasarlı</option><option value="PRODUCT_DAMAGED">Ürün Hasarlı</option><option value="MISSING_PART">Eksik Parça</option><option value="USED">Kullanılmış</option><option value="WRONG_PRODUCT">Yanlış Ürün</option><option value="REVIEW_REQUIRED">İnceleme Bekliyor</option></select></label>
     <label className="text-sm font-bold">Müşteri İade Nedeni<input name="customerReason" className="mt-1 w-full rounded-xl border p-3" placeholder="Opsiyonel"/></label>
     <label className="text-sm font-bold">1. Hedef THM<input ref={thmRef} name="targetHandlingUnitBarcode" value={thm} onChange={e=>{const v=e.target.value.toUpperCase();setThm(v);nextAfterScan(v,locationRef)}} required autoComplete="off" className="mt-1 w-full rounded-xl border-2 border-blue-500 p-3 font-mono font-bold uppercase outline-none" placeholder={quality==="SELLABLE"?"STOCK THM okutun":"RECEIVING THM okutun"}/></label>
     <label className="text-sm font-bold">2. Hedef Adres<input ref={locationRef} name="targetLocationCode" value={location} onChange={e=>{const v=e.target.value.toUpperCase();setLocation(v);nextAfterScan(v,productRef)}} required autoComplete="off" className="mt-1 w-full rounded-xl border-2 border-blue-500 p-3 font-mono font-bold uppercase outline-none" placeholder="Adres barkodunu okutun"/></label>
     <label className="col-span-2 text-sm font-bold">Kalite Notu<input name="qualityNote" className="mt-1 w-full rounded-xl border p-3" placeholder="Opsiyonel açıklama"/></label>
     <label className="col-span-2 text-sm font-black text-blue-800">3. Ürün Barkodu<input ref={productRef} name="productBarcode" value={product} onChange={e=>{const v=e.target.value.toUpperCase();setProduct(v);if(timer.current)clearTimeout(timer.current);if(v.trim()&&thm.trim()&&location.trim())timer.current=setTimeout(()=>formRef.current?.requestSubmit(),220)}} autoComplete="off" required className="mt-1 w-full rounded-xl border-2 border-blue-500 p-4 text-xl font-black uppercase outline-none" placeholder="Ürünü okutun..."/></label>
     <button disabled={pending} tabIndex={-1} className="col-span-2 rounded-xl bg-blue-700 p-4 text-lg font-black text-white disabled:bg-slate-400">{pending?"İşleniyor...":"Ürünü Kabul Et"}</button>
    </form>
    {state.message&&<div className={`mt-3 rounded-xl border p-3 font-bold ${state.success?"border-emerald-300 bg-emerald-50 text-emerald-900":"border-red-300 bg-red-50 text-red-900"}`}>{state.message}</div>}
    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">{quality==="SELLABLE"?"Satılabilir: STOCK THM + normal stok adresi zorunlu. Para iadesine uygun tutar oluşur.":"Kalite/hasar: RECEIVING THM + QUALITY / QUARANTINE / RETURN adresi zorunlu. Finans incelemesi gerekir."}</div>
   </section>
  </div>
  <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="mb-3 text-lg font-black">İade Ürünleri</h2><table className="w-full text-sm"><thead className="bg-slate-100"><tr>{["Ürün","Barkod","Beklenen","Gelen","Satılabilir","Red","Finans","Tutar"].map(x=><th key={x} className="border p-2 text-left">{x}</th>)}</tr></thead><tbody>{items.map(i=><tr key={i.id}><td className="border p-2"><b>{i.productCode}</b><br/>{i.productName}</td><td className="border p-2 font-mono">{i.productBarcode}</td><td className="border p-2">{i.expectedQuantity}</td><td className="border p-2 font-bold">{i.receivedQuantity}</td><td className="border p-2 text-emerald-700">{i.acceptedQuantity}</td><td className="border p-2 text-red-700">{i.rejectedQuantity}</td><td className="border p-2">{i.refundStatus}</td><td className="border p-2">{i.refundAmount.toFixed(2)} TL</td></tr>)}</tbody></table></section>
 </div>;
}
