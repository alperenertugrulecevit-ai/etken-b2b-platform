"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  updatePurchaseOrderItem,
  type PurchaseItemActionState,
} from "@/app/admin/purchase-orders/[id]/actions";

type Props = {
  purchaseOrderId: number;
  purchaseOrderItemId: number;
  productName: string;
  initialOrderedQuantity: number;
  initialUnitPrice: number;
};

const initialState:
  PurchaseItemActionState = {
  success: false,
  message: "",
};

export default function PurchaseOrderItemEditForm({
  purchaseOrderId,
  purchaseOrderItemId,
  productName,
  initialOrderedQuantity,
  initialUnitPrice,
}: Props) {
  const [isOpen, setIsOpen] =
    useState(false);

  const boundAction =
    updatePurchaseOrderItem.bind(
      null,
      purchaseOrderId,
      purchaseOrderItemId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    boundAction,
    initialState
  );

  return (
    <div className="min-w-64">
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (current) => !current
          )
        }
        className="w-full rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
      >
        {isOpen
          ? "Düzenlemeyi Kapat"
          : "✏️ Düzenle"}
      </button>

      {isOpen && (
        <form
          action={formAction}
          className="mt-3 space-y-3 rounded-xl border bg-slate-50 p-4"
        >
          <p className="text-sm font-bold text-slate-700">
            {productName}
          </p>

          {state.message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                state.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {state.message}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold">
              Sipariş Miktarı
            </span>

            <input
              name="orderedQuantity"
              type="number"
              min="1"
              step="1"
              defaultValue={
                initialOrderedQuantity
              }
              className="w-full rounded-lg border bg-white p-3"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold">
              KDV Hariç Alış Fiyatı
            </span>

            <input
              name="unitPrice"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={
                initialUnitPrice
              }
              className="w-full rounded-lg border bg-white p-3"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className={`w-full rounded-lg py-3 font-bold ${
              isPending
                ? "cursor-not-allowed bg-slate-300 text-slate-500"
                : "bg-green-700 text-white hover:bg-green-800"
            }`}
          >
            {isPending
              ? "Kaydediliyor..."
              : "Satırı Kaydet"}
          </button>
        </form>
      )}
    </div>
  );
}