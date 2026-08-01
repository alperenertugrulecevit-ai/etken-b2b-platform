"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { useCart } from "@/context/CartContext";

const categories = [
  {
    title: "Ofis Kırtasiye",
    icon: "📄",
  },
  {
    title: "Teknoloji-Hırdavat",
    icon: "💻",
  },
  {
    title: "Endüstriyel",
    icon: "📦",
  },
  {
    title: "Temizlik ve Hijyen",
    icon: "🧼",
  },
  {
    title: "Gıda Ürünleri",
    icon: "☕",
  },
  {
    title: "İş Güvenliği",
    icon: "🦺",
  },
];

export default function Header() {
  const { cart } = useCart();
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const totalQty = cart.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const closeOnEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [isMenuOpen]);

  const closeMenu = () =>
    setIsMenuOpen(false);

  return (
    <>
      <header className="relative z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              setIsMenuOpen(true)
            }
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#202B38] shadow-sm transition hover:border-[#EF4B23] hover:text-[#EF4B23] lg:hidden"
            aria-label="Menüyü aç"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span className="text-2xl leading-none">
              ☰
            </span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center lg:mr-auto"
            aria-label="Etken ana sayfa"
          >
            <img
              src="/etken-ofis-logo.png"
              alt="Etken Ofis Tedarik Hizmetleri"
              width="267"
              height="210"
              className="h-[66px] w-auto object-contain sm:h-[76px] lg:h-[84px]"
            />
          </Link>

          <nav className="hidden items-center justify-end gap-2 text-[13px] font-bold lg:flex">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-slate-700 transition hover:bg-slate-100 hover:text-[#EF4B23]"
            >
              Ana Sayfa
            </Link>

            <Link
              href="/products"
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-slate-700 transition hover:bg-slate-100 hover:text-[#EF4B23]"
            >
              Ürünler
            </Link>

            <Link
              href="/customer-login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#202B38] px-3.5 text-white transition hover:bg-[#111923]"
            >
              Kurumsal Hesabım
            </Link>

            <Link
              href="/cart"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#EF4B23] px-3.5 text-white transition hover:bg-[#D83D18]"
            >
              Sepet ({totalQty})
            </Link>
          </nav>

          <Link
            href="/cart"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EF4B23] text-xl text-white shadow-sm transition hover:bg-[#D83D18] lg:hidden"
            aria-label={
              "Sepet, " +
              totalQty +
              " ürün"
            }
          >
            🛒
            {totalQty > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#202B38] px-1 text-[10px] font-black text-white">
                {totalQty > 99
                  ? "99+"
                  : totalQty}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div
        className={
          "fixed inset-0 z-50 lg:hidden " +
          (isMenuOpen
            ? "pointer-events-auto"
            : "pointer-events-none")
        }
        aria-hidden={!isMenuOpen}
      >
        <button
          type="button"
          onClick={closeMenu}
          className={
            "absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] transition-opacity duration-200 " +
            (isMenuOpen
              ? "opacity-100"
              : "opacity-0")
          }
          aria-label="Menüyü kapat"
          tabIndex={isMenuOpen ? 0 : -1}
        />

        <aside
          id="mobile-navigation"
          className={
            "absolute inset-y-0 left-0 flex w-[86%] max-w-[360px] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out " +
            (isMenuOpen
              ? "translate-x-0"
              : "-translate-x-full")
          }
          role="dialog"
          aria-modal="true"
          aria-label="Mobil menü"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <img
              src="/etken-ofis-logo.png"
              alt="Etken Ofis"
              width="267"
              height="210"
              className="h-16 w-auto object-contain"
            />

            <button
              type="button"
              onClick={closeMenu}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl text-slate-700"
              aria-label="Menüyü kapat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <nav className="grid gap-2">
              <Link
                href="/"
                onClick={closeMenu}
                className="rounded-xl bg-slate-100 px-4 py-3.5 font-bold text-[#202B38]"
              >
                Ana Sayfa
              </Link>

              <Link
                href="/products"
                onClick={closeMenu}
                className="rounded-xl bg-slate-100 px-4 py-3.5 font-bold text-[#202B38]"
              >
                Tüm Ürünler
              </Link>

              <Link
                href="/customer-login"
                onClick={closeMenu}
                className="rounded-xl bg-[#202B38] px-4 py-3.5 font-bold text-white"
              >
                Kurumsal Hesabım
              </Link>
            </nav>

            <div className="my-5 border-t border-slate-200" />

            <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-[#EF4B23]">
              Kategoriler
            </p>

            <nav className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {categories.map(
                (category) => (
                  <Link
                    key={category.title}
                    href={{
                      pathname:
                        "/products",
                      query: {
                        category:
                          category.title,
                      },
                    }}
                    onClick={closeMenu}
                    className="flex items-center gap-3 bg-white px-4 py-3 transition hover:bg-orange-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg">
                      {category.icon}
                    </span>
                    <strong className="text-sm text-slate-900">
                      {category.title}
                    </strong>
                  </Link>
                )
              )}
            </nav>
          </div>

          <div className="border-t border-slate-200 p-4">
            <Link
              href="/cart"
              onClick={closeMenu}
              className="flex min-h-12 items-center justify-center rounded-xl bg-[#EF4B23] px-4 font-black text-white"
            >
              Sepetim ({totalQty})
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
