"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  addPurchaseOrderItem,
  type PurchaseItemActionState,
} from "@/app/admin/purchase-orders/[id]/actions";

type Product = {
  id: number;
  code: string;
  name: string;
  vat: number;
};

type Props = {
  purchaseOrderId: number;
  products: Product[];
};

const initialState: PurchaseItemActionState = {
  success: false,
  message: "",
};

export default function PurchaseOrderItemForm({
  purchaseOrderId,
  products,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const boundAction =
    addPurchaseOrderItem.bind(
      null,
      purchaseOrderId
    );

  const [state, formAction, isPending] =
    useActionState(
      boundAction,
      initialState
    );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-2xl font-bold">
        Ürün Satırı Ekle
      </h2>

      <p className="mt-2 text-gray-500">
        Alış fiyatını KDV hariç olarak
        girin.
      </p>

      {state.message && (
        <div
          role="alert"
          className={`mt-5 rounded-xl border p-4 ${
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

          <p className="mt-2">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
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
            <option value="" disabled>
              Ürün seçiniz
            </option>

            {products.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {product.code} —{" "}
                {product.name} | KDV %
                {product.vat}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Sipariş Miktarı
          </span>

          <input
            name="orderedQuantity"
            type="number"
            min="1"
            step="1"
            placeholder="Örneğin: 100"
            className="w-full rounded-xl border p-4"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            KDV Hariç Alış Fiyatı
          </span>

          <input
            name="unitPrice"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Örneğin: 125.50"
            className="w-full rounded-xl border p-4"
            required
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={
          products.length === 0 ||
          isPending
        }
        className={`mt-6 w-full rounded-xl py-4 font-bold ${
          products.length > 0 &&
          !isPending
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Ürün Ekleniyor..."
          : "Ürünü Satın Almaya Ekle"}
      </button>
    </form>
  );
}