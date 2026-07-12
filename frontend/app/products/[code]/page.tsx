import Header from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { code } = await params;

  const product = await prisma.product.findUnique({
    where: {
      code,
    },
  });

  if (!product) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-slate-100">
          <div className="mx-auto max-w-7xl px-8 py-16">
            <div className="rounded-2xl bg-white p-10 shadow">
              <h1 className="text-3xl font-bold">
                Ürün bulunamadı
              </h1>

              <p className="mt-4 text-gray-500">
                Aranan ürün kodu:{" "}
                <strong className="text-slate-800">
                  {code}
                </strong>
              </p>

              <Link
                href="/products"
                className="mt-6 inline-block rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
              >
                ← Ürünlere Dön
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-7xl px-8 py-16">
          <Link
            href="/products"
            className="font-semibold text-blue-900 hover:underline"
          >
            ← Ürünlere Dön
          </Link>

          <div className="mt-10 grid gap-16 rounded-2xl bg-white p-10 shadow md:grid-cols-2">
            <div className="flex h-[450px] items-center justify-center rounded-2xl bg-slate-200 text-8xl">
              📦
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                {product.category}
              </p>

              <h1 className="mt-3 text-5xl font-bold text-slate-800">
                {product.name}
              </h1>

              <div className="mt-8 space-y-3 text-gray-600">
                <p>
                  <strong>Marka:</strong> {product.brand}
                </p>

                <p>
                  <strong>Ürün kodu:</strong> {product.code}
                </p>

                <p>
                  <strong>Barkod:</strong> {product.barcode}
                </p>

                <p>
                  <strong>Tedarikçi:</strong> {product.supplier}
                </p>

                <p>
                  <strong>KDV:</strong> %{product.vat}
                </p>
              </div>

              <p className="mt-8 text-5xl font-bold text-blue-900">
                {product.price.toFixed(2)} ₺
              </p>

              <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-700">
                <strong>Stok:</strong> {product.stock} adet
              </div>

              <div className="mt-4 rounded-xl bg-slate-100 p-4 text-slate-700">
                {product.ownStock
                  ? "ETKEN deposunda mevcut"
                  : "Tedarikçi stoğundan sevk edilecek"}
              </div>

              <Link
                href="/products"
                className="mt-8 inline-block rounded-xl bg-blue-900 px-10 py-4 text-xl font-bold text-white hover:bg-blue-800"
              >
                Ürünlere Dön
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}