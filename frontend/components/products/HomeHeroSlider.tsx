"use client";

import { useCallback, useEffect, useState } from "react";

const AUTO_CHANGE_MS = 6000;

const slides = [
  { src: "/home-hero/etken-hero-01.png", alt: "Etken Ofis - Ofisiniz için tüm ihtiyaçlar tek yerde" },
  { src: "/home-hero/etken-hero-02.png", alt: "Etken Ofis - Kurumsal ofis ürünleri" },
] as const;

export default function HomeHeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
      <div className="w-full px-3 pb-2 pt-3 sm:px-4 lg:px-5">
        <div
          className="relative mx-auto w-full max-w-[1600px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative aspect-[5.35/1] min-h-[210px] max-h-[285px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            {slides.map((slide, index) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
                  index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              />
            ))}
          </div>

          <button type="button" onClick={previousSlide} aria-label="Önceki reklam" className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white">‹</button>
          <button type="button" onClick={nextSlide} aria-label="Sonraki reklam" className="absolute right-0 top-1/2 z-20 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-[#202B38] shadow-lg transition hover:bg-[#202B38] hover:text-white">›</button>

          <div className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur">
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Reklam ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? "w-5 bg-[#EF4B23]" : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
