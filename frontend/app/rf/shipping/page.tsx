import Link from "next/link";

import RFShippingForm from "@/components/rf/RFShippingForm";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import { ShippingService } from "@/modules/fulfillment/services/shipping.service";

export default async function RFShippingPage() {
  await AuthorizationService.requireRfAccess(
    "SHIPPING_EXECUTE"
  );

  const readyUnits =
    await ShippingService.listReadyUnits();

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
            RF Sevkiyat
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Sevk THM Çıkışı
          </h1>

          <p className="mt-2 max-w-2xl leading-6 text-slate-600">
            Sevkiyata hazır koli veya
            paleti okutun. Her Sevk THM
            için tek sevk belgesi
            oluşturulur ve yalnızca o
            THM içeriği stoktan düşülür.
          </p>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700"
        >
          RF Merkeze Dön
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-blue-950 p-5 text-white shadow">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
            Hazır Sevk THM
          </p>

          <p className="mt-2 text-3xl font-black">
            {readyUnits.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Bekleyen Ürün
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {readyUnits.reduce(
              (total, unit) =>
                total +
                unit.totalQuantity,
              0
            )}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <RFShippingForm
          initialUnits={readyUnits}
        />
      </div>
    </section>
  );
}
