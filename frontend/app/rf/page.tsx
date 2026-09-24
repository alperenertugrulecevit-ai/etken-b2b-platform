import Link from "next/link";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Group = {
  title: string; subtitle: string; icon: string; href: string; permissionCodes: string[];
};

const groups: Group[] = [
  { title: "Mal Kabul", subtitle: "Mal Kabul İşlemleri", icon: "📥", href: "/rf/receiving", permissionCodes: ["RECEIVING_EXECUTE"] },
  { title: "Çıkış", subtitle: "Toplama ve Dağılım", icon: "📤", href: "/rf/operations/outbound", permissionCodes: ["PICKING_EXECUTE"] },
  { title: "Transfer", subtitle: "Adresleme ve Transfer", icon: "🔄", href: "/rf/operations/transfer", permissionCodes: ["PUTAWAY_EXECUTE","TRANSFER_EXECUTE","HANDLING_UNIT_MANAGE"] },
  { title: "Sevkiyat", subtitle: "Sevk ve Çeki Listesi", icon: "🚚", href: "/rf/operations/shipping", permissionCodes: ["PICKING_EXECUTE","SHIPPING_EXECUTE"] },
  { title: "Sayım", subtitle: "Stok Sayım İşlemleri", icon: "🔢", href: "/rf/operations/counting", permissionCodes: ["COUNT_EXECUTE"] },
  { title: "Sorgulama", subtitle: "THM, Ürün ve Adres", icon: "🔎", href: "/rf/query", permissionCodes: ["INVENTORY_VIEW"] },
];

export default async function RFHomePage() {
  const profile = await AuthorizationService.requireRfAccess();
  const visible = groups.filter(g => AuthorizationService.hasAnyPermission(profile,g.permissionCodes));
  return <section>
    <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 p-5 text-white shadow-xl">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">ETKEN WMS · Mobil Depo Operasyonları</p>
      <h1 className="mt-2 text-3xl font-black">RF Operasyon Merkezi</h1>
      <p className="mt-2 text-sm text-slate-300">İşlem grubunu seçiniz</p>
    </div>
    {visible.length ? <div className="mt-5 grid grid-cols-2 gap-3">
      {visible.map(g => <Link key={g.title} href={g.href} className="group flex min-h-40 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm transition active:scale-[0.98] hover:border-blue-400 hover:shadow-md">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-3xl text-white shadow-sm">{g.icon}</span>
        <h2 className="mt-3 text-xl font-black text-slate-950">{g.title}</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">{g.subtitle}</p>
      </Link>)}
    </div> : <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 font-bold text-amber-900">Hesabınıza atanmış RF operasyonu bulunmuyor.</div>}
    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><b>El Terminali:</b> Barkod okuyucunun Enter gönderecek şekilde ayarlanması önerilir.</div>
  </section>;
}