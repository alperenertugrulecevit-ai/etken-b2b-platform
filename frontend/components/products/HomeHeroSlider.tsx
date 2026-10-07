"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

const AUTO_CHANGE_MS = 6000;

const slides = [
  { src: "/home-hero/etken-hero-01.jpg", alt: "Etken Ofis - ofisiniz için tüm ihtiyaçlar tek yerde" },
  { src: "/home-hero/etken-hero-02.jpg", alt: "Etken Ofis - kurumsal tedarik ürünleri" },
] as const;

type HomeHeroSliderProps = {
  productCount?: number;
  featuredProducts?: Array<{
    id: number;
    code: string;
    name: string;
    brand: string;
    imageUrl: string | null;
    price: number;
    vat: number;
    availableStock: number;
  }>;
};

export default function HomeHeroSlider(_props: HomeHeroSliderProps = {}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedSlides, setFailedSlides] = useState<Record<number, boolean>>({});

  const nextSlide = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slides.length);
  }, []);

  const previousSlide = useCallback(() => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(nextSlide, AUTO_CHANGE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, nextSlide]);

  return (
    <section className="bg-white">
      <div className="w-full px-3 pb-1 pt-1 sm:px-4 lg:px-5">
        <div
          className="relative mx-auto w-full max-w-[1600px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative aspect-[1600/260] min-h-[150px] max-h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            {slides.map((slide, index) => (
              <div key={slide.src} className={`absolute inset-0 transition-opacity duration-500 ${index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                {!failedSlides[index] ? (
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className="h-full w-full object-cover object-center"
                    draggable={false}
                    onError={() => setFailedSlides((current) => ({ ...current, [index]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-between overflow-hidden bg-gradient-to-r from-[#F4F8FF] via-white to-[#FFF3E8] px-8 sm:px-12 lg:px-20">
                    <div className="max-w-2xl">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#EF4B23]">ETKEN OFİS</p>
                      <h2 className="mt-3 text-2xl font-black leading-tight text-[#071729] sm:text-3xl lg:text-4xl">
                        {index === 0 ? "Ofisiniz için tüm ihtiyaçlar tek yerde!" : "Kurumsal tedarikte güçlü çözümler"}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm font-semibold text-slate-600 sm:text-base">
                        Kırtasiye, temizlik, gıda, ambalaj, iş güvenliği ve teknoloji ürünleri tek noktada.
                      </p>
                      <Link href="/products" className="mt-5 inline-flex rounded-xl bg-[#EF4B23] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#D83D18]">
                        Alışverişe Başla →
                      </Link>
                    </div>
                    <div className="hidden h-40 w-40 shrink-0 items-center justify-center rounded-full bg-white/80 text-center text-xl font-black text-[#0B3B88] shadow-lg md:flex lg:h-52 lg:w-52">
                      İşiniz için<br />Güçlü Çözümler
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={previousSlide} aria-label="Önceki reklam" className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-[35%] -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white sm:-translate-x-1/2">‹</button>
          <button type="button" onClick={nextSlide} aria-label="Sonraki reklam" className="absolute right-0 top-1/2 z-20 flex h-10 w-10 translate-x-[35%] -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white sm:translate-x-1/2">›</button>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur">
            {slides.map((slide, index) => (
              <button key={slide.src} type="button" onClick={() => setActiveIndex(index)} aria-label={`Reklam ${index + 1}`} className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-5 bg-[#EF4B23]" : "w-2 bg-slate-300 hover:bg-slate-400"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
