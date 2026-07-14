"use client";

import { useActionState } from "react";

import {
  createPurchaseOrder,
  type PurchaseOrderActionState,
} from "@/app/admin/purchase-orders/actions";

type Supplier = {
  id: number;
  name: string;
  paymentTermDays: number;
  discountRate: number;
  deliveryDays: number;
};

type Props = {
  suppliers: Supplier[];
};

const initialPurchaseOrderState: PurchaseOrderActionState = {
  success: false,
  message: "",
};

export default function PurchaseOrderCreateForm({
  suppliers,
}: Props) {
  const [state, formAction, isPending] =
    useActionState(
      createPurchaseOrder,
      initialPurchaseOrderState
    );

  return (
    <form
      action={formAction}
      className="mt-10 rounded-2xl bg-white p-8 shadow"
    >
      <div>
        <h2 className="text-2xl font-bold">
          Satın Alma Bilgileri
        </h2>

        <p className="mt-2 text-gray-500">
          Satın alma siparişinin üst bilgilerini
          oluşturun. Ürün satırlarını sonraki
          ekranda ekleyeceğiz.
        </p>
      </div>

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
            defaultValue=""
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="" disabled>
              Tedarikçi seçiniz
            </option>

            {suppliers.map((supplier) => (
              <option
                key={supplier.id}
                value={supplier.id}
              >
                {supplier.name} — Vade:{" "}
                {supplier.paymentTermDays} gün | İskonto: %
                {supplier.discountRate} | Teslim:{" "}
                {supplier.deliveryDays} gün
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Sipariş Tarihi
          </span>

          <input
            type="text"
            value="Otomatik oluşturulacak"
            disabled
            className="w-full cursor-not-allowed rounded-xl border bg-slate-100 p-4 text-slate-500"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Beklenen Teslim Tarihi
          </span>

          <input
            name="expectedDate"
            type="date"
            className="w-full rounded-xl border p-4"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Satın Alma Numarası
          </span>

          <input
            type="text"
            value="PO numarası otomatik verilecek"
            disabled
            className="w-full cursor-not-allowed rounded-xl border bg-slate-100 p-4 text-slate-500"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Başlangıç Durumu
          </span>

          <input
            type="text"
            value="Taslak"
            disabled
            className="w-full cursor-not-allowed rounded-xl border bg-slate-100 p-4 text-slate-500"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Tedarikçiye Not
          </span>

          <textarea
            name="supplierNote"
            rows={5}
            placeholder="Tedarikçiye iletilecek teslimat veya ürün notu"
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
            placeholder="Satın alma ve depo ekibi için iç not"
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
          ? "Satın Alma Oluşturuluyor..."
          : "Taslak Satın Alma Oluştur"}
      </button>
    </form>
  );
}