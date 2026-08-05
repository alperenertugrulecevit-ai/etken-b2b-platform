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
  const { code } = await params;

  const product =
    await prisma.product.findFirst({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,
        companyId:
          B2B_CONSTANTS.COMPANY_ID,
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

  const availableStock = Math.max(
    0,
    product.stock -
      product.reservedStock
  );

  const grossPrice =
    product.price *
    (1 + product.vat / 100);

    const isComingSoon =
  product.price <= 0;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#202B38] transition hover:text-[#EF4B23]"
          >
            <span aria-hidden="true">
              ←
            </span>
            Ürünlere Dön
          </Link>

          <article className="mt-4 grid gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] md:gap-8 md:p-6 lg:p-8">
            <div className="flex h-48 items-center justify-center rounded-xl bg-slate-100 text-6xl sm:h-64 sm:text-7xl md:h-full md:min-h-[360px]">
              📦
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#EF4B23]">
                {product.category}
              </p>

              <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {product.name}
              </h1>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:text-sm">
                <p className="min-w-0">
                  <strong className="block text-slate-900">
                    Marka
                  </strong>

                  <span className="mt-0.5 block truncate">
                    {product.brand}
                  </span>
                </p>

                <p className="min-w-0">
                  <strong className="block text-slate-900">
                    Ürün kodu
                  </strong>

                  <span className="mt-0.5 block truncate">
                    {product.code}
                  </span>
                </p>

                <p className="min-w-0">
                  <strong className="block text-slate-900">
                    Barkod
                  </strong>

                  <span className="mt-0.5 block truncate">
                    {product.barcode ||
                      "-"}
                  </span>
                </p>

                <p>
                  <strong className="block text-slate-900">
                    KDV
                  </strong>

                  <span className="mt-0.5 block">
                    %{product.vat}
                  </span>
                </p>
              </div>

<div
  className={`mt-4 rounded-xl border p-4 ${
    isComingSoon
      ? "border-amber-200 bg-amber-50"
      : "border-orange-100 bg-orange-50"
  }`}
>
  {isComingSoon ? (
    <>
      <p className="text-2xl font-black text-amber-700 sm:text-3xl">
        Yakında Stokta
      </p>

      <p className="mt-2 text-sm text-amber-800">
        Ürünün fiyat ve stok bilgileri hazırlanıyor.
        Tedarik süreci tamamlandığında satışa açılacaktır.
      </p>
    </>
  ) : (
    <>
      <p className="text-2xl font-black text-[#EF4B23] sm:text-3xl">
        {formatCurrency(
          product.price
        )}{" "}
        ₺
      </p>

      <p className="mt-0.5 text-xs text-slate-500">
        KDV hariç birim fiyat
      </p>

      <p className="mt-2 text-sm font-bold text-slate-800">
        KDV dâhil:{" "}
        {formatCurrency(
          grossPrice
        )}{" "}
        ₺
      </p>
    </>
  )}
</div>

<div
  className={
    "mt-3 rounded-xl px-4 py-3 text-sm font-bold " +
    (isComingSoon
      ? "bg-amber-50 text-amber-700"
      : availableStock > 0
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-700")
  }
>
  {isComingSoon
    ? "Fiyat ve stok bilgisi yakında yayınlanacaktır."
    : availableStock > 0
      ? `Kullanılabilir stok: ${availableStock} adet`
      : "Ürün şu anda stokta bulunmuyor."}
</div>

              <div className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {product.ownStock
                  ? "ETKEN deposundan sevk edilir."
                  : "Tedarikçi stoğundan tedarik edilir."}
              </div>

              <div className="mt-4">
                <ProductAddToCartButton
                  product={{
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    price:
                      product.price,
                    vat: product.vat,
                    availableStock,
                  }}
                />
              </div>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}