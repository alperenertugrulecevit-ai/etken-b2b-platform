import Link from "next/link";

import HandlingUnitBulkCreateForm from "@/components/admin/HandlingUnitBulkCreateForm";

export default function BulkHandlingUnitPage() {
  return (
    <section className="p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Toplu Taşıma Birimi Barkodu
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Stok, toplama ve sevkiyat
            operasyonlarında kullanılacak
            koli veya palet barkodlarını
            toplu oluşturup yazdırın.
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
          Barkod Standartları
        </h2>

        <div className="mt-4 grid gap-3 text-sm leading-6 text-blue-800 md:grid-cols-2 lg:grid-cols-3">
          <p>
            📦 Stok Kolisi:
            <strong> KOL00000001</strong>
          </p>

          <p>
            🟦 Stok Paleti:
            <strong> PLT00000001</strong>
          </p>

          <p>
            🛒 Toplama Kolisi:
            <strong> PKOL00000001</strong>
          </p>

          <p>
            🟧 Toplama Paleti:
            <strong> PPAL00000001</strong>
          </p>

          <p>
            🚚 Sevk Kolisi:
            <strong> SKOL00000001</strong>
          </p>

          <p>
            🚛 Sevk Paleti:
            <strong> SPAL00000001</strong>
          </p>
        </div>

        <p className="mt-5 text-sm leading-6 text-blue-800">
          Sevk THM barkodu paketleme
          sırasında müşteri, teslimat adresi
          ve sipariş kayıtlarıyla
          ilişkilendirilir. Bir Sevk THM,
          tek bir irsaliye ve sevkiyat
          birimini temsil eder.
        </p>
      </div>

      <div className="mt-8">
        <HandlingUnitBulkCreateForm />
      </div>
    </section>
  );
}
