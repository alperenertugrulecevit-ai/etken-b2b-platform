"use client";

import Link from "next/link";

import ProductImage from "@/components/products/ProductImage";

import {
  useCart,
} from "@/context/CartContext";

type Props = {
  product: {
    id: number;
    code: string;
    name: string;
    brand: string;
    imageUrl: string | null;
    price: number;
    vat: number;
    availableStock: number;
  };

  badge?: string;
};

function formatCurrency(
  value: number,
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  );
}

export default function HomeProductCard({
  product,
  badge,
}: Props) {
  const {
    addToCart,
  } = useCart();

  const grossPrice =
    product.price *
    (1 +
      product.vat /
        100);

  const isComingSoon =
    product.price <= 0;

  const isOutOfStock =
    !isComingSoon &&
    product.availableStock <=
      0;

  function handleAdd() {
    if (
      isComingSoon ||
      isOutOfStock
    ) {
      return;
    }

    addToCart({
      productId:
        product.id,
      code:
        product.code,
      name:
        product.name,
      unitPrice:
        product.price,
      vatRate:
        product.vat,
      availableStock:
        product.availableStock,
      qty: 1,
    });
  }

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl">
      {badge ? (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#EF4B23] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow">
          {badge}
        </span>
      ) : null}

      <Link
        href={`/products/${product.code}`}
        className="block"
      >
        <div className="bg-white p-3">
          <ProductImage
            imageUrl={
              product.imageUrl
            }
            productName={
              product.name
            }
            className="h-40 rounded-xl p-3 transition duration-300 group-hover:scale-[1.03] sm:h-44"
            fallbackClassName="h-40 rounded-xl text-4xl sm:h-44"
          />
        </div>

        <div className="px-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#EF4B23]">
            {
              product.brand
            }
          </p>

          <h3 className="mt-1.5 line-clamp-2 min-h-11 text-sm font-bold leading-5 text-slate-900">
            {
              product.name
            }
          </h3>

          <p className="mt-1 text-[11px] text-slate-400">
            {
              product.code
            }
          </p>
        </div>
      </Link>

      <div className="mt-auto px-4 pb-4 pt-3">
        {isComingSoon ? (
          <div>
            <p className="text-base font-black text-amber-700">
              Yakında Stokta
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Fiyat bilgisi
              hazırlanıyor
            </p>
          </div>
        ) : (
          <>
            <p className="text-xl font-black text-[#EF4B23]">
              {formatCurrency(
                grossPrice,
              )}{" "}
              ₺
            </p>

            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              KDV dahil
            </p>
          </>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              isComingSoon
                ? "bg-amber-50 text-amber-700"
                : isOutOfStock
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isComingSoon
              ? "Hazırlanıyor"
              : isOutOfStock
                ? "Stokta Yok"
                : "Stokta"}
          </span>

          {!isComingSoon &&
          !isOutOfStock ? (
            <span className="text-[10px] font-semibold text-slate-400">
              {
                product.availableStock
              }{" "}
              adet
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={
            handleAdd
          }
          disabled={
            isComingSoon ||
            isOutOfStock
          }
          className="mt-3 w-full rounded-xl bg-[#202B38] py-2.5 text-sm font-black text-white transition hover:bg-[#EF4B23] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isComingSoon
            ? "Yakında"
            : isOutOfStock
              ? "Stokta Yok"
              : "Sepete Ekle"}
        </button>
      </div>
    </article>
  );
}