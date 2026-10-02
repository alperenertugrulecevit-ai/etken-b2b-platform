import { EcommerceReturnPreReceiptMatchStatus, EcommerceReturnPreReceiptMode, EcommerceReturnPreReceiptOutcome, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import ExcelTableExportButton from "@/components/admin/ExcelTableExportButton";
import { flagReturnToCarrier, markReturnToCarrier } from "./actions";
export const dynamic="force-dynamic";
const label=(v:string)=>({MATCHED:"Eşleşti",UNMATCHED:"Eşleşmedi",CONFLICT:"Çakışma",RETURN_ENTRY_PENDING:"İade Giriş Bekliyor",UNDELIVERED_RETURN:"Teslim Edilemeyen",RETURN_TO_CARRIER:"Kargoya Geri Verilecek",RETURNED_TO_CARRIER:"Kargoya Geri Verildi",CARRIER_STATUS_UNVERIFIED:"Kargo Durumu Doğrulanamadı",PRE_RECEIVED:"Ön Kabul",RECEIVING:"İade Giriş Devam Ediyor",WAREHOUSE_COMPLETED:"Depo Tamamlandı",FINANCE_PENDING:"Finans Bekliyor",COMPLETED:"Tamamlandı"}[v]??v);
const start=(v:string)=>v?new Date(`${v}T00:00:00+03:00`):undefined;
const end=(v:string)=>v?new Date(`${v}T23:59:59.999+03:00`):undefined;
export default async function Page({searchParams}:{searchParams:Promise<{startDate?:string;endDate?:string;carrierId?:string;mode?:string;matchStatus?:string;outcome?:string;late?:string;code?:string}>}){
 await AuthorizationService.requireAdminPortalAccess();
 const q=await searchParams;
 const startDate=q.startDate??"",endDate=q.endDate??"",carrierId=q.carrierId??"",mode=q.mode??"",matchStatus=q.matchStatus??"",outcome=q.outcome??"",late=q.late??"",code=q.code?.trim()??"";
 const where:Prisma.EcommerceReturnPreReceiptWhereInput={};
 if(startDate||endDate)where.receivedAt={...(startDate?{gte:start(startDate)}:{}),...(endDate?{lte:end(endDate)}:{})};
 if(carrierId)where.carrierId=carrierId;
 if(mode)where.mode=mode as EcommerceReturnPreReceiptMode;
 if(matchStatus)where.matchStatus=matchStatus as EcommerceReturnPreReceiptMatchStatus;
 if(outcome)where.outcome=outcome as EcommerceReturnPreReceiptOutcome;
 if(late==="1")where.lateDetected=true; else if(late==="0")where.lateDetected=false;
 if(code)where.OR=[{scannedCode:{contains:code,mode:"insensitive"}},{preReceiptNumber:{contains:code,mode:"insensitive"}},{originalOrder:{orderNumber:{contains:code,mode:"insensitive"}}}];
 const [rows,carriers]=await Promise.all([
  prisma.ecommerceReturnPreReceipt.findMany({where,take:1000,orderBy:{receivedAt:"desc"},include:{warehouse:{select:{code:true}},carrier:{select:{name:true}},originalOrder:{select:{orderNumber:true}},ecommerceReturn:{select:{returnNumber:true,status:true}}}}),
  prisma.shippingCarrier.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{id:true,name:true,code:true}}),
 ]);
 const lateCount=rows.filter(x=>x.lateDetected).length,unmatched=rows.filter(x=>x.matchStatus==="UNMATCHED").length,waiting=rows.filter(x=>!x.ecommerceReturn&&x.outcome!=="RETURNED_TO_CARRIER").length;
 return <div className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-slate-500">E-Ticaret Yönetimi / İade</p><h1 className="text-3xl font-black">Kargo İade Mutabakatı</h1><p className="mt-1 text-sm text-slate-500">Kargonun fiziksel teslimi, ön kabul, eşleşme, iade girişi ve kargoya geri teslim sonuçlarını karşılaştırın.</p></div><ExcelTableExportButton tableId="ecommerce-return-reconciliation-table" fileName="kargo-iade-mutabakat-raporu.csv"/></div>
 <form className="mt-5 grid grid-cols-4 gap-3 rounded-2xl border bg-white p-4 xl:grid-cols-8">
  <input type="date" name="startDate" defaultValue={startDate} className="rounded-xl border p-3"/><input type="date" name="endDate" defaultValue={endDate} className="rounded-xl border p-3"/>
  <select name="carrierId" defaultValue={carrierId} className="rounded-xl border p-3"><option value="">Tüm Kargolar</option>{carriers.map(x=><option key={x.id} value={x.id}>{x.code} - {x.name}</option>)}</select>
  <select name="mode" defaultValue={mode} className="rounded-xl border p-3"><option value="">Tüm Okutmalar</option><option value="RETURN_CODE">İade Kodu</option><option value="CARGO_BARCODE">Kargo Barkodu</option></select>
  <select name="matchStatus" defaultValue={matchStatus} className="rounded-xl border p-3"><option value="">Tüm Eşleşmeler</option><option value="MATCHED">Eşleşti</option><option value="UNMATCHED">Eşleşmedi</option><option value="CONFLICT">Çakışma</option></select>
  <select name="outcome" defaultValue={outcome} className="rounded-xl border p-3"><option value="">Tüm Sonuçlar</option><option value="RETURN_ENTRY_PENDING">İade Giriş Bekliyor</option><option value="UNDELIVERED_RETURN">Teslim Edilemeyen</option><option value="RETURN_TO_CARRIER">Kargoya Geri Verilecek</option><option value="RETURNED_TO_CARRIER">Kargoya Geri Verildi</option><option value="CARRIER_STATUS_UNVERIFIED">Kargo Durumu Doğrulanamadı</option></select>
  <select name="late" defaultValue={late} className="rounded-xl border p-3"><option value="">Tüm Ön Kabuller</option><option value="0">Normal Ön Kabul</option><option value="1">Geç Ön Kabul</option></select>
  <input name="code" defaultValue={code} className="rounded-xl border p-3" placeholder="Barkod / sipariş / ön kabul"/>
  <div className="col-span-full flex gap-2"><button className="rounded-xl bg-blue-800 px-5 py-3 font-black text-white">Raporu Getir</button><a href="?" className="rounded-xl border px-5 py-3 font-bold">Temizle</a></div>
 </form>
 <div className="my-5 grid grid-cols-4 gap-3">{[["Ön Kabul",rows.length],["Geç Ön Kabul",lateCount],["Eşleşmeyen",unmatched],["İşlem Bekleyen",waiting]].map(([a,b])=><div key={String(a)} className="rounded-2xl border bg-white p-4"><p className="text-sm font-bold text-slate-500">{a}</p><p className="text-3xl font-black">{b}</p></div>)}</div>
 <div className="overflow-x-auto rounded-2xl border bg-white"><table id="ecommerce-return-reconciliation-table" className="w-full text-sm"><thead className="bg-slate-100"><tr>{["Tarih","Depo","Kargo","Okutma Tipi","Barkod","Sipariş","Ön Kabul No","Geç Ön Kabul","Eşleşme","Sonuç","İade Giriş","İşlem"].map(x=><th key={x} className="border-b p-3 text-left">{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="border-b p-3">{r.receivedAt.toLocaleString("tr-TR")}</td><td className="border-b p-3">{r.warehouse.code}</td><td className="border-b p-3">{r.carrier.name}</td><td className="border-b p-3">{r.mode==="RETURN_CODE"?"İade Kodu":"Kargo Barkodu"}</td><td className="border-b p-3 font-mono font-bold">{r.scannedCode}</td><td className="border-b p-3">{r.originalOrder?.orderNumber??"-"}</td><td className="border-b p-3">{r.preReceiptNumber}</td><td className="border-b p-3">{r.lateDetected?"Evet":"Hayır"}</td><td className="border-b p-3">{label(r.matchStatus)}</td><td className="border-b p-3">{label(r.outcome)}</td><td className="border-b p-3">{r.ecommerceReturn?label(r.ecommerceReturn.status):"-"}</td><td className="border-b p-3">{r.outcome==="RETURN_TO_CARRIER"?<form action={markReturnToCarrier}><input type="hidden" name="id" value={r.id}/><button className="rounded-lg bg-amber-600 px-3 py-2 font-black text-white">Kargoya Teslim Et</button></form>:r.outcome==="RETURNED_TO_CARRIER"?"Tamamlandı":(["CARRIER_STATUS_UNVERIFIED","RETURN_ENTRY_PENDING","UNDELIVERED_RETURN"].includes(r.outcome)&&(!r.ecommerceReturn||r.ecommerceReturn.status==="PRE_RECEIVED"))?<form action={flagReturnToCarrier}><input type="hidden" name="id" value={r.id}/><button className="rounded-lg border border-amber-500 px-3 py-2 font-black text-amber-800">Kargoya Geri Ver</button></form>:"-"}</td></tr>)}</tbody></table></div>
 </div>;
}
