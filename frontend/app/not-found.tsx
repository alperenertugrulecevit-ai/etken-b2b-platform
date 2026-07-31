import Link from "next/link";

import Header from "@/components/layout/Header";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <Header />

      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
          Hata 404
        </p>

        <h1 className="mt-4 text-4xl font-black text-slate-900 sm:text-5xl">
          Aradığınız sayfa bulunamadı
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Sayfanın adresi değişmiş, kaldırılmış veya yanlış yazılmış olabilir.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-blue-900 px-7 py-4 font-bold text-white hover:bg-blue-800"
          >
            Ana Sayfaya Dön
          </Link>

          <Link
            href="/products"
            className="rounded-xl border-2 border-blue-900 bg-white px-7 py-4 font-bold text-blue-900 hover:bg-blue-50"
          >
            Ürünleri İncele
          </Link>
        </div>
      </section>
    </main>
  );
}
