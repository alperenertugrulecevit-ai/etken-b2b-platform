import Header from "@/components/layout/Header";
import ProductImage from "@/components/products/ProductImage";

import {
  prisma,
} from "@/lib/prisma";

import Link from "next/link";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

const categories = [
  {
    title:
      "Ofis Kırtasiye",
    icon: "📄",
    desc:
      "Kâğıt, kalem ve dosyalama",
  },
  {
    title:
      "Temizlik ve Hijyen",
    icon: "🧼",
    desc:
      "Temizlik ve hijyen ürünleri",
  },
  {
    title:
      "Gıda ve Mutfak",
    icon: "☕",
    desc:
      "İçecek ve mutfak ihtiyaçları",
  },
  {
    title:
      "Ambalaj ve Paketleme",
    icon: "📦",
    desc:
      "Ambalaj ve sevkiyat sarfları",
  },
  {
    title:
      "İş Güvenliği",
    icon: "🦺",
    desc:
      "Koruyucu ve ikaz ürünleri",
  },
];

function formatCurrency(
  value: number,
) {
  return value.toLocaleString(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "TRY",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  );
}

export default async function Home() {
  const [
    products,
    productCount,
  ] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          isActive:
            true,

          imageUrl: {
            not:
              null,
          },
        },

        orderBy: [
          {
            stock:
              "desc",
          },
          {
            id:
              "asc",
          },
        ],

        take: 15,

        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          imageUrl: true,
          price: true,
          stock: true,
        },
      }),

      prisma.product.count({
        where: {
          isActive:
            true,
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Header />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Kurumsal Ofis
            Tedarikinde{" "}
            <span className="text-[#EF4B23]">
              Yeni Nesil
              Platform
            </span>
          </h1>

          <p className="mt-1.5 max-w-4xl text-sm leading-5 text-slate-600">
            Ofis kırtasiye,
            temizlik,
            ambalaj,
            iş güvenliği
            ve gıda
            ürünlerini tek
            platformdan
            yönetin.
          </p>

          <form
            action="/products"
            className="mt-4 flex max-w-3xl shadow-sm"
          >
            <input
              name="q"
              className="min-w-0 flex-1 rounded-l-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#EF4B23]"
              placeholder="Ürün, marka veya ürün kodu ara..."
            />

            <button
              type="submit"
              className="rounded-r-xl bg-[#EF4B23] px-6 text-sm font-black text-white hover:bg-[#D83D18]"
            >
              ARA
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1400px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden self-start lg:sticky lg:top-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#202B38] px-4 py-2.5 text-sm font-black text-white">
              Kategoriler
            </div>

            <nav className="divide-y divide-slate-100">
              {categories.map(
                (
                  category,
                ) => (
                  <Link
                    key={
                      category.title
                    }
                    href={`/products?category=${encodeURIComponent(
                      category.title,
                    )}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-orange-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                      {
                        category.icon
                      }
                    </span>

                    <span className="min-w-0">
                      <strong className="block text-sm text-slate-900">
                        {
                          category.title
                        }
                      </strong>

                      <small className="block truncate text-xs text-slate-500">
                        {
                          category.desc
                        }
                      </small>
                    </span>
                  </Link>
                ),
              )}
            </nav>
          </div>

          <Link
            href="/products"
            className="mt-2 flex items-center justify-center rounded-xl border border-[#202B38] bg-white px-4 py-3 text-sm font-black text-[#202B38] hover:bg-slate-50"
          >
            Tüm Kategoriler
          </Link>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#EF4B23]">
                Ürün Vitrini
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Öne Çıkan
                Ürünler
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Görseli
                bulunan aktif
                kurumsal
                tedarik
                ürünleri
              </p>
            </div>

            <Link
              href="/products"
              className="text-sm font-black text-[#202B38] hover:text-[#EF4B23] hover:underline"
            >
              Tüm ürünleri
              görüntüle →
            </Link>
          </div>

          {products.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Vitrinde
              gösterilecek
              görselli aktif
              ürün
              bulunmuyor.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map(
                (
                  product,
                ) => (
                  <article
                    key={
                      product.id
                    }
                    className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Link
                      href={
                        "/products/" +
                        product.code
                      }
                      className="flex flex-1 flex-col"
                    >
                      <ProductImage
                        imageUrl={
                          product.imageUrl
                        }
                        productName={
                          product.name
                        }
                        className="h-24 rounded-lg border border-slate-100 p-2"
                        fallbackClassName="h-24 rounded-lg text-4xl"
                      />

                      <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-900">
                        {
                          product.name
                        }
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {
                          product.brand
                        }
                        {" · "}
                        {
                          product.code
                        }
                      </p>

                      <p className="mt-2.5 text-lg font-black text-[#EF4B23]">
                        {formatCurrency(
                          product.price,
                        )}
                      </p>

                      <p
                        className={
                          "mt-1 text-xs font-bold " +
                          (product.stock >
                          0
                            ? "text-emerald-700"
                            : "text-red-700")
                        }
                      >
                        {product.stock >
                        0
                          ? `Stok: ${product.stock} adet`
                          : "Stok bekleniyor"}
                      </p>
                    </Link>

                    <Link
                      href={
                        "/products/" +
                        product.code
                      }
                      className="mt-3 rounded-lg bg-[#202B38] px-3 py-2 text-center text-xs font-black text-white hover:bg-[#111923]"
                    >
                      Ürünü
                      İncele
                    </Link>
                  </article>
                ),
              )}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#202B38] p-4 text-white shadow-sm">
              <strong className="text-2xl">
                {
                  productCount
                }
                +
              </strong>

              <p className="mt-1 text-sm text-slate-300">
                Kayıtlı ürün
              </p>
            </div>

            <div className="rounded-xl bg-[#EF4B23] p-4 text-white shadow-sm">
              <strong className="text-2xl">
                B2B
              </strong>

              <p className="mt-1 text-sm text-orange-100">
                Kurumsal satın
                alma
              </p>
            </div>

            <div className="rounded-xl bg-slate-700 p-4 text-white shadow-sm">
              <strong className="text-2xl">
                5
              </strong>

              <p className="mt-1 text-sm text-slate-200">
                Ana ürün
                kategorisi
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}