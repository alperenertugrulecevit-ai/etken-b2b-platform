import Header from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
const featuredProducts = await prisma.product.findMany({
  where: {
    isActive: true,
  },
  orderBy: {
    id: "asc",
  },
  take: 4,
});

const productCount = await prisma.product.count({
  where: {
    isActive: true,
  },
});

  return (
    <main className="min-h-screen bg-slate-100">
      <Header />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-8 py-20">
        <div className="max-w-4xl">
          <h1 className="text-6xl font-bold leading-tight text-slate-800">
            Kurumsal Ofis Tedarikinde
            <span className="text-blue-900"> Yeni Nesil Platform</span>
          </h1>

          <p className="mt-8 text-xl leading-9 text-slate-600">
            Ofis kırtasiye, temizlik, endüstriyel, teknoloji, iş güvenliği
            ve gıda ürünlerini tek platformdan yönetin.
          </p>

          <form
            action="/products"
            className="mt-12 flex max-w-3xl"
          >
            <input
              name="q"
              className="flex-1 rounded-l-xl border bg-white px-6 py-5 text-lg outline-none"
              placeholder="Ürün, marka veya ürün kodu ara..."
            />

            <button
              type="submit"
              className="rounded-r-xl bg-blue-900 px-10 font-bold text-white hover:bg-blue-800"
            >
              ARA
            </button>
          </form>

          <div className="mt-10 flex gap-5">
            <Link
              href="/products"
              className="rounded-xl bg-blue-900 px-8 py-4 font-semibold text-white hover:bg-blue-800"
            >
              Ürünleri İncele
            </Link>

            <Link
              href="/products"
              className="rounded-xl border-2 border-blue-900 px-8 py-4 font-semibold text-blue-900 hover:bg-blue-50"
            >
              Teklif Al
            </Link>
          </div>
        </div>
      </section>

      {/* KATEGORİLER */}
      <section className="mx-auto max-w-7xl px-8 pb-24">
        <h2 className="mb-10 text-3xl font-bold">
          Popüler Kategoriler
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.title}
              href="/products"
              className="rounded-2xl bg-white p-8 shadow transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="text-5xl">
                {category.icon}
              </div>

              <h3 className="mt-5 text-2xl font-bold">
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
      <section className="mx-auto max-w-7xl px-8 pb-24">
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-3xl font-bold">
            Öne Çıkan Ürünler
          </h2>

          <Link
            href="/products"
            className="font-semibold text-blue-900 hover:underline"
          >
            Tüm ürünleri görüntüle →
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl bg-white p-6 shadow transition hover:shadow-xl"
            >
              <Link href={`/products/${product.code}`}>
                <div className="flex h-40 items-center justify-center rounded-xl bg-slate-200 text-6xl">
                  📦
                </div>

                <h3 className="mt-6 min-h-14 text-lg font-bold">
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
        <div className="mx-auto grid max-w-7xl gap-10 px-8 py-16 text-center md:grid-cols-4">
          <div>
            <div className="text-5xl font-bold">
              {productCount}+
            </div>
            <div className="mt-2">
              Kayıtlı Ürün
            </div>
          </div>

          <div>
            <div className="text-5xl font-bold">
              10+
            </div>
            <div className="mt-2">
              Tedarikçi Hedefi
            </div>
          </div>

          <div>
            <div className="text-5xl font-bold">
              50+
            </div>
            <div className="mt-2">
              Kurumsal Müşteri Hedefi
            </div>
          </div>

          <div>
            <div className="text-5xl font-bold">
              %100
            </div>
            <div className="mt-2">
              B2B Odaklı
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-8 py-12 md:flex-row">
          <div>
            <h2 className="text-2xl font-bold">
              ETKEN
            </h2>

            <p className="mt-3 text-slate-400">
              Kurumsal Tedarik Platformu
            </p>
          </div>

          <div className="text-slate-400 md:text-right">
            © 2026 ETKEN Ofis Tedarik Hizmetleri Ltd. Şti.
          </div>
        </div>
      </footer>
    </main>
  );
}