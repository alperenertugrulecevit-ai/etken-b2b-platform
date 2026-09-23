"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rfPackWaveItemAction, type RFPackingState } from "@/app/rf/packing/actions";

type DistributionProduct = { productId:number; productCode:string; productBarcode:string; productName:string; plannedQuantity:number; pickedQuantity:number; packedQuantity:number; availableQuantity:number };
type DistributionOption = { id:string; waveId:string; waveNo:string; sequenceNumber:number; distributionCode:string; customerCode:string; customerName:string; addressTitle:string; city:string; district:string; plannedOrderCount:number; plannedLineCount:number; plannedQuantity:number; packedQuantity:number; remainingQuantity:number; products:DistributionProduct[] };
type SourceUnitOption = { id:number; barcode:string; unitType:string; waveId:string; totalQuantity:number; products:{ productId:number; productCode:string; productBarcode:string; productName:string; quantity:number }[] };
type TargetUnitOption = { id:number; barcode:string; unitType:string; waveId:string|null; distributionId:string|null; packageSequence:number|null; totalQuantity:number; isOpen:boolean };
type Props = { distributions:DistributionOption[]; sourceUnits:SourceUnitOption[]; targetUnits:TargetUnitOption[] };

const initialState:RFPackingState={success:false,message:"",distributionCode:"",waveNo:"",customerName:"",sourceBarcode:"",sourceQuantityAfter:0,targetBarcode:"",targetQuantityAfter:0,packageSequence:0,productCode:"",productName:"",packedQuantity:0,distributionPackedQuantity:0,distributionPlannedQuantity:0,distributionCompleted:false};
const norm=(v:string)=>v.trim().toUpperCase();

function speak(text:string){ if(!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang="tr-TR"; window.speechSynthesis.speak(u); }
function beep(){ try{ const C=window.AudioContext; const c=new C(); const o=c.createOscillator(); const g=c.createGain(); o.frequency.value=220; g.gain.value=.08; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+.18); }catch{} }

export default function RFProductDrivenPackingForm({distributions,sourceUnits,targetUnits}:Props){
  const router=useRouter();
  const formRef=useRef<HTMLFormElement>(null);
  const sourceRef=useRef<HTMLInputElement>(null);
  const productRef=useRef<HTMLInputElement>(null);
  const targetRef=useRef<HTMLInputElement>(null);
  const [sourceBarcode,setSourceBarcode]=useState("");
  const [sourceOpened,setSourceOpened]=useState(false);
  const [productBarcode,setProductBarcode]=useState("");
  const [targetBarcode,setTargetBarcode]=useState("");
  const [terminalCode,setTerminalCode]=useState("");
  const [state,formAction,isPending]=useActionState(rfPackWaveItemAction,initialState);

  const selectedSource=useMemo(()=>sourceUnits.find(u=>norm(u.barcode)===norm(sourceBarcode))??null,[sourceBarcode,sourceUnits]);
  const selectedProduct=useMemo(()=>selectedSource?.products.find(p=>norm(p.productBarcode)===norm(productBarcode)||norm(p.productCode)===norm(productBarcode))??null,[selectedSource,productBarcode]);
  const matches=useMemo(()=>!selectedSource||!selectedProduct?[]:distributions.filter(d=>d.waveId===selectedSource.waveId&&d.products.some(p=>p.productId===selectedProduct.productId&&p.availableQuantity>0)).sort((a,b)=>a.sequenceNumber-b.sequenceNumber),[distributions,selectedSource,selectedProduct]);
  const target=matches[0]??null;
  const targetProduct=target?.products.find(p=>p.productId===selectedProduct?.productId)??null;
  const compatibleTargets=useMemo(()=>!target?[]:targetUnits.filter(u=>(u.distributionId===target.id&&u.isOpen)||(u.distributionId===null&&u.totalQuantity===0&&(u.waveId===null||u.waveId===target.waveId))),[target,targetUnits]);
  const selectedTarget=compatibleTargets.find(u=>norm(u.barcode)===norm(targetBarcode))??null;

  const waveDistributions=selectedSource?distributions.filter(d=>d.waveId===selectedSource.waveId):distributions;
  const waveTotal=waveDistributions.reduce((s,d)=>s+d.plannedQuantity,0);
  const distributed=waveDistributions.reduce((s,d)=>s+d.packedQuantity,0);
  const remaining=Math.max(0,waveTotal-distributed);

  function openSource(){
    if(!selectedSource){ beep(); return; }
    setSourceOpened(true); setProductBarcode(""); setTargetBarcode("");
    window.setTimeout(()=>productRef.current?.focus(),50); speak("Ürün okut");
  }
  function changeSource(){ setSourceOpened(false); setSourceBarcode(""); setProductBarcode(""); setTargetBarcode(""); window.setTimeout(()=>sourceRef.current?.focus(),50); }

  useEffect(()=>{ if(!state.message)return; if(!state.success){beep();return;} setProductBarcode(""); setTargetBarcode(""); router.refresh(); speak("Ürün okut"); window.setTimeout(()=>productRef.current?.focus(),100); },[state,router]);
  useEffect(()=>{ if(target&&selectedProduct){ speak(`${target.sequenceNumber}. mağaza`); window.setTimeout(()=>targetRef.current?.focus(),80); } },[target,selectedProduct]);
  useEffect(()=>{ if(selectedTarget&&targetBarcode){ window.setTimeout(()=>formRef.current?.requestSubmit(),30); } },[selectedTarget,targetBarcode]);

  const waveNo=selectedSource?distributions.find(d=>d.waveId===selectedSource.waveId)?.waveNo:"";

  return <div className="min-h-[70vh] bg-slate-100">
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 text-xs font-medium text-slate-800">
        <Link href="/rf">Operasyon Paneli</Link>
        <span>SAP Dosya Yükleme</span><span>Wave Detayı</span>
        <span className="rounded-md bg-slate-950 px-4 py-2 font-bold text-white">Dağılım</span>
        <Link href="/admin/manual-wave/product-query?mode=thm">THM Sorgu</Link>
        <Link href="/rf/packing/wave-summary">Wave Dağılım Özeti</Link>\n        <Link href="/admin/manual-wave/distribution-summary">Dağılım Performansı</Link>
      </div>
    </div>

    <main className="mx-auto max-w-7xl space-y-4 px-4 py-5">
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Wave Toplam" value={waveTotal} />
        <Metric label="Dağıtılan" value={distributed} tone="green" />
        <Metric label="Kalan" value={remaining} tone="orange" />
      </div>

      {!sourceOpened ? <section className="rounded-xl bg-white px-6 py-8 shadow-sm">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-4xl">📦</div>
          <h2 className="mt-3 text-xl font-black text-slate-950">Toplama Barkodu Okut</h2>
          <p className="mt-2 text-sm text-slate-500">SAP toplama barkodunu okutun.</p>
          <input ref={sourceRef} value={sourceBarcode} onChange={e=>setSourceBarcode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();openSource();}}} autoFocus autoComplete="off" placeholder="Toplama barkodu" className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-4 text-center text-lg font-bold uppercase outline-none focus:border-blue-500" />
          {sourceBarcode&&!selectedSource&&<p className="mt-2 text-sm font-bold text-red-600">Paketlemeye açık toplama barkodu bulunamadı.</p>}
          <button type="button" onClick={openSource} className="mt-3 w-full rounded-lg bg-slate-950 py-4 font-black text-white">Toplama Barkodunu Aç</button>
        </div>
      </section> : <>
        <section className="rounded-xl border border-blue-300 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold text-blue-700">Aktif Toplama Barkodu</p><p className="mt-1 text-lg font-black text-slate-950">{selectedSource?.barcode}</p>{waveNo&&<p className="mt-1 text-xs text-slate-500">Wave {waveNo}</p>}</div>
            <button type="button" onClick={changeSource} className="rounded-lg border border-blue-400 bg-white px-4 py-2 text-xs font-bold text-blue-700">Toplama Barkodunu Değiştir</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3"><Mini label="Toplam" value={waveTotal}/><Mini label="Dağıtılan" value={distributed} tone="green"/><Mini label="Kalan" value={remaining} tone="orange"/></div>
        </section>

        {!selectedProduct ? <section className="rounded-xl bg-white px-6 py-8 text-center shadow-sm">
          <div className="text-4xl">📦</div><h2 className="mt-3 text-xl font-black">Ürün Okut</h2><p className="mt-2 text-sm text-slate-500">Dağıtılacak ürün barkodunu okutun.</p>
          <input ref={productRef} value={productBarcode} onChange={e=>setProductBarcode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"&&!selectedProduct)beep();}} autoFocus autoComplete="off" placeholder="Ürün barkodu" className="mx-auto mt-6 block w-full max-w-2xl rounded-lg border border-slate-300 px-4 py-4 text-center text-lg font-bold uppercase focus:border-blue-500" />
          {productBarcode&&!selectedProduct&&<p className="mt-2 text-sm font-bold text-red-600">Ürün toplama barkodu içinde bulunamadı.</p>}
        </section> : target && targetProduct ? <>
          <section className="overflow-hidden rounded-xl border-2 border-amber-400 bg-white shadow-sm">
            <div className="bg-amber-400 px-4 py-3 text-center text-sm font-black text-slate-950">HEDEF MAĞAZA</div>
            <div className="px-6 py-7 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-3xl font-black text-white">{target.sequenceNumber}</div>
              <p className="mt-4 text-3xl font-black text-slate-950">{target.customerCode}</p>
              <p className="mt-1 text-2xl font-black text-slate-800">{target.customerName}</p>
              <div className="mx-auto mt-5 max-w-xl rounded-xl bg-slate-100 px-5 py-4 text-sm">
                <p className="font-bold">{selectedProduct.productName}</p>
                <p className="mt-1 text-slate-600">Ürün Kodu: {selectedProduct.productCode}</p>
                <p className="text-slate-600">Barkod: {selectedProduct.productBarcode}</p>
              </div>
            </div>
          </section>

          <form ref={formRef} action={formAction} className="rounded-xl bg-white px-6 py-7 text-center shadow-sm">
            <input type="hidden" name="sourceBarcode" value={sourceBarcode}/><input type="hidden" name="productBarcode" value={productBarcode}/><input type="hidden" name="distributionCode" value={target.distributionCode}/><input type="hidden" name="quantity" value="1"/><input type="hidden" name="terminalCode" value={terminalCode}/>
            <div className="text-4xl">📦</div><h2 className="mt-2 text-xl font-black">Sevk THM Okut</h2><p className="mt-1 text-sm text-slate-500">THM barkodu ST- ile başlamalıdır.</p><p className="text-xs font-bold text-slate-600">Örnek: ST-1000059808</p>
            <input ref={targetRef} name="targetBarcode" value={targetBarcode} onChange={e=>setTargetBarcode(e.target.value.toUpperCase())} autoComplete="off" placeholder="ST-..." className="mx-auto mt-5 block w-full max-w-2xl rounded-lg border border-slate-300 px-4 py-4 text-center text-lg font-bold uppercase focus:border-blue-500"/>
            {targetBarcode&&!selectedTarget&&<p className="mt-2 text-sm font-bold text-red-600">Bu THM hedef mağaza için uygun değil.</p>}
            <button type="submit" disabled={!selectedTarget||isPending} className="mx-auto mt-3 block w-full max-w-2xl rounded-lg bg-slate-950 py-4 font-black text-white disabled:bg-slate-400">{isPending?"Doğrulanıyor...":"Sevk THM Doğrula"}</button>
            <button type="button" onClick={()=>{setProductBarcode("");setTargetBarcode("");window.setTimeout(()=>productRef.current?.focus(),50)}} className="mx-auto mt-3 block w-full max-w-2xl rounded-lg bg-slate-200 py-3 text-sm font-bold text-slate-700">Bekleyen Ürünü İptal Et</button>
            <input value={terminalCode} onChange={e=>setTerminalCode(e.target.value.toUpperCase())} placeholder="Terminal kodu (opsiyonel)" className="mx-auto mt-4 block w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-center text-xs uppercase"/>
          </form>
        </> : <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-center font-bold text-red-700">Bu ürün için bekleyen mağaza dağılımı bulunamadı.</section>}

        {state.message&&<section role="alert" className={`rounded-xl border p-4 text-center font-bold ${state.success?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-red-200 bg-red-50 text-red-800"}`}>{state.message}</section>}
      </>}
    </main>
  </div>;
}

function Metric({label,value,tone}:{label:string;value:number;tone?:"green"|"orange"}){return <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${tone==="green"?"text-emerald-700":tone==="orange"?"text-orange-600":"text-slate-950"}`}>{value}</p></div>}
function Mini({label,value,tone}:{label:string;value:number;tone?:"green"|"orange"}){return <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-lg font-black ${tone==="green"?"text-emerald-700":tone==="orange"?"text-orange-600":"text-slate-950"}`}>{value}</p></div>}
