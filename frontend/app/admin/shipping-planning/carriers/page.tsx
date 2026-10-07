import ShippingAdminForm from "@/components/admin/shipping/ShippingAdminForm";
import { createCarrierAction, setCarrierActiveAction, updateCarrierIntegrationAction } from "../actions";
import { ShipmentPlanningService } from "@/modules/fulfillment/services/shipment-planning.service";

export default async function Page({searchParams}:{searchParams:Promise<{integrationUpdated?:string;integrationError?:string}>}){
 const [rows,q]=await Promise.all([ShipmentPlanningService.listCarriers(),searchParams]);
 return <main>
  <h1 className="text-2xl font-black">Taşıyıcı ve Kargo Entegrasyonları</h1>
  <p className="mb-5 text-slate-600">Kargo/lojistik firmalarının ana verilerini, takip bağlantılarını ve canlı API hazırlığını yönetin.</p>
  {q.integrationUpdated==="1"?<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">Kargo entegrasyon ayarları güncellendi.</div>:null}
  {q.integrationError?<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">{q.integrationError}</div>:null}
  <ShippingAdminForm action={createCarrierAction} submitLabel="Taşıyıcı Kaydet" fields={[{name:"code",label:"Taşıyıcı Kodu",required:true},{name:"name",label:"Firma Adı",required:true},{name:"taxNumber",label:"Vergi No"},{name:"contactName",label:"Yetkili"},{name:"phone",label:"Telefon"},{name:"email",label:"E-posta"},{name:"address",label:"Adres"},{name:"notes",label:"Not"}]}/>
  <div className="mt-6 space-y-4">{rows.map(x=><article key={x.id} className="rounded-2xl border bg-white p-5 shadow-sm">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-black">{x.code} · {x.name}</p><p className="mt-1 text-sm text-slate-500">{x.contactName??"-"} · {x.phone??"-"}</p></div><form action={setCarrierActiveAction}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="active" value={String(!x.isActive)}/><button className="rounded-lg border px-3 py-2 font-bold">{x.isActive?"AKTİF · PASİFE AL":"PASİF · AKTİF ET"}</button></form></div>
   <form action={updateCarrierIntegrationAction} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2">
    <input type="hidden" name="carrierId" value={x.id}/>
    <label className="text-sm font-bold md:col-span-2">Takip URL Şablonu
     <input name="trackingUrlTemplate" defaultValue={x.trackingUrlTemplate??""} placeholder="https://kargo.example/takip?no={trackingNumber}" className="mt-1 w-full rounded-xl border p-3 font-mono text-xs"/>
     <span className="mt-1 block text-xs font-normal text-slate-500">Takip numarasının geleceği yere {'{trackingNumber}'} yazın. Siparişe yalnız takip no girildiğinde URL otomatik üretilir.</span>
    </label>
    <label className="text-sm font-bold">API / Entegrasyon Sağlayıcı<input name="integrationProvider" defaultValue={x.integrationProvider??""} placeholder="Canlı sözleşmede doldurulur" className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-bold">Entegrasyon Durumu<select name="integrationEnabled" defaultValue={String(x.integrationEnabled)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="false">Pasif / Manuel</option><option value="true">API Entegrasyonu Aktif</option></select></label>
    <button className="rounded-xl bg-blue-950 px-5 py-3 font-black text-white md:col-span-2">Kargo Entegrasyon Ayarlarını Kaydet</button>
   </form>
  </article>)}</div>
 </main>;
}