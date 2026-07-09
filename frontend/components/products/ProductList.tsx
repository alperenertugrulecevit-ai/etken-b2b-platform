"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

type Product = {
  id: number;
  code: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  supplier: string;
  price: number;
  stock: number;
  vat: number;
  ownStock: boolean;
};

export default function ProductList({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tümü");

  const { addToCart } = useCart();

  const categories = ["Tümü", ...new Set(products.map((p) => p.category))];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = search.toLowerCase();

      const searchMatch =
        product.name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        product.code.toLowerCase().includes(q);

      const categoryMatch =
        category === "Tümü" || product.category === category;

      return searchMatch && categoryMatch;
    });
  }, [search, category, products]);

  return (
    <div className="grid grid-cols-12 gap-8 mt-8">
      <aside className="col-span-3 bg-white rounded-2xl p-6 shadow">
        <h2 className="text-xl font-bold mb-6">Kategoriler</h2>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`w-full text-left p-3 rounded-lg mb-2 transition ${
              category === cat ? "bg-blue-900 text-white" : "hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </aside>

      <section className="col-span-9">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürün, Marka veya Kod Ara..."
          className="w-full bg-white rounded-xl p-4 shadow outline-none mb-8"
        />

        <div className="text-gray-500 mb-5">
          {filteredProducts.length} ürün bulundu
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.code}
              className="bg-white rounded-2xl p-5 shadow hover:shadow-xl transition"
            >
              <Link href={`/products/${product.code}`}>
                <div className="h-36 bg-slate-200 rounded-xl flex items-center justify-center text-5xl">
                  📦
                </div>

                <h2 className="font-bold mt-5">{product.name}</h2>

                <p className="text-gray-500 mt-2">{product.brand}</p>

                <p className="text-sm text-gray-400">{product.category}</p>

                <p className="mt-3 text-green-600">Stok : {product.stock}</p>

                <p className="text-2xl text-blue-900 font-bold mt-3">
                  {product.price.toFixed(2)} ₺
                </p>
              </Link>

              <button
                onClick={() =>
                  addToCart({
                    code: product.code,
                    name: product.name,
                    price: product.price,
                    qty: 1,
                  })
                }
                className="mt-5 w-full bg-blue-900 text-white py-3 rounded-xl hover:bg-blue-800"
              >
                Sepete Ekle
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}