import Link from "next/link";

import HandlingUnitBulkCreateForm from "@/components/admin/HandlingUnitBulkCreateForm";

export default function BulkHandlingUnitPage() {
  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Toplu Koli / Palet Barkodu
          </h1>

          <p className="mt-2 text-gray-500">
            Fiziksel koli ve paletler için
            seri barkod üretin ve etiketleri
            yazdırın.
          </p>
        </div>

        <Link
          href="/admin/handling-units"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Koli / Palet Listesine Dön
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-800">
        Etiketler yazdırıldıktan sonra
        fiziksel koli veya palet üzerine
        yapıştırılmalıdır. El terminalinde
        barkod okutulduğunda ilgili taşıma
        biriminin içerik ekranı açılacaktır.
      </div>

      <div className="mx-auto mt-8 max-w-5xl">
        <HandlingUnitBulkCreateForm />
      </div>
    </section>
  );
}