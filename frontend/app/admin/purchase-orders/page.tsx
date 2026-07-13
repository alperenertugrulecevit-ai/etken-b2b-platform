import Link from "next/link";

export default function PurchaseOrdersPage() {
  return (
    <section className="p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Satın Alma Yönetimi
          </h1>

          <p className="mt-2 text-gray-500">
            Tedarikçilerden verilen satın alma
            siparişlerini yönetin.
          </p>
        </div>

        <button
          disabled
          className="rounded-xl bg-slate-300 px-6 py-3 font-bold text-slate-500"
        >
          + Yeni Satın Alma
        </button>
      </div>

      <div className="mt-10 rounded-2xl bg-white p-16 text-center shadow">
        <h2 className="text-2xl font-bold">
          Henüz Satın Alma Siparişi Yok
        </h2>

        <p className="mt-3 text-gray-500">
          Bir sonraki sprintte ilk satın alma
          siparişini oluşturacağız.
        </p>

        <Link
          href="/admin"
          className="mt-8 inline-block rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white"
        >
          Dashboard'a Dön
        </Link>
      </div>
    </section>
  );
}