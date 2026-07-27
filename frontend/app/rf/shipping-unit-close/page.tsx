import Link from "next/link";

import RFShippingUnitCloseForm from "@/components/rf/RFShippingUnitCloseForm";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFShippingUnitClosePage() {
  await AuthorizationService.requireRfAccess(
    "PICKING_EXECUTE"
  );

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Sevk THM Kapatma
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Aktif Wave veya paketleme
            işlemi bulunmasa bile açık
            Sevk THM barkodunu okutarak
            koliyi kapatın ve sevke hazır
            hâle getirin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/rf/packing"
            className="rounded-xl bg-blue-900 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-800"
          >
            Paketleme
          </Link>

          <Link
            href="/rf"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 shadow-sm hover:bg-slate-50"
          >
            ← RF Menüsü
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <RFShippingUnitCloseForm />
      </div>

      <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950">
        <h2 className="font-black">
          Ne Zaman Kullanılır?
        </h2>

        <ul className="mt-3 space-y-2 text-sm leading-6">
          <li>
            • Koli dolduğu için sipariş
            veya Wave tamamlanmadan sevk
            edilecekse
          </li>

          <li>
            • Paketleme tamamlanmış fakat
            Sevk THM açık kalmışsa
          </li>

          <li>
            • Aktif Wave kalmadığı için
            Paketleme ekranında kapatma
            düğmesine erişilemiyorsa
          </li>

          <li>
            • Çeki listesi ve sevkiyat
            işlemlerine geçilecekse
          </li>
        </ul>
      </div>
    </section>
  );
}