"use client";

import {
  useState,
} from "react";

import {
  useCart,
} from "@/context/CartContext";

type Props = {
  product: {
    id: number;
    code: string;
    name: string;
    price: number;
    vat: number;
    availableStock: number;
  };
};

export default function ProductAddToCartButton({
  product,
}: Props) {
  const { addToCart } =
    useCart();

  const [
    message,
    setMessage,
  ] = useState("");

  const isComingSoon =
    product.price <= 0;

  const isOutOfStock =
    !isComingSoon &&
    product.availableStock <= 0;

  const cannotAddToCart =
    isComingSoon ||
    isOutOfStock;

  function handleAdd() {
    if (cannotAddToCart) {
      return;
    }

    addToCart({
      productId: product.id,
      code: product.code,
      name: product.name,
      unitPrice: product.price,
      vatRate: product.vat,
      availableStock:
        product.availableStock,
      qty: 1,
    });

    setMessage(
      "Ürün sepete eklendi."
    );

    window.setTimeout(
      () =>
        setMessage(""),
      1800
    );
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        disabled={cannotAddToCart}
        onClick={handleAdd}
        className="w-full rounded-xl bg-blue-900 px-8 py-4 text-lg font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isComingSoon
          ? "Yakında Stokta"
          : isOutOfStock
            ? "Stokta Yok"
            : "Sepete Ekle"}
      </button>

      {isComingSoon ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">
          Fiyat ve stok bilgisi tamamlandığında siparişe açılacaktır.
        </p>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-center font-semibold text-green-700"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}