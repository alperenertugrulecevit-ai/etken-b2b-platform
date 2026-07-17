import Link from "next/link";

import HandlingUnitBulkCreateForm from "@/components/admin/HandlingUnitBulkCreateForm";

export default function BulkHandlingUnitPage() {
  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Toplu Taşıma Birimi Barkodu
          </h1>

          <p className="mt-2 text-gray-500">
            Koli, palet, toplama kolisi ve
            toplama paleti için seri barkod
            oluşturabilir ve etiketlerini
            yazdırabilirsiniz.
          </p>
        </div>

        <Link
          href="/admin/handling-units"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold transition hover:bg-slate-50"
        >
          ← Taşıma Birimleri Listesine Dön
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-lg font-bold text-blue-900">
          Toplu Barkod Üretimi
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-6 text-blue-800">
          <p>
            Bu ekrandan tek seferde toplu
            olarak taşıma birimi barkodu
            oluşturabilirsiniz.
          </p>

          <ul className="list-disc space-y-2 pl-6">
            <li>
              📦 Stok Kolisi →
              <strong> KOL00000001</strong>
            </li>

            <li>
              🟦 Stok Paleti →
              <strong> PLT00000001</strong>
            </li>

            <li>
              🟨 Toplama Kolisi →
              <strong> PKOL00000001</strong>
            </li>

            <li>
              🟧 Toplama Paleti →
              <strong> PPAL00000001</strong>
            </li>
          </ul>

          <p>
            Oluşturulan barkodlar
            yazdırıldıktan sonra fiziksel
            taşıma birimlerine
            yapıştırılmalıdır.
          </p>

          <p>
            RF Terminal okutulduğunda ilgili
            THM açılır ve tüm hareketleri
            takip edilir.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <HandlingUnitBulkCreateForm />
      </div>
    </section>
  );
}