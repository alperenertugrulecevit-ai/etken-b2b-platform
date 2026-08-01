import Link from "next/link";

import Header from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const categories = [
  {
    title: "Ofis Kırtasiye",
    icon: "📄",
    desc: "Kâğıt, kalem, dosyalama ve masaüstü ürünleri",
  },
  {
    title: "Teknoloji-Hırdavat",
    icon: "💻",
    desc: "Bilgisayar aksesuarları, kablolar ve teknik ürünler",
  },
  {
    title: "Endüstriyel",
    icon: "📦",
    desc: "Streç, koli bandı, ambalaj ve sarf ürünleri",
  },
  {
    title: "Temizlik ve Hijyen",
    icon: "🧼",
    desc: "Temizlik kimyasalları, aparatlar ve hijyen ürünleri",
  },
  {
    title: "Gıda Ürünleri",
    icon: "☕",
    desc: "Çay, kahve, içecek ve mutfak ihtiyaçları",
  },
  {
    title: "İş Güvenliği",
    icon: "🦺",
    desc: "Maske, eldiven, ilk yardım ve ikaz ürünleri",
  },
];

export default async function Home() {
  const featuredProducts =
    await prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
      take: 4,
    });

  const productCount =
    await prisma.product.count({
      where: {
        isActive: true,
      },
    });

  return (
    <main className="min-h-screen bg-slate-100">
      <Header />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-16 lg:py-20">
        <div className="max-w-4xl">
          <h1 className="break-words text-4xl font-bold leading-[1.12] text-slate-800 sm:text-5xl lg:text-6xl">
            Kurumsal Ofis Tedarikinde
            <span className="mt-2 block text-blue-900 sm:ml-2 sm:mt-0 sm:inline">
              Yeni Nesil Platform
            </span>
          </h1>

          <p className="mt-6 text-base leading-7 text-slate-600 sm:mt-8 sm:text-xl sm:leading-9">
            Ofis kırtasiye, temizlik, endüstriyel,
            teknoloji, iş güvenliği ve gıda ürünlerini
            tek platformdan yönetin.
          </p>

          <form
            action="/products"
            className="mt-8 flex max-w-3xl flex-col gap-3 sm:mt-12 sm:flex-row sm:gap-0"
          >
            <input
              name="q"
              className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-4 text-base outline-none sm:rounded-l-xl sm:rounded-r-none sm:px-6 sm:py-5 sm:text-lg"
              placeholder="Ürün, marka veya ürün kodu ara..."
            />

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-900 px-8 py-4 font-bold text-white hover:bg-blue-800 sm:rounded-l-none sm:rounded-r-xl sm:px-10"
            >
              ARA
            </button>
          </form>

          <div className="mt-6 grid gap-3 sm:mt-10 sm:flex sm:gap-5">
            <Link
              href="/products"
              className="rounded-xl bg-blue-900 px-6 py-4 text-center font-semibold text-white hover:bg-blue-800 sm:px-8"
            >
              Ürünleri İncele
            </Link>

            <Link
              href="/products"
              className="rounded-xl border-2 border-blue-900 px-6 py-4 text-center font-semibold text-blue-900 hover:bg-blue-50 sm:px-8"
            >
              Teklif Al
            </Link>
          </div>
        </div>
      </section>

      {/* KATEGORİLER */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 sm:pb-24">
        <h2 className="mb-6 text-2xl font-bold sm:mb-10 sm:text-3xl">
          Popüler Kategoriler
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {categories.map((category) => (
            <Link
              key={category.title}
              href="/products"
              className="rounded-2xl bg-white p-6 shadow transition-all hover:-translate-y-1 hover:shadow-xl sm:p-8"
            >
              <div className="text-4xl sm:text-5xl">
                {category.icon}
              </div>

              <h3 className="mt-4 text-xl font-bold sm:mt-5 sm:text-2xl">
                {category.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-500">
                {category.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ÖNE ÇIKAN ÜRÜNLER */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 sm:pb-24">
        <div className="mb-6 flex flex-col items-start gap-3 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Öne Çıkan Ürünler
          </h2>

          <Link
            href="/products"
            className="font-semibold text-blue-900 hover:underline"
          >
            Tüm ürünleri görüntüle →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-8">
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl bg-white p-5 shadow transition hover:shadow-xl sm:p-6"
            >
              <Link href={`/products/${product.code}`}>
                <div className="flex h-36 items-center justify-center rounded-xl bg-slate-200 text-5xl sm:h-40 sm:text-6xl">
                  📦
                </div>

                <h3 className="mt-5 min-h-14 text-lg font-bold sm:mt-6">
                  {product.name}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Marka: {product.brand}
                </p>

                <p className="text-sm text-gray-500">
                  Ürün kodu: {product.code}
                </p>

                <p className="mt-4 text-2xl font-bold text-blue-900">
                  {product.price.toFixed(2)} ₺
                </p>

                <p className="mt-2 text-green-600">
                  Stok: {product.stock} adet
                </p>
              </Link>

              <Link
                href={`/products/${product.code}`}
                className="mt-6 block w-full rounded-xl bg-blue-900 py-3 text-center font-semibold text-white hover:bg-blue-800"
              >
                Ürünü İncele
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* İSTATİSTİKLER */}
      <section className="bg-blue-900 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 text-center sm:px-8 sm:py-16 md:grid-cols-4 md:gap-10">
          <div>
            <div className="text-3xl font-bold sm:text-5xl">
              {productCount}+
            </div>
            <div className="mt-2 text-sm sm:text-base">
              Kayıtlı Ürün
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold sm:text-5xl">
              10+
            </div>
            <div className="mt-2 text-sm sm:text-base">
              Tedarikçi Hedefi
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold sm:text-5xl">
              50+
            </div>
            <div className="mt-2 text-sm sm:text-base">
              Kurumsal Müşteri Hedefi
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold sm:text-5xl">
              %100
            </div>
            <div className="mt-2 text-sm sm:text-base">
              B2B Odaklı
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}