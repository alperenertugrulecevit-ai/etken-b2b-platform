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
  productCluster?: HeroProduct[];

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
        "Ofisiniz için",

      highlight:
        "tüm ihtiyaçlar tek yerde!",

      description:
        "Kırtasiye, temizlik, gıda, teknoloji ve daha fazlası kurumsal avantajlarla Etken Ofis’te.",

      primaryLabel:
        "Alışverişe Başla →",

      primaryHref:
        "/products",


      backgroundClassName:
        "from-[#f7fafc] via-white to-[#eaf1f7]",

      product:
        officeProduct ??
        featuredProduct,

      productCluster: [officeProduct, featuredProduct, newestProduct, cleaningProduct, foodProduct].filter(Boolean) as HeroProduct[],

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
        (current) =>
          (current + 1) %
          slides.length,
      );
    }, [
      slides.length,
    ]);

  const previousSlide =
    useCallback(() => {
      setActiveIndex(
        (current) =>
          (current -
            1 +
            slides.length) %
          slides.length,
      );
    }, [
      slides.length,
    ]);

  useEffect(() => {
    if (isPaused) {
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
  }, [
    isPaused,
    nextSlide,
  ]);

  const slide =
    slides[
      activeIndex
    ];

  return (
    <section className="bg-white">
      <div className="w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="grid items-stretch">
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
              className={`relative h-[235px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r ${slide.backgroundClassName} shadow-sm sm:h-[270px] xl:h-[280px]`}
            >
              <div className="relative h-full px-7 py-4 sm:grid sm:items-center sm:gap-3 sm:px-8 sm:py-5 md:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] lg:px-10 xl:px-12">
                <div className="relative z-10 w-[62%] sm:w-auto sm:max-w-[470px]">
                  <span
                    className={`inline-flex rounded-full bg-white/85 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] shadow-sm sm:px-3 sm:text-[10px] ${slide.eyebrowClassName}`}
                  >
                    {
                      slide.eyebrow
                    }
                  </span>

                  <h1 className="mt-2.5 text-[19px] font-black leading-[1.05] tracking-tight text-[#172435] sm:mt-3 sm:text-[30px] xl:text-[34px]">
                    {
                      slide.title
                    }

                    <span className="mt-0.5 block text-[#EF4B23] sm:mt-1">
                      {
                        slide.highlight
                      }
                    </span>
                  </h1>

                  <p className="mt-2 line-clamp-3 text-[9px] leading-[14px] text-slate-600 sm:mt-3 sm:max-w-[500px] sm:text-[13px] sm:leading-5">
                    {
                      slide.description
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 sm:gap-2.5">
                    <Link
                      href={
                        slide.primaryHref
                      }
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#EF4B23] px-3.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#D83D18] sm:min-h-10 sm:px-5 sm:text-xs"
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
                        className="hidden min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white/85 px-5 text-xs font-black text-[#202B38] transition hover:border-[#EF4B23] hover:text-[#EF4B23] sm:inline-flex"
                      >
                        {
                          slide.secondaryLabel
                        }
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* MOBİL ÜRÜN GÖRSELİ */}
                {slide.product &&
                slide.product.imageUrl ? (
                  <Link
                    href={`/products/${slide.product.code}`}
                    className="absolute bottom-8 right-4 top-11 z-[5] flex w-[34%] items-center justify-center sm:hidden"
                    aria-label={
                      slide.product.name
                    }
                  >
                    <ProductImage
                      imageUrl={
                        slide.product.imageUrl
                      }
                      productName={
                        slide.product.name
                      }
                      className="h-full max-h-[150px] w-full bg-transparent object-contain p-1"
                      fallbackClassName="hidden"
                    />
                  </Link>
                ) : null}

                <div className="relative hidden h-[230px] items-center justify-center md:flex">
                  {slide.productCluster && slide.productCluster.length > 1 ? (
                    <div className="relative h-full w-full">
                      {slide.productCluster.slice(0, 5).map((product, index) => {
                        const positions = [
                          "left-[0%] top-[14%] z-[4] h-[145px] w-[32%] -rotate-6",
                          "left-[22%] top-[0%] z-[6] h-[205px] w-[38%] rotate-2",
                          "right-[0%] top-[16%] z-[5] h-[155px] w-[31%] rotate-5",
                          "left-[8%] bottom-[-2%] z-[7] h-[115px] w-[27%] rotate-2",
                          "right-[19%] bottom-[-2%] z-[8] h-[120px] w-[28%] -rotate-3",
                        ];
                        return (
                          <Link key={product.code} href={`/products/${product.code}`} className={`group absolute flex items-center justify-center transition duration-500 hover:z-20 hover:scale-110 ${positions[index]}`}>
                            <ProductImage imageUrl={product.imageUrl} productName={product.name} className="h-full w-full bg-transparent object-contain drop-shadow-xl" fallbackClassName="h-full w-full rounded-xl text-3xl" />
                          </Link>
                        );
                      })}
                      <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/80 bg-white/90 px-4 py-1.5 text-[10px] font-black text-[#172435] shadow-lg backdrop-blur">
                        İşiniz için Güçlü Çözümler
                      </div>
                    </div>
                  ) : slide.product ? (
                    <Link href={`/products/${slide.product.code}`} className="group relative flex h-full w-full items-center justify-center">
                      <ProductImage imageUrl={slide.product.imageUrl} productName={slide.product.name} className="h-[215px] w-full max-w-[390px] rounded-xl bg-transparent object-contain p-2 transition duration-500 group-hover:scale-[1.04]" fallbackClassName="h-[215px] w-full max-w-[390px] rounded-xl text-5xl" />
                      <div className="absolute bottom-1 right-1 max-w-[210px] rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[#EF4B23]">{slide.product.brand}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-800">{slide.product.name}</p>
                      </div>
                    </Link>
                  ) : null}
                  {slide.statValue ? (
                    <div className="absolute right-0 top-0 z-20 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-center shadow-sm backdrop-blur">
                      <p className="text-[9px] font-bold text-slate-500">{slide.statLabel}</p>
                      <p className="mt-0.5 text-base font-black text-[#172435]">{slide.statValue}</p>
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
              className="absolute left-0 top-1/2 z-20 flex h-9 w-9 -translate-x-[35%] -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white sm:h-10 sm:w-10 sm:-translate-x-1/2 sm:text-xl"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={
                nextSlide
              }
              aria-label="Sonraki reklam"
              className="absolute right-0 top-1/2 z-20 flex h-9 w-9 translate-x-[35%] -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white sm:h-10 sm:w-10 sm:translate-x-1/2 sm:text-xl"
            >
              ›
            </button>

            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/85 px-2 py-1.5 shadow-sm backdrop-blur sm:bottom-3 sm:gap-1.5 sm:px-2.5">
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
        </div>
      </div>
    </section>
  );
}

