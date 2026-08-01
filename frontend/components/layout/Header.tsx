"use client";

import Link from "next/link";

import { useCart } from "@/context/CartContext";

export default function Header() {
  const { cart } = useCart();

  const totalQty = cart.reduce(
    (sum, item) =>
      sum + item.qty,
    0
  );

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center"
          aria-label="Etken ana sayfa"
        >
          <img
            src="/etken-ofis-logo.png"
            alt="Etken Ofis Tedarik Hizmetleri"
            width="267"
            height="210"
            className="h-[72px] w-auto object-contain sm:h-[84px]"
          />
        </Link>

        <nav className="grid grid-cols-2 gap-2 text-[13px] font-bold sm:flex sm:flex-wrap sm:items-center sm:justify-end">
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
      </div>
    </header>
  );
}
