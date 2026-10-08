import Link from "next/link";

import Header from "@/components/layout/Header";

import HomeHeroSlider from "@/components/products/HomeHeroSlider";

import HomeProductCard from "@/components/products/HomeProductCard";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type ProductCardModel = {
  id: number;
  code: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  price: number;
  vat: number;
  availableStock: number;
};

function mapProduct(
  product: {
    id: number;
    code: string;
    name: string;
    brand: string;
    imageUrl: string | null;
    price: number;
    vat: number;
    stock: number;
    reservedStock: number;
  },
): ProductCardModel {
  return {
    id:
      product.id,

    code:
      product.code,

    name:
      product.name,

    brand:
      product.brand,

    imageUrl:
      product.imageUrl,

    price:
      product.price,

    vat:
      product.vat,

    availableStock:
      Math.max(
        0,
        product.stock -
          product.reservedStock,
      ),
  };
}

const productSelect = {
  id: true,
  code: true,
  name: true,
  brand: true,
  imageUrl: true,
  price: true,
  vat: true,
  stock: true,
  reservedStock: true,
} as const;

export default async function Home() {
  const [
    featuredRaw,
    newRaw,
    officeRaw,
    cleaningRaw,
    foodRaw,
    _productCount,
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
              "desc",
          },
        ],

        take:
          10,

        select:
          productSelect,
      }),

      prisma.product.findMany({
        where: {
          isActive:
            true,

          imageUrl: {
            not:
              null,
          },
        },

        orderBy: {
          id:
            "desc",
        },

        take:
          10,

        select:
          productSelect,
      }),

      prisma.product.findMany({
        where: {
          isActive:
            true,

          imageUrl: {
            not:
              null,
          },

          categoryRef: {
            parent: {
              name:
                "Ofis Kırtasiye",
            },
          },
        },

        orderBy: {
          id:
            "desc",
        },

        take:
          10,

        select:
          productSelect,
      }),

      prisma.product.findMany({
        where: {
          isActive:
            true,

          imageUrl: {
            not:
              null,
          },

          categoryRef: {
            parent: {
              name:
                "Temizlik ve Hijyen",
            },
          },
        },

        orderBy: {
          id:
            "desc",
        },

        take:
          10,

        select:
          productSelect,
      }),

      prisma.product.findMany({
        where: {
          isActive:
            true,

          imageUrl: {
            not:
              null,
          },

          categoryRef: {
            parent: {
              name:
                "Gıda ve Mutfak",
            },
          },
        },

        orderBy: {
          id:
            "desc",
        },

        take:
          10,

        select:
          productSelect,
      }),

      prisma.product.count({
        where: {
          isActive:
            true,
        },
      }),
    ]);

  const featured =
    featuredRaw.map(
      mapProduct,
    );

  const newProducts =
    newRaw.map(
      mapProduct,
    );

  const officeProducts =
    officeRaw.map(
      mapProduct,
    );

  const cleaningProducts =
    cleaningRaw.map(
      mapProduct,
    );

  const foodProducts =
    foodRaw.map(
      mapProduct,
    );

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <Header />

      <HomeHeroSlider />

      <section className="mx-auto w-full max-w-[1600px] px-3 pb-2 sm:px-4 lg:px-5 lg:hidden">
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {[
            ["Ofis Kırtasiye", "/products?category=Ofis%20K%C4%B1rtasiye", "📋", "bg-blue-500"],
            ["Temizlik ve Hijyen", "/products?category=Temizlik%20ve%20Hijyen", "🧴", "bg-cyan-500"],
            ["Gıda ve Mutfak", "/products?category=G%C4%B1da%20ve%20Mutfak", "☕", "bg-orange-500"],
            ["Ambalaj ve Paketleme", "/products?category=Ambalaj%20ve%20Paketleme", "📦", "bg-violet-500"],
            ["İş Güvenliği", "/products?category=%C4%B0%C5%9F%20G%C3%BCvenli%C4%9Fi", "🛡", "bg-emerald-500"],
            ["Teknoloji ve Hırdavat", "/products?category=Teknoloji%20ve%20H%C4%B1rdavat", "⚙", "bg-red-500"],
          ].map(([name, href, icon, tone]) => (
            <Link key={name} href={href} className="flex min-h-[110px] flex-col items-center justify-center gap-2 border-b border-r border-slate-100 p-2 text-center">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl text-white ${tone}`} aria-hidden="true">{icon}</span>
              <span className="text-[11px] font-black leading-tight text-[#071729]">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto hidden w-full max-w-[1600px] px-3 pb-2 sm:px-4 lg:block lg:px-5">
        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Hızlı ve Güvenilir", "İstanbul içi hızlı teslimat", "delivery", "bg-orange-500"],
            ["Kurumsal Avantajlar", "İşletmenize özel çözümler", "shield", "bg-blue-500"],
            ["Geniş Ürün Yelpazesi", "Ofisin tüm ihtiyaçları", "check", "bg-emerald-500"],
            ["Güvenli Ödeme", "Korunan ödeme süreci", "payment", "bg-violet-500"],
            ["Müşteri Desteği", "Sipariş öncesi ve sonrası", "support", "bg-red-500"],
          ].map(([title, description, icon, tone]) => (
            <div key={title} className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0 sm:border-r lg:border-b-0">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${tone}`}>
                <HomeBenefitIcon type={icon} />
              </span>
              <div>
                <strong className="block text-[11px] font-black text-[#071729]">{title}</strong>
                <span className="block text-[9px] text-slate-500">{description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ProductSection
        title="Sizin için seçtiklerimiz"
        eyebrow="ÖNE ÇIKAN ÜRÜNLER"
        description="En çok tercih edilen ürünleri hemen keşfedin"
        products={
          featured
        }
        badge="Öne Çıkan"
        compactTop
      />

      <ProductSection
        title="Yeni Eklenenler"
        eyebrow="YENİ ÜRÜNLER"
        description="Kataloğa en son eklenen ürünler"
        products={
          newProducts
        }
        badge="Yeni"
      />

      <ProductSection
        title="Ofis Kırtasiye"
        eyebrow="OFİSİNİZ İÇİN"
        description="Ofis, okul ve günlük kullanım için kırtasiye ürünleri"
        products={
          officeProducts
        }
        href="/products?category=Ofis%20K%C4%B1rtasiye"
      />

      <ProductSection
        title="Temizlik ve Hijyen"
        eyebrow="PROFESYONEL HİJYEN"
        description="Ev ve iş yeriniz için temizlik ve hijyen ürünleri"
        products={
          cleaningProducts
        }
        href="/products?category=Temizlik%20ve%20Hijyen"
      />

      <ProductSection
        title="Kahve, Çay ve Mutfak"
        eyebrow="OFİS İKRAM"
        description="Kahve, çay ve mutfak ihtiyaçlarınız tek yerde"
        products={
          foodProducts
        }
        href="/products?category=G%C4%B1da%20ve%20Mutfak"
      />

      <CorporateSolution />
    </main>
  );
}

function ProductSection({
  title,
  eyebrow,
  description,
  products,
  badge,
  href = "/products",
  compactTop = false,
}: {
  title: string;
  eyebrow: string;
  description: string;
  products: ProductCardModel[];
  badge?: string;
  href?: string;
  compactTop?: boolean;
}) {
  if (
    products.length ===
    0
  ) {
    return null;
  }

  return (
    <section
      className={`mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-5 ${
        compactTop
          ? "pb-2 pt-0.5"
          : "py-4"
      }`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#EF4B23]">
            {
              eyebrow
            }
          </span>

          <h2 className="mt-0.5 text-[19px] font-black tracking-tight text-[#071729] sm:text-[21px]">
            {
              title
            }
          </h2>

          <p className="mt-0.5 text-[10px] text-slate-500">
            {
              description
            }
          </p>
        </div>

        <Link
          href={
            href
          }
          className="hidden shrink-0 text-[10px] font-black text-[#202B38] transition hover:text-[#EF4B23] sm:inline-flex"
        >
          Tümünü Gör →
        </Link>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {products
          .slice(
            0,
            5,
          )
          .map(
            (
              product,
            ) => (
              <HomeProductCard
                key={
                  product.id
                }
                product={
                  product
                }
                badge={
                  badge
                }
              />
            ),
          )}
      </div>
    </section>
  );
}


function HomeBenefitIcon({ type }: { type: string }) {
  const common = "h-5 w-5";
  if (type === "delivery") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  if (type === "payment") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>;
  if (type === "support") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden="true"><path d="M4 13v-1a8 8 0 0116 0v1"/><path d="M4 13h3v6H5a2 2 0 01-2-2v-2a2 2 0 012-2zM20 13h-3v6h2a2 2 0 002-2v-2a2 2 0 00-2-2zM17 19c-1 2-3 2-5 2"/></svg>;
  if (type === "check") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={common} aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden="true"><path d="M12 3l7 3v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6z"/><path d="M8.5 12l2.2 2.2 4.8-5"/></svg>;
}

function CorporateSolution() {
  const benefits = [
    {
      title:
        "Hızlı Teslimat",
      description:
        "İstanbul içi sevkiyat",
      icon:
        "delivery",
      iconClassName:
        "bg-orange-500 text-white",
    },
    {
      title:
        "Kurumsal Fatura",
      description:
        "İşletmelere özel süreç",
      icon:
        "invoice",
      iconClassName:
        "bg-cyan-500 text-white",
    },
    {
      title:
        "Toplu Alım",
      description:
        "Kurumsal sipariş desteği",
      icon:
        "package",
      iconClassName:
        "bg-violet-500 text-white",
    },
    {
      title:
        "Güvenli Sipariş",
      description:
        "Güvenli alışveriş süreci",
      icon:
        "secure",
      iconClassName:
        "bg-lime-500 text-white",
    },
  ] as const;

  return (
    <section className="mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-5 pb-8 pt-4 sm:px-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#071729] via-[#0B1F34] to-[#071729] text-white shadow-lg">
        <div className="grid lg:grid-cols-[1fr_1.6fr]">
          <div className="border-b border-white/10 px-6 py-5 lg:border-b-0 lg:border-r">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-400">
              Kurumsal Çözüm
            </span>

            <h2 className="mt-1.5 text-[19px] font-black leading-tight sm:text-[21px]">
              Bireysel alışverişin yanında kurumsal ihtiyaçlarınız için de yanınızdayız.
            </h2>

            <p className="mt-2 max-w-[430px] text-[10px] leading-4 text-slate-300">
              Düzenli tüketim,
              yüksek hacimli sipariş
              ve özel kurumsal
              ihtiyaçlar için Etken
              Ofis ile iletişime
              geçin.
            </p>

            <Link
              href="/contact"
              className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-[#EF4B23] px-5 text-[11px] font-black text-white transition hover:bg-[#D83D18]"
            >
              Teklif İste
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4">
            {benefits.map(
              (
                benefit,
              ) => (
                <div
                  key={
                    benefit.title
                  }
                  className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4 lg:border-b-0 lg:border-r lg:last:border-r-0"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md ${benefit.iconClassName}`}
                  >
                    <BenefitIcon
                      type={
                        benefit.icon
                      }
                    />
                  </span>

                  <div>
                    <strong className="block text-[10px] font-black text-white">
                      {
                        benefit.title
                      }
                    </strong>

                    <span className="mt-0.5 block text-[9px] leading-4 text-slate-300">
                      {
                        benefit.description
                      }
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitIcon({
  type,
}: {
  type:
    | "delivery"
    | "invoice"
    | "package"
    | "secure";
}) {
  const className =
    "h-5 w-5";

  if (
    type ===
    "delivery"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          className
        }
        aria-hidden="true"
      >
        <path d="M3 6h11v10H3z" />
        <path d="M14 9h4l3 3v4h-7z" />
        <circle
          cx="7"
          cy="18"
          r="2"
        />
        <circle
          cx="18"
          cy="18"
          r="2"
        />
      </svg>
    );
  }

  if (
    type ===
    "invoice"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          className
        }
        aria-hidden="true"
      >
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h5" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    );
  }

  if (
    type ===
    "package"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          className
        }
        aria-hidden="true"
      >
        <path d="M4 7l8-4 8 4-8 4z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        className
      }
      aria-hidden="true"
    >
      <path d="M12 3l7 3v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6z" />
      <path d="M8.5 12l2.2 2.2 4.8-5" />
    </svg>
  );
}