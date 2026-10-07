import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { createBankAccount, setBankAccountActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function BankingPage() {
  await AuthorizationService.requireAnyPermission(["ORDER_VIEW", "ORDER_MANAGE"]);
  const accounts = await prisma.b2BBankAccount.findMany({
    where: { tenantId:B2B_CONSTANTS.TENANT_ID, companyId:B2B_CONSTANTS.COMPANY_ID },
    orderBy:[{sortOrder:"asc"},{id:"asc"}],
  });
  const waiting = await prisma.order.count({ where:{source:"ECOMMERCE",paymentMethod:"BANK_TRANSFER",paymentStatus:"PENDING",status:{not:"CANCELLED"}} });
  return <main className="p-4 sm:p-6 lg:p-10">
    <p className="text-xs font-black uppercase tracking-wider text-[#EF4B23]">E-Ticaret Yönetimi</p>
    <h1 className="mt-2 text-3xl font-black">Banka / Havale Yönetimi</h1>
    <p className="mt-2 text-sm text-slate-500">Havale hesaplarını ve gelecekteki banka entegrasyon hazırlığını yönetin.</p>
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><strong>Ödeme bekleyen havale siparişi: {waiting}</strong><p className="mt-1 text-sm text-amber-900">Banka API bağlantısı açılana kadar dekont/banka referansı E-Ticaret Siparişleri ekranından manuel doğrulanır.</p></div>
    <form action={createBankAccount} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow sm:grid-cols-2 lg:grid-cols-4">
      <input name="bankName" required placeholder="Banka adı" className="rounded-xl border p-3"/>
      <input name="branchName" placeholder="Şube" className="rounded-xl border p-3"/>
      <input name="accountHolder" required placeholder="Hesap sahibi" className="rounded-xl border p-3"/>
      <input name="iban" required placeholder="TR IBAN" className="rounded-xl border p-3"/>
      <input name="accountNumber" placeholder="Hesap no (opsiyonel)" className="rounded-xl border p-3"/>
      <input name="swiftCode" placeholder="SWIFT/BIC (opsiyonel)" className="rounded-xl border p-3"/>
      <input name="currency" defaultValue="TRY" placeholder="Para birimi" className="rounded-xl border p-3"/>
      <input name="sortOrder" type="number" defaultValue="0" placeholder="Sıra" className="rounded-xl border p-3"/>
      <input name="integrationProvider" placeholder="Banka/API sağlayıcısı (hazırlık)" className="rounded-xl border p-3 lg:col-span-2"/>
      <input name="paymentNoteTemplate" defaultValue="Ödeme açıklamasına sipariş numaranızı yazınız: {ORDER_NUMBER}" placeholder="Ödeme açıklama şablonu" className="rounded-xl border p-3 lg:col-span-2"/>
      <button className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white sm:col-span-2 lg:col-span-4">Banka Hesabı Ekle</button>
    </form>
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow"><table className="w-full min-w-[900px] text-sm">
      <thead className="bg-slate-900 text-white"><tr><th className="p-3 text-left">Banka</th><th className="p-3 text-left">Hesap Sahibi</th><th className="p-3 text-left">IBAN</th><th className="p-3">Para Birimi</th><th className="p-3">Entegrasyon</th><th className="p-3">Durum</th><th className="p-3">İşlem</th></tr></thead>
      <tbody>{accounts.map(a=><tr key={a.id} className="border-b"><td className="p-3 font-bold">{a.bankName}{a.branchName?<div className="text-xs font-normal text-slate-500">{a.branchName}</div>:null}</td><td className="p-3">{a.accountHolder}</td><td className="p-3 font-mono">{a.iban}</td><td className="p-3 text-center">{a.currency}</td><td className="p-3 text-center">{a.integrationProvider??"Manuel"} · {a.integrationEnabled?"Aktif":"Hazır/Bağlı Değil"}</td><td className="p-3 text-center">{a.isActive?"Aktif":"Pasif"}</td><td className="p-3 text-center"><form action={setBankAccountActive}><input type="hidden" name="id" value={a.id}/><input type="hidden" name="active" value={String(!a.isActive)}/><button className="rounded-lg border px-3 py-2 font-bold">{a.isActive?"Pasife Al":"Aktif Et"}</button></form></td></tr>)}</tbody>
    </table></div>
  </main>;
}
