"use client";
import {useActionState,useState}from"react";
import Link from"next/link";
import{lookupShipmentRemovalAction,removeShipmentAction,restoreRemovedShipmentAction,type RfShipmentState}from"@/app/rf/shipment-workflow-actions";

type Lookup=RfShipmentState&{detail?:{thmBarcode:string;shipmentNumber:string;routeNumber:string;carrier:string;vehicle:string;status:string;loadedAt:string;loadedBy:string}};

export default function RfShipmentRemovalForm(){
 const[lookup,lookupAction,looking]=useActionState(lookupShipmentRemovalAction,{ok:false,message:""} as Lookup);
 const[removed,removeAction,removing]=useActionState(removeShipmentAction,{ok:false,message:""});
 const[restored,restoreAction,restoring]=useActionState(restoreRemovedShipmentAction,{ok:false,message:""});
 const[code,setCode]=useState("");
 const[restoreCode,setRestoreCode]=useState("");

 return <section>
  <div className="mb-4 flex items-center justify-between">
   <div>
    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">RF · Sevkiyat</p>
    <h1 className="text-2xl font-black">Sevkiyat Bozma</h1>
    <p className="text-sm text-slate-600">THM'yi sevkiyattan çıkartabilir veya daha önce yapılan çıkartma işlemini güvenli şekilde geri alabilirsiniz.</p>
   </div>
   <Link href="/rf/operations/shipping" className="rounded-xl border bg-white px-4 py-3 font-bold">← Geri</Link>
  </div>

  <form action={lookupAction} className="rounded-2xl border bg-white p-4 shadow-sm">
   <label className="block">
    <span className="mb-1 block text-sm font-bold">THM Barkodu</span>
    <input name="thmBarcode" value={code} onChange={e=>setCode(e.target.value)} autoFocus required autoComplete="off" placeholder="THM okutun" className="w-full rounded-xl border-2 p-4 text-lg font-bold uppercase"/>
   </label>
   <button disabled={looking} className="mt-3 w-full rounded-xl bg-blue-950 p-4 font-black text-white">{looking?"Sorgulanıyor...":"THM SORGULA"}</button>
   {lookup.message&&<p className={`mt-3 rounded-xl p-3 font-bold ${lookup.ok?"bg-green-50 text-green-800":"bg-red-50 text-red-800"}`}>{lookup.message}</p>}
  </form>

  {lookup.detail&&<div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
   <h2 className="mb-3 text-lg font-black">Mevcut Sevkiyat Bilgileri</h2>
   <dl className="grid grid-cols-2 gap-3 text-sm">
    {Object.entries({"THM":lookup.detail.thmBarcode,"Sevkiyat No":lookup.detail.shipmentNumber,"Rota":lookup.detail.routeNumber,"Taşıyıcı":lookup.detail.carrier,"Araç / Plaka":lookup.detail.vehicle,"Durum":lookup.detail.status,"Yükleme Zamanı":lookup.detail.loadedAt,"Yükleyen":lookup.detail.loadedBy}).map(([k,v])=><div key={k} className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">{k}</dt><dd className="mt-1 font-black">{v}</dd></div>)}
   </dl>
   <form action={removeAction} className="mt-4">
    <input type="hidden" name="thmBarcode" value={lookup.detail.thmBarcode}/>
    <button disabled={removing} className="w-full rounded-xl bg-red-700 p-4 text-lg font-black text-white">{removing?"İşleniyor...":"SEVKİYATTAN ÇIKART"}</button>
    {removed.message&&<p className={`mt-3 rounded-xl p-3 font-bold ${removed.ok?"bg-green-50 text-green-800":"bg-red-50 text-red-800"}`}>{removed.message}</p>}
   </form>
  </div>}

  <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
   <h2 className="text-lg font-black text-amber-950">Sevkiyattan Çıkartmayı Geri Al</h2>
   <p className="mt-1 text-sm text-amber-900">Koli/THM fiziksel olarak sevk edilmediyse ve başka bir sevkiyat işlemine alınmadıysa son sevkiyat ve rota bilgisine geri bağlanır. Daha önce YÜKLENDİ durumundaysa araç yüklemesi de geri kurulur.</p>
   <form action={restoreAction} className="mt-3">
    <label className="block">
     <span className="mb-1 block text-sm font-bold text-amber-950">THM Barkodu</span>
     <input name="thmBarcode" value={restoreCode} onChange={e=>setRestoreCode(e.target.value)} required autoComplete="off" placeholder="Geri alınacak THM'yi okutun" className="w-full rounded-xl border-2 border-amber-400 bg-white p-4 text-lg font-bold uppercase"/>
    </label>
    <button disabled={restoring} className="mt-3 w-full rounded-xl bg-amber-700 p-4 text-lg font-black text-white">{restoring?"Kontrol ediliyor...":"SEVKİYATA GERİ AL"}</button>
    {restored.message&&<p className={`mt-3 rounded-xl p-3 font-bold ${restored.ok?"bg-green-100 text-green-900":"bg-red-100 text-red-900"}`}>{restored.message}</p>}
   </form>
  </div>
 </section>;
}
