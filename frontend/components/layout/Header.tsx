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
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/"
            className="inline-block text-white"
          >
            <h1 className="cursor-pointer text-3xl font-black tracking-wide sm:text-4xl">
              ETKEN
            </h1>
          </Link>

          <p className="mt-1 text-xs leading-5 text-blue-200 sm:text-sm">
            İşletmeler için Akıllı Satın Alma Platformu
          </p>
        </div>

        <nav className="grid w-full grid-cols-2 gap-2 text-sm font-semibold sm:gap-3 lg:flex lg:w-auto lg:flex-wrap lg:items-center lg:gap-x-5">
          <Link
            href="/"
            className="flex min-h-11 items-center justify-center rounded-xl border border-blue-700 px-3 py-2 text-center text-white hover:bg-blue-800 hover:text-blue-100 lg:min-h-0 lg:border-0 lg:px-0 lg:py-0"
          >
            Ana Sayfa
          </Link>

          <Link
            href="/products"
            className="flex min-h-11 items-center justify-center rounded-xl border border-blue-700 px-3 py-2 text-center text-white hover:bg-blue-800 hover:text-blue-100 lg:min-h-0 lg:border-0 lg:px-0 lg:py-0"
          >
            Ürünler
          </Link>

          <Link
            href="/customer-login"
            className="flex min-h-12 items-center justify-center rounded-xl bg-slate-800 px-3 py-3 text-center font-bold text-white hover:bg-slate-700 sm:px-5"
          >
            👤 Kurumsal Hesabım
          </Link>

          <Link
            href="/cart"
            className="flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-3 py-3 text-center font-bold text-white hover:bg-orange-600 sm:px-5"
          >
            🛒 Sepet ({totalQty})
          </Link>
        </nav>
      </div>
    </header>
  );
}