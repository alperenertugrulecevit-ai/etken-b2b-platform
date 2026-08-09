"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  useCart,
} from "@/context/CartContext";

type CategoryIconType =
  | "office"
  | "cleaning"
  | "food"
  | "package"
  | "safety";

type CategoryItem = {
  title: string;
  href: string;
  icon: CategoryIconType;
  iconClassName: string;
};

const categories: CategoryItem[] = [
  {
    title: "Ofis Kırtasiye",
    href:
      "/products?category=Ofis%20K%C4%B1rtasiye",
    icon: "office",
    iconClassName:
      "bg-blue-500 text-white",
  },
  {
    title: "Temizlik ve Hijyen",
    href:
      "/products?category=Temizlik%20ve%20Hijyen",
    icon: "cleaning",
    iconClassName:
      "bg-cyan-500 text-white",
  },
  {
    title: "Gıda ve Mutfak",
    href:
      "/products?category=G%C4%B1da%20ve%20Mutfak",
    icon: "food",
    iconClassName:
      "bg-orange-500 text-white",
  },
  {
    title:
      "Ambalaj ve Paketleme",
    href:
      "/products?category=Ambalaj%20ve%20Paketleme",
    icon: "package",
    iconClassName:
      "bg-violet-500 text-white",
  },
  {
    title: "İş Güvenliği",
    href:
      "/products?category=%C4%B0%C5%9F%20G%C3%BCvenli%C4%9Fi",
    icon: "safety",
    iconClassName:
      "bg-emerald-500 text-white",
  },
];

export default function Header() {
  const {
    cart,
  } = useCart();

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false);

  const totalQty =
    cart.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.qty,
      0,
    );

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setIsMenuOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [
    isMenuOpen,
  ]);

  function closeMenu() {
    setIsMenuOpen(
      false,
    );
  }

  return (
    <>
      <div className="bg-[#071729] text-white">
        <div className="mx-auto flex min-h-9 max-w-[1600px] items-center justify-between gap-4 px-4 text-[11px] font-semibold sm:px-6">
          <div className="flex items-center gap-7">
            <span className="flex items-center gap-2">
              <StoreIcon />

              Kurumsal tedarikte hızlı ve güvenilir çözüm
            </span>

            <span className="hidden items-center gap-2 text-slate-300 md:flex">
              <TruckSmallIcon />

              İstanbul içi hızlı teslimat
            </span>
          </div>

          <div className="hidden items-center gap-7 sm:flex">
            <Link
              href="/contact"
              className="flex items-center gap-2 transition hover:text-orange-300"
            >
              <PhoneIcon />
              İletişim
            </Link>

            <Link
              href="/account/orders"
              className="flex items-center gap-2 transition hover:text-orange-300"
            >
              <OrderIcon />
              Sipariş Takibi
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-3 py-2 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={() =>
              setIsMenuOpen(
                true,
              )
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-[#202B38] lg:hidden"
            aria-label="Menüyü aç"
          >
            ☰
          </button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 sm:gap-3"
            aria-label="Etken Ofis Ana Sayfa"
          >
            <img
              src="/etken-ofis-logo.png"
              alt="Etken Ofis"
              width="72"
              height="72"
              className="h-[46px] w-[46px] shrink-0 object-contain sm:h-[56px] sm:w-[56px] lg:h-[70px] lg:w-[70px]"
            />

            <div className="min-w-0">
              <div className="flex items-baseline whitespace-nowrap">
                <span className="text-[16px] font-black leading-none tracking-[-0.04em] text-[#071729] sm:text-[22px] lg:text-[32px]">
                  ETKEN
                </span>

                <span className="ml-1 text-[16px] font-black leading-none tracking-[-0.04em] text-[#EF4B23] sm:text-[22px] lg:text-[32px]">
                  OFİS
                </span>
              </div>

              <div className="mt-1 whitespace-nowrap text-[6px] font-bold uppercase tracking-[0.20em] text-slate-700 sm:text-[8px] sm:tracking-[0.25em] lg:text-[10px] lg:tracking-[0.31em]">
                Kurumsal Tedarik
              </div>
            </div>
          </Link>

          <form
            action="/products"
            className="hidden min-w-0 flex-1 lg:flex"
          >
            <div className="flex w-full overflow-hidden rounded-xl border border-[#EF4B23] bg-white shadow-sm">
              <input
                type="search"
                name="q"
                placeholder="Ürün, marka, barkod veya ürün kodu ara..."
                className="min-w-0 flex-1 px-5 py-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                className="min-w-28 bg-[#EF4B23] px-6 text-xs font-black text-white transition hover:bg-[#D83D18]"
              >
                ARA
              </button>
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <Link
              href="/account"
              className="hidden min-h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 transition hover:border-violet-300 hover:bg-violet-50 md:flex"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <UserIcon />
              </span>

              <span>
                <small className="block text-[9px] font-semibold text-violet-600">
                  Kurumsal
                </small>

                <strong className="block text-[12px] text-[#202B38]">
                  Hesabım
                </strong>
              </span>
            </Link>

            <Link
              href="/cart"
              className="relative flex min-h-11 items-center gap-2.5 rounded-xl bg-[#EF4B23] px-4 text-white shadow-sm transition hover:bg-[#D83D18]"
            >
              <CartIcon />

              <span className="hidden sm:block">
                <small className="block text-[9px] font-semibold text-orange-100">
                  Sepetim
                </small>

                <strong className="block text-[12px]">
                  {totalQty} ürün
                </strong>
              </span>

              {totalQty >
                0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#202B38] px-1 text-[9px] font-black">
                  {totalQty >
                  99
                    ? "99+"
                    : totalQty}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 lg:hidden">
          <form
            action="/products"
            className="mx-auto flex max-w-[1600px] px-4 py-2 sm:px-6"
          >
            <div className="flex w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
              <input
                type="search"
                name="q"
                placeholder="Ürün veya marka ara..."
                className="min-w-0 flex-1 bg-transparent px-4 py-2 text-xs outline-none"
              />

              <button
                type="submit"
                className="bg-[#EF4B23] px-4 text-xs font-black text-white"
              >
                ARA
              </button>
            </div>
          </form>
        </div>

        <div className="hidden border-t border-slate-100 bg-white lg:block">
          <nav className="mx-auto flex min-h-14 max-w-[1600px] items-stretch px-3 sm:px-4 lg:px-5">
            <Link
              href="/products"
              className="mr-5 flex shrink-0 items-center gap-2.5 rounded-t-lg bg-[#071729] px-6 text-[13px] font-black text-white transition hover:bg-[#14283D]"
            >
              <MenuIcon />
              Tüm Ürünler
            </Link>

            <div className="flex min-w-0 flex-1 items-stretch justify-start gap-2 xl:gap-4">
              {categories.map(
                (
                  category,
                ) => (
                  <Link
                    key={
                      category.title
                    }
                    href={
                      category.href
                    }
                    className="group flex min-h-14 shrink-0 items-center gap-2.5 px-3 text-[12px] font-bold text-slate-800 transition hover:text-[#EF4B23] xl:px-4 xl:text-[13px]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition duration-200 group-hover:scale-110 ${category.iconClassName}`}
                    >
                      <CategoryNavIcon
                        type={
                          category.icon
                        }
                      />
                    </span>

                    <span>
                      {
                        category.title
                      }
                    </span>
                  </Link>
                ),
              )}
            </div>

            <Link
              href="/contact"
              className="ml-auto flex min-h-14 shrink-0 items-center gap-2 px-4 text-[12px] font-black text-[#EF4B23] xl:text-[13px]"
            >
              <LockSmallIcon />
              Toplu Alım
            </Link>
          </nav>
        </div>
      </header>

      <div
        className={
          "fixed inset-0 z-50 lg:hidden " +
          (isMenuOpen
            ? "pointer-events-auto"
            : "pointer-events-none")
        }
        aria-hidden={
          !isMenuOpen
        }
      >
        <button
          type="button"
          onClick={
            closeMenu
          }
          className={
            "absolute inset-0 bg-slate-950/55 transition-opacity " +
            (isMenuOpen
              ? "opacity-100"
              : "opacity-0")
          }
          aria-label="Menüyü kapat"
        />

        <aside
          className={
            "absolute inset-y-0 left-0 flex w-[88%] max-w-[370px] flex-col bg-white shadow-2xl transition-transform " +
            (isMenuOpen
              ? "translate-x-0"
              : "-translate-x-full")
          }
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <Link
              href="/"
              onClick={
                closeMenu
              }
              className="flex items-center gap-2.5"
            >
              <img
                src="/etken-ofis-logo.png"
                alt="Etken Ofis"
                width="56"
                height="56"
                className="h-12 w-12 object-contain"
              />

              <div>
                <div className="flex items-baseline">
                  <strong className="text-lg font-black text-[#071729]">
                    ETKEN
                  </strong>

                  <strong className="ml-1 text-lg font-black text-[#EF4B23]">
                    OFİS
                  </strong>
                </div>

                <span className="block text-[7px] font-bold uppercase tracking-[0.24em] text-slate-600">
                  Kurumsal Tedarik
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={
                closeMenu
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl"
              aria-label="Menüyü kapat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-2">
              <Link
                href="/"
                onClick={
                  closeMenu
                }
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold"
              >
                Ana Sayfa
              </Link>

              <Link
                href="/products"
                onClick={
                  closeMenu
                }
                className="rounded-xl bg-[#071729] px-4 py-3 text-sm font-bold text-white"
              >
                Tüm Ürünler
              </Link>

              <Link
                href="/account"
                onClick={
                  closeMenu
                }
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold"
              >
                Kurumsal Hesabım
              </Link>
            </div>

            <p className="mb-2 mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#EF4B23]">
              Kategoriler
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              {categories.map(
                (
                  category,
                ) => (
                  <Link
                    key={
                      category.title
                    }
                    href={
                      category.href
                    }
                    onClick={
                      closeMenu
                    }
                    className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800 last:border-0 hover:bg-orange-50"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${category.iconClassName}`}
                    >
                      <CategoryNavIcon
                        type={
                          category.icon
                        }
                      />
                    </span>

                    {
                      category.title
                    }
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 p-4">
            <Link
              href="/cart"
              onClick={
                closeMenu
              }
              className="flex min-h-12 items-center justify-center rounded-xl bg-[#EF4B23] text-sm font-black text-white"
            >
              Sepetim ({totalQty})
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function CategoryNavIcon({
  type,
}: {
  type: CategoryIconType;
}) {
  const className =
    "h-5 w-5";

  if (
    type ===
    "office"
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
        <path d="M5 19h14" />
        <path d="M7 3h10v14H7z" />
        <path d="M9 6h6M9 10h6M9 14h4" />
      </svg>
    );
  }

  if (
    type ===
    "cleaning"
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
        <path d="M10 3h4v4l3 4v10H7V11l3-4z" />
        <path d="M8 14h8" />
        <path d="M16 5l3-2M17 8h3" />
      </svg>
    );
  }

  if (
    type ===
    "food"
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
        <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
        <path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" />
        <path d="M8 3c0 1 1 1.5 1 2.5" />
        <path d="M12 3c0 1 1 1.5 1 2.5" />
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

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 4h2l2.2 10h10.9l2-7H7" />

      <circle
        cx="9"
        cy="19"
        r="1.5"
      />

      <circle
        cx="18"
        cy="19"
        r="1.5"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M5 8l1-4h12l1 4" />
      <path d="M4 8h16v12H4z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function TruckSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" />

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

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M6 3l4 4-2 3c1.4 2.7 3.3 4.6 6 6l3-2 4 4-2 3c-8 1-16-7-16-16z" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M5 4h14v16H5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function LockSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}