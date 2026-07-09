"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function Header() {
  const { cart } = useCart();

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">

        <div>
          <Link href="/">
            <h1 className="text-4xl font-bold tracking-wide cursor-pointer">
              ETKEN
            </h1>
          </Link>

          <p className="text-blue-200">
            İşletmeler için Akıllı Satın Alma Platformu
          </p>
        </div>

        <nav className="flex items-center gap-8">

          <Link href="/">Ana Sayfa</Link>

          <Link href="/products">Ürünler</Link>

          <a href="#">Kampanyalar</a>

          <a href="#">İletişim</a>

          <button className="bg-white text-blue-900 px-5 py-3 rounded-xl font-bold">
            B2B Giriş
          </button>

          <Link
            href="/cart"
            className="bg-orange-500 px-5 py-3 rounded-xl font-bold hover:bg-orange-600"
          >
            🛒 Sepet ({totalQty})
          </Link>

        </nav>

      </div>
    </header>
  );
}