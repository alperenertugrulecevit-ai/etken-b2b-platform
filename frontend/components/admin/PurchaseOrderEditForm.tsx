"use client";

import {
  useActionState,
} from "react";

import {
  updatePurchaseOrder,
  type UpdatePurchaseOrderState,
} from "@/app/admin/purchase-orders/[id]/edit/actions";

type Supplier = {
  id: number;
  name: string;
  paymentTermDays: number;
  discountRate: number;
  deliveryDays: number;
};

type Props = {
  purchaseOrderId: number;
  suppliers: Supplier[];
  initialSupplierId: number;
  initialExpectedDate: string;
  initialSupplierNote: string;
  initialInternalNote: string;
};

const initialState:
  UpdatePurchaseOrderState = {
  success: false,
  message: "",
};

export default function PurchaseOrderEditForm({
  purchaseOrderId,
  suppliers,
  initialSupplierId,
  initialExpectedDate,
  initialSupplierNote,
  initialInternalNote,
}: Props) {
  const boundAction =
    updatePurchaseOrder.bind(
      null,
      purchaseOrderId
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
    <form
      action={formAction}
      className="mt-10 rounded-2xl bg-white p-8 shadow"
    >
      <h2 className="text-2xl font-bold">
        Satın Alma Bilgileri
      </h2>

      <p className="mt-2 text-gray-500">
        Tedarikçi veya ticari koşullar
        değişirse finansal toplamlar yeniden
        hesaplanacaktır.
      </p>

      {state.message && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
        >
          <p className="font-bold">
            İşlem gerçekleştirilemedi
          </p>

          <p className="mt-2">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">
            Tedarikçi
          </span>

          <select
            name="supplierId"
            defaultValue={
              String(
                initialSupplierId
              )
            }
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            {suppliers.map(
              (supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name} — Vade:{" "}
                  {
                    supplier.paymentTermDays
                  }{" "}
                  gün | İskonto: %
                  {
                    supplier.discountRate
                  }{" "}
                  | Teslim:{" "}
                  {supplier.deliveryDays} gün
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Beklenen Teslim Tarihi
          </span>

          <input
            name="expectedDate"
            type="date"
            defaultValue={
              initialExpectedDate
            }
            className="w-full rounded-xl border p-4"
          />
        </label>

        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          Tedarikçi değiştirildiğinde vade
          ve iskonto oranı yeni tedarikçi
          kartından alınır.
        </div>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Tedarikçiye Not
          </span>

          <textarea
            name="supplierNote"
            rows={5}
            defaultValue={
              initialSupplierNote
            }
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            İç Operasyon Notu
          </span>

          <textarea
            name="internalNote"
            rows={5}
            defaultValue={
              initialInternalNote
            }
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={
          suppliers.length === 0 ||
          isPending
        }
        className={`mt-8 w-full rounded-xl py-4 font-bold ${
          suppliers.length > 0 &&
          !isPending
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Değişiklikler Kaydediliyor..."
          : "Değişiklikleri Kaydet"}
      </button>
    </form>
  );
}