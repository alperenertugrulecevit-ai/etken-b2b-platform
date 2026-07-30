import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/layout/Header";
import ProductAddToCartButton from "@/components/products/ProductAddToCartButton";
import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

export default async function ProductDetailPage({
  params,
}: Props) {
  const { code } =
    await params;

  const product =
    await prisma.product.findFirst({
      where: {
        tenantId:
          B2B_CONSTANTS
            .TENANT_ID,
        companyId:
          B2B_CONSTANTS
            .COMPANY_ID,
        code,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        barcode: true,
        name: true,
        brand: true,
        category: true,
        supplier: true,
        price: true,
        stock: true,
        reservedStock: true,
        vat: true,
        ownStock: true,
      },
    });

  if (!product) {
    notFound();
  }

  const availableStock =
    Math.max(
      0,
      product.stock -
        product.reservedStock
    );

  const grossPrice =
    product.price *
    (1 + product.vat / 100);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className="font-semibold text-blue-900 hover:underline"
          >
            ← Ürünlere Dön
          </Link>

          <div className="mt-8 grid gap-12 rounded-2xl bg-white p-6 shadow md:grid-cols-2 md:p-10">
            <div className="flex min-h-80 items-center justify-center rounded-2xl bg-slate-100 text-8xl">
              📦
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-900">
                {product.category}
              </p>

              <h1 className="mt-3 text-4xl font-black text-slate-900 md:text-5xl">
                {product.name}
              </h1>

              <div className="mt-7 grid gap-3 text-slate-600 sm:grid-cols-2">
                <p>
                  <strong>
                    Marka:
                  </strong>{" "}
                  {product.brand}
                </p>

                <p>
                  <strong>
                    Ürün kodu:
                  </strong>{" "}
                  {product.code}
                </p>

                <p>
                  <strong>
                    Barkod:
                  </strong>{" "}
                  {product.barcode}
                </p>

                <p>
                  <strong>
                    KDV:
                  </strong>{" "}
                  %{product.vat}
                </p>
              </div>

              <div className="mt-8 rounded-2xl bg-blue-50 p-5">
                <p className="text-4xl font-black text-blue-900">
                  {formatCurrency(
                    product.price
                  )}{" "}
                  ₺
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  KDV hariç birim
                  fiyat
                </p>

                <p className="mt-3 font-bold text-slate-800">
                  KDV dâhil:{" "}
                  {formatCurrency(
                    grossPrice
                  )}{" "}
                  ₺
                </p>
              </div>

              <div
                className={`mt-5 rounded-xl p-4 font-semibold ${
                  availableStock > 0
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {availableStock > 0
                  ? `Kullanılabilir stok: ${availableStock} adet`
                  : "Ürün şu anda stokta bulunmuyor."}
              </div>

              <div className="mt-4 rounded-xl bg-slate-100 p-4 text-slate-700">
                {product.ownStock
                  ? "ETKEN deposundan sevk edilir."
                  : "Tedarikçi stoğundan tedarik edilir."}
              </div>

              <ProductAddToCartButton
                product={{
                  id: product.id,
                  code:
                    product.code,
                  name:
                    product.name,
                  price:
                    product.price,
                  vat:
                    product.vat,
                  availableStock,
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
