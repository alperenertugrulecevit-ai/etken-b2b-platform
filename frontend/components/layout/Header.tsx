"use client";

import Link from "next/link";

import { useCart } from "@/context/CartContext";

export default function Header() {
  const { cart } = useCart();

  const totalQty = cart.reduce(
    (sum, item) =>
      sum + item.qty,
    0,
  );

  return (
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/"
            className="inline-block text-white"
          >
            <h1 className="cursor-pointer text-4xl font-black tracking-wide">
              ETKEN
            </h1>
          </Link>

          <p className="mt-1 text-sm text-blue-200">
            İşletmeler için Akıllı Satın Alma Platformu
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold">
          <Link
            href="/"
            className="text-white hover:text-blue-200"
          >
            Ana Sayfa
          </Link>

          <Link
            href="/products"
            className="text-white hover:text-blue-200"
          >
            Ürünler
          </Link>

          <Link
            href="/customer-login"
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-700"
          >
            👤 Kurumsal Hesabım
          </Link>

          <Link
            href="/cart"
            className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
          >
            🛒 Sepet ({totalQty})
          </Link>
        </nav>
      </div>
    </header>
  );
}
