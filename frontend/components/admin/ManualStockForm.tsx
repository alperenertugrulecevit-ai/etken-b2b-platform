"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  createManualStockMovement,
  type ManualStockActionState,
} from "@/app/admin/stock/manual/actions";

type Product = {
  id: number;
  code: string;
  name: string;
  stock: number;
  reservedStock: number;
};

type Props = {
  products: Product[];
};

const initialState: ManualStockActionState = {
  success: false,
  message: "",
};

export default function ManualStockForm({
  products,
}: Props) {
  const [state, formAction, isPending] =
    useActionState(
      createManualStockMovement,
      initialState
    );

  const formRef =
    useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="h-fit rounded-2xl bg-white p-8 shadow"
    >
      <h2 className="text-2xl font-bold">
        Yeni Stok Hareketi
      </h2>

      <p className="mt-2 text-gray-500">
        Kaydetme işleminden sonra ürün
        stoğu ve hareket geçmişi birlikte
        güncellenecektir.
      </p>

      {state.message && (
        <div
          role="alert"
          className={`mt-6 rounded-xl border p-5 ${
            state.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-bold">
            {state.success
              ? "İşlem başarılı"
              : "İşlem gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success &&
            state.productId && (
              <Link
                href={`/admin/products/${state.productId}`}
                className="mt-4 inline-block font-semibold underline"
              >
                Ürün detayını ve hareketi aç →
              </Link>
            )}
        </div>
      )}

      <div className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            İşlem Tipi
          </span>

          <select
            name="movementType"
            defaultValue=""
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option
              value=""
              disabled
            >
              İşlem tipi seçiniz
            </option>

            <option value="PURCHASE_RECEIPT">
              Mal Kabul
            </option>

            <option value="MANUAL_IN">
              Manuel Stok Girişi
            </option>

            <option value="MANUAL_OUT">
              Manuel Stok Çıkışı
            </option>

            <option value="COUNT_INCREASE">
              Sayım Fazlası
            </option>

            <option value="COUNT_DECREASE">
              Sayım Eksiği
            </option>

            <option value="SALE_RETURN">
              Satış İadesi
            </option>

            <option value="INITIAL_STOCK">
              Açılış Stoğu
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Ürün
          </span>

          <select
            name="productId"
            defaultValue=""
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option
              value=""
              disabled
            >
              Ürün seçiniz
            </option>

            {products.map((product) => {
              const availableStock =
                product.stock -
                product.reservedStock;

              return (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.code} —{" "}
                  {product.name} |
                  Fiziksel:{" "}
                  {product.stock} |
                  Rezerve:{" "}
                  {product.reservedStock} |
                  Kullanılabilir:{" "}
                  {availableStock}
                </option>
              );
            })}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Miktar
          </span>

          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            placeholder="Örneğin: 25"
            className="w-full rounded-xl border p-4"
            required
          />

          <p className="mt-2 text-sm text-gray-500">
            Miktarı pozitif girin. İşlem
            tipine göre sistem giriş veya
            çıkış olarak kaydeder.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Belge Numarası
          </span>

          <input
            name="documentNumber"
            placeholder="Örneğin: IRS-2026-00125"
            className="w-full rounded-xl border p-4"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={4}
            placeholder="İşlemin nedenini veya operasyon açıklamasını yazın."
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={
          products.length === 0 ||
          isPending
        }
        className={`mt-8 w-full rounded-xl py-4 font-bold ${
          products.length > 0 &&
          !isPending
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-gray-300 text-gray-500"
        }`}
      >
        {isPending
          ? "İşlem Kaydediliyor..."
          : "Stok Hareketini Kaydet"}
      </button>
    </form>
  );
}