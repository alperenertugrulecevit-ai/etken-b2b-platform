import { products } from "@/data/products";
import Link from "next/link";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export default async function ProductDetail({ params }: Props) {
  const { code } = await params;

  const product = products.find(
    (p) => p.code === code
  );

  if (!product) {
    return (
      <main className="max-w-7xl mx-auto p-10">
        <h1 className="text-3xl font-bold">
          Ürün Bulunamadı
        </h1>

        <p className="mt-4 text-gray-600">
          Aranan ürün kodu: <strong>{code}</strong>
        </p>

        <Link
          href="/products"
          className="text-blue-700 mt-5 inline-block"
        >
          ← Ürünlere Dön
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-16 px-8">

      <Link
        href="/products"
        className="text-blue-700"
      >
        ← Ürünlere Dön
      </Link>

      <div className="grid md:grid-cols-2 gap-16 mt-10">

        <div className="bg-slate-200 rounded-2xl h-[450px] flex items-center justify-center text-8xl">
          📦
        </div>

        <div>

          <h1 className="text-5xl font-bold">
            {product.name}
          </h1>

          <p className="mt-5 text-xl text-gray-500">
            Marka: {product.brand}
          </p>

          <p className="mt-2 text-gray-500">
            Ürün Kodu: {product.code}
          </p>

          <p className="mt-8 text-5xl text-blue-900 font-bold">
            {product.price.toFixed(2)} ₺
          </p>

          <p className="mt-5 text-green-600 text-xl">
            Stok: {product.stock}
          </p>

          <button className="mt-10 bg-blue-900 text-white px-10 py-4 rounded-xl text-xl">
            Sepete Ekle
          </button>

        </div>

      </div>

    </main>
  );
}