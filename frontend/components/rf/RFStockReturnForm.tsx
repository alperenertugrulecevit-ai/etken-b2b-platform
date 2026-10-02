"use client";
import {useActionState,useEffect,useRef,useState}from"react";
import Link from"next/link";
import{lookupStockReturnOrder,returnStockOne,type StockReturnLookupState,type StockReturnScanState}from"@/app/rf/stock-return/actions";

type Target={barcode:string;purpose:string;warehouseId:number|null};
type Location={code:string;scanCode:string;warehouseId:number;locationType:string};
const lookupInitial:StockReturnLookupState={ok:false,message:""};
const scanInitial:StockReturnScanState={ok:false,message:""};

export default function RFStockReturnForm({targets,locations}:{targets:Target[];locations:Location[]}){
 const[lookup,lookupAction,looking]=useActionState(lookupStockReturnOrder,lookupInitial);
 const[scan,scanAction,scanning]=useActionState(returnStockOne,scanInitial);
 const[orderNo,setOrderNo]=useState(""),[source,setSource]=useState(""),[product,setProduct]=useState(""),[target,setTarget]=useState(""),[location,setLocation]=useState(""),[reason,setReason]=useState("CUSTOMER_PARTIAL_CANCEL");
 const sourceRef=useRef<HTMLInputElement>(null),productRef=useRef<HTMLInputElement>(null),targetRef=useRef<HTMLInputElement>(null),locationRef=useRef<HTMLInputElement>(null);
 const targetInfo=targets.find(x=>x.barcode===target.trim().toUpperCase());
 const validLocations=targetInfo?locations.filter(x=>x.warehouseId===targetInfo.warehouseId):locations;
 useEffect(()=>{if(lookup.ok&&lookup.order){setOrderNo(lookup.order.orderNumber);setSource("");setProduct("");setTimeout(()=>sourceRef.current?.focus(),80)}},[lookup.ok,lookup.order?.orderNumber]);
 useEffect(()=>{if(scan.ok){setProduct("");setTimeout(()=>productRef.current?.focus(),80)}},[scan.ok,scan.message]);
 return <section>
  <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF · Ters Operasyon</p><h1 className="text-2xl font-black">Stok Geri Alma</h1><p className="text-sm text-slate-600">Sevk öncesi toplama / paket / rota / araç yükleme geri alma.</p></div><Link href="/rf" className="rounded-xl border bg-white px-4 py-3 font-bold">← Geri</Link></div>
  <form action={lookupAction} className="rounded-2xl border bg-white p-4 shadow-sm">
   <label className="block"><b>1. Çıkış Sipariş No</b><input name="orderNumber" value={orderNo} onChange={e=>setOrderNo(e.target.value.toUpperCase())} autoFocus autoComplete="off" required className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-black uppercase" placeholder="SIP... okut"/></label>
   <button disabled={looking} className="mt-3 w-full rounded-xl bg-blue-950 p-4 font-black text-white">{looking?"Sorgulanıyor...":"SİPARİŞİ GETİR"}</button>
   {lookup.message&&<div className={`mt-3 rounded-xl p-3 font-bold ${lookup.ok?"bg-green-50 text-green-800":"bg-red-50 text-red-800"}`}>{lookup.message}</div>}
  </form>
  {lookup.order&&<>
   <div className="mt-4 rounded-2xl bg-blue-50 p-4"><b>{lookup.order.orderNumber} · {lookup.order.customerName}</b><div className="mt-1 text-sm">Durum: {lookup.order.status} · Kaynak THM/SVK: {lookup.order.sources.length}</div></div>
   <datalist id="stock-return-sources">{lookup.order.sources.map(x=><option key={x.barcode} value={x.barcode}>{x.stage}</option>)}</datalist>
   <datalist id="stock-return-products">{lookup.order.items.filter(x=>x.pickedQuantity>0).flatMap(x=>[<option key={x.id} value={x.productBarcode}>{x.productCode} · Toplanan {x.pickedQuantity}</option>,<option key={"c"+x.id} value={x.productCode}>{x.productName}</option>])}</datalist>
   <datalist id="stock-return-targets">{targets.map(x=><option key={x.barcode} value={x.barcode}>{x.purpose}</option>)}</datalist>
   <datalist id="stock-return-locations">{validLocations.map(x=><option key={x.warehouseId+"-"+x.code} value={x.scanCode}>{x.locationType}</option>)}</datalist>
   <form action={scanAction} className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
    <input type="hidden" name="orderNumber" value={lookup.order.orderNumber}/>
    <label className="block"><b>2. İşlem Nedeni</b><select name="reason" value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 w-full rounded-xl border-2 p-4 text-lg font-bold"><option value="CUSTOMER_PARTIAL_CANCEL">Müşteri Kısmi İptal</option><option value="CUSTOMER_FULL_CANCEL">Müşteri Tam İptal</option><option value="WRONG_PICK">Yanlış Toplama</option><option value="DAMAGED">Hasarlı Ürün</option><option value="OPERATION_CORRECTION">Operasyon Düzeltme</option></select></label>
    <label className="mt-4 block"><b>3. Kaynak THM / SVK</b><input ref={sourceRef} list="stock-return-sources" name="sourceBarcode" value={source} onChange={e=>setSource(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();productRef.current?.focus()}}} required className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-black uppercase" placeholder="Kaynak barkodu okut"/></label>
    <label className="mt-4 block"><b>4. Ürün Barkodu</b><input ref={productRef} list="stock-return-products" name="productBarcode" value={product} onChange={e=>setProduct(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();targetRef.current?.focus()}}} required className="mt-2 w-full rounded-xl border-2 border-blue-700 p-4 font-mono text-2xl font-black uppercase" placeholder="1 adet için 1 kez okut"/></label>
    <label className="mt-4 block"><b>5. Hedef Stok THM</b><input ref={targetRef} list="stock-return-targets" name="targetBarcode" value={target} onChange={e=>{setTarget(e.target.value.toUpperCase());setLocation("")}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();locationRef.current?.focus()}}} required className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-black uppercase" placeholder="Hedef THM okut"/></label>
    <label className="mt-4 block"><b>6. Hedef Adres</b><input ref={locationRef} list="stock-return-locations" name="targetLocationCode" value={location} onChange={e=>setLocation(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"&&source&&product&&target&&location){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} required className="mt-2 w-full rounded-xl border-2 p-4 font-mono text-xl font-black uppercase" placeholder="Adres okut"/></label>
    <button disabled={scanning||!source||!product||!target||!location} className="mt-5 w-full rounded-xl bg-blue-950 p-4 text-lg font-black text-white disabled:opacity-40">{scanning?"İşleniyor...":"1 ADET STOĞA GERİ AL"}</button>
    {scan.message&&<div className={`mt-3 rounded-xl p-4 font-bold ${scan.ok?"bg-green-50 text-green-800":"bg-red-50 text-red-800"}`}>{scan.ok?"✓ ":"✕ "}{scan.message}{scan.ok&&scan.remainingDemand!==undefined?<div className="mt-1 text-sm">Kalan sipariş talebi: {scan.remainingDemand}</div>:null}</div>}
   </form>
  </>}
 </section>;
}
