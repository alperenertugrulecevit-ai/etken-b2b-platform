"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import ProductImage from "@/components/products/ProductImage";

type HeroProduct = {
  code: string;
  name: string;
  brand: string;
  imageUrl: string | null;
};

type Props = {
  productCount: number;

  featuredProduct?: HeroProduct | null;
  newestProduct?: HeroProduct | null;
  officeProduct?: HeroProduct | null;
  cleaningProduct?: HeroProduct | null;
  foodProduct?: HeroProduct | null;
};

type Slide = {
  eyebrow: string;
  eyebrowClassName: string;

  title: string;
  highlight: string;

  description: string;

  primaryLabel: string;
  primaryHref: string;

  secondaryLabel?: string;
  secondaryHref?: string;

  backgroundClassName: string;

  product?: HeroProduct | null;

  statLabel?: string;
  statValue?: string;
};

const AUTO_CHANGE_MS =
  6000;

export default function HomeHeroSlider({
  productCount,
  featuredProduct,
  newestProduct,
  officeProduct,
  cleaningProduct,
  foodProduct,
}: Props) {
  const slides: Slide[] = [
    {
      eyebrow:
        "ETKEN OFİS KURUMSAL TEDARİK",

      eyebrowClassName:
        "text-slate-600",

      title:
        "Ofisinizin tüm ihtiyaçları",

      highlight:
        "tek platformda.",

      description:
        "Kırtasiye, temizlik, gıda, ambalaj ve iş güvenliği ürünlerinde kurumsal satın alma deneyimi.",

      primaryLabel:
        "Ürünleri İncele",

      primaryHref:
        "/products",

      secondaryLabel:
        "Kurumsal Giriş",

      secondaryHref:
        "/customer-login",

      backgroundClassName:
        "from-slate-50 via-white to-slate-100",

      product:
        officeProduct ??
        featuredProduct,

      statLabel:
        "Aktif Katalog",

      statValue:
        `${productCount}+`,
    },

    {
      eyebrow:
        "EN ÇOK TERCİH EDİLENLER",

      eyebrowClassName:
        "text-[#EF4B23]",

      title:
        "Kurumsal müşterilerin",

      highlight:
        "öne çıkan tercihleri.",

      description:
        "Ofislerin günlük ihtiyaçlarında sık tercih edilen ürünleri hızlıca keşfedin.",

      primaryLabel:
        "Öne Çıkanları Gör",

      primaryHref:
        "/products",

      secondaryLabel:
        "Tüm Ürünler",

      secondaryHref:
        "/products",

      backgroundClassName:
        "from-orange-50 via-white to-amber-50",

      product:
        featuredProduct,

      statLabel:
        "Etken Seçimi",

      statValue:
        "Öne Çıkan",
    },

    {
      eyebrow:
        "YENİ EKLENENLER",

      eyebrowClassName:
        "text-violet-700",

      title:
        "Kataloğumuz",

      highlight:
        "sürekli büyüyor.",

      description:
        "Yeni eklenen markalı ve kurumsal kullanıma uygun ürünleri inceleyin.",

      primaryLabel:
        "Yeni Ürünleri Gör",

      primaryHref:
        "/products",

      secondaryLabel:
        "Tüm Ürünler",

      secondaryHref:
        "/products",

      backgroundClassName:
        "from-violet-50 via-white to-indigo-50",

      product:
        newestProduct,

      statLabel:
        "Yeni",

      statValue:
        "Katalog",
    },

    {
      eyebrow:
        "OFİS KIRTASİYE",

      eyebrowClassName:
        "text-blue-700",

      title:
        "Ofisiniz için",

      highlight:
        "temel ihtiyaçlar.",

      description:
        "Kağıt, kalem, klasör, dosyalama ve masaüstü ürünlerini tek noktadan tedarik edin.",

      primaryLabel:
        "Kırtasiye Ürünleri",

      primaryHref:
        "/products?category=Ofis%20K%C4%B1rtasiye",

      backgroundClassName:
        "from-blue-50 via-white to-sky-50",

      product:
        officeProduct,

      statLabel:
        "Kategori",

      statValue:
        "Ofis",
    },

    {
      eyebrow:
        "PROFESYONEL TEMİZLİK",

      eyebrowClassName:
        "text-cyan-700",

      title:
        "Hijyen ihtiyaçlarınızı",

      highlight:
        "tek noktadan tamamlayın.",

      description:
        "Kağıt grubu, temizlik kimyasalları ve profesyonel hijyen sarfları.",

      primaryLabel:
        "Temizlik Ürünleri",

      primaryHref:
        "/products?category=Temizlik%20ve%20Hijyen",

      backgroundClassName:
        "from-cyan-50 via-white to-blue-50",

      product:
        cleaningProduct,

      statLabel:
        "Kategori",

      statValue:
        "Hijyen",
    },

    {
      eyebrow:
        "OFİS İKRAM",

      eyebrowClassName:
        "text-amber-700",

      title:
        "Kahve molaları",

      highlight:
        "Etken Ofis ile daha kolay.",

      description:
        "Kahve, çay, şeker ve mutfak ihtiyaçlarını kurumsal siparişe ekleyin.",

      primaryLabel:
        "Gıda ve Mutfak",

      primaryHref:
        "/products?category=G%C4%B1da%20ve%20Mutfak",

      backgroundClassName:
        "from-amber-50 via-white to-orange-50",

      product:
        foodProduct,

      statLabel:
        "Ofis",

      statValue:
        "İkram",
    },
  ];

  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(0);

  const [
    isPaused,
    setIsPaused,
  ] =
    useState(false);

  const nextSlide =
    useCallback(() => {
      setActiveIndex(
        (
          current,
        ) =>
          (current +
            1) %
          slides.length,
      );
    }, [
      slides.length,
    ]);

  const previousSlide =
    useCallback(() => {
      setActiveIndex(
        (
          current,
        ) =>
          (current -
            1 +
            slides.length) %
          slides.length,
      );
    }, [
      slides.length,
    ]);

  useEffect(
    () => {
      if (
        isPaused
      ) {
        return;
      }

      const timer =
        window.setInterval(
          nextSlide,
          AUTO_CHANGE_MS,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      isPaused,
      nextSlide,
    ],
  );

  const slide =
    slides[
      activeIndex
    ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 lg:px-5">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <div
            className="relative min-w-0"
            onMouseEnter={() =>
              setIsPaused(
                true,
              )
            }
            onMouseLeave={() =>
              setIsPaused(
                false,
              )
            }
          >
            <div
              className={`relative h-[270px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r ${slide.backgroundClassName} shadow-sm xl:h-[285px]`}
            >
              <div className="grid h-full items-center gap-3 px-7 py-5 md:grid-cols-[minmax(0,1.12fr)_minmax(250px,0.88fr)] lg:px-8 xl:px-10">
                <div className="relative z-10 max-w-[540px]">
                  <span
                    className={`inline-flex rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm ${slide.eyebrowClassName}`}
                  >
                    {
                      slide.eyebrow
                    }
                  </span>

                  <h1 className="mt-3 text-[25px] font-black leading-[1.08] tracking-tight text-[#172435] sm:text-[29px] xl:text-[32px]">
                    {
                      slide.title
                    }

                    <span className="mt-1 block text-[#EF4B23]">
                      {
                        slide.highlight
                      }
                    </span>
                  </h1>

                  <p className="mt-3 max-w-[500px] text-[13px] leading-5 text-slate-600 sm:text-sm">
                    {
                      slide.description
                    }
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Link
                      href={
                        slide.primaryHref
                      }
                      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#EF4B23] px-5 text-xs font-black text-white shadow-sm transition hover:bg-[#D83D18]"
                    >
                      {
                        slide.primaryLabel
                      }
                    </Link>

                    {slide.secondaryLabel &&
                    slide.secondaryHref ? (
                      <Link
                        href={
                          slide.secondaryHref
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white/85 px-5 text-xs font-black text-[#202B38] transition hover:border-[#EF4B23] hover:text-[#EF4B23]"
                      >
                        {
                          slide.secondaryLabel
                        }
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="relative hidden h-[215px] items-center justify-center md:flex">
                  {slide.product ? (
                    <Link
                      href={`/products/${slide.product.code}`}
                      className="group relative flex h-full w-full items-center justify-center"
                    >
                      <ProductImage
                        imageUrl={
                          slide.product.imageUrl
                        }
                        productName={
                          slide.product.name
                        }
                        className="h-[170px] w-full max-w-[280px] rounded-xl bg-transparent object-contain p-3 transition duration-500 group-hover:scale-[1.03]"
                        fallbackClassName="h-[170px] w-full max-w-[280px] rounded-xl text-5xl"
                      />

                      <div className="absolute bottom-1 right-1 max-w-[210px] rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[#EF4B23]">
                          {
                            slide.product.brand
                          }
                        </p>

                        <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-800">
                          {
                            slide.product.name
                          }
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex h-[170px] w-[270px] items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-6xl shadow-sm">
                      📦
                    </div>
                  )}

                  {slide.statValue ? (
                    <div className="absolute right-0 top-0 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-center shadow-sm backdrop-blur">
                      <p className="text-[9px] font-bold text-slate-500">
                        {
                          slide.statLabel
                        }
                      </p>

                      <p className="mt-0.5 text-base font-black text-[#172435]">
                        {
                          slide.statValue
                        }
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                previousSlide
              }
              aria-label="Önceki reklam"
              className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={
                nextSlide
              }
              aria-label="Sonraki reklam"
              className="absolute right-0 top-1/2 z-20 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white"
            >
              ›
            </button>

            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1.5 shadow-sm backdrop-blur">
              {slides.map(
                (
                  item,
                  index,
                ) => (
                  <button
                    key={
                      item.eyebrow
                    }
                    type="button"
                    onClick={() =>
                      setActiveIndex(
                        index,
                      )
                    }
                    aria-label={`Reklam ${
                      index +
                      1
                    }`}
                    className={`h-2 rounded-full transition-all ${
                      index ===
                      activeIndex
                        ? "w-5 bg-[#EF4B23]"
                        : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ),
              )}
            </div>
          </div>

          <OfficeBreakPromo />
        </div>
      </div>
    </section>
  );
}

function OfficeBreakPromo() {
  return (
    <Link
      href="/products?category=G%C4%B1da%20ve%20Mutfak"
      className="group relative hidden h-[270px] min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#FFF8EA] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg lg:block xl:h-[285px]"
      aria-label="Gıda ve Mutfak ürünlerini keşfet"
    >
      <img
        src="/ofis-molasi-banner.png"
        alt="Etken Ofis Ofis Molası"
        className="absolute inset-0 h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.01]"
      />

      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/[0.03]" />
    </Link>
  );
}