"use client";

import { useActionState } from "react";
import {
  createRfWarehouseTransfer,
  type RfWarehouseTransferState,
} from "@/app/rf/warehouse-transfer/actions";

type WarehouseOption = {
  id: number;
  code: string;
  name: string;
};

const initialState: RfWarehouseTransferState = {
  success: false,
  message: "",
};

export default function RFWarehouseProductTransferForm({
  warehouses,
}: {
  warehouses: WarehouseOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createRfWarehouseTransfer,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="mode" value="PRODUCT" />

      <div className="grid gap-4">
        <label className="text-sm font-black">
          1. Kaynak Depo
          <select
            name="sourceWarehouseId"
            required
            autoFocus
            className="mt-2 w-full rounded-xl border p-4 text-lg font-black"
          >
            <option value="">Kaynak depo seçin</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-black">
          2. Kaynak THM
          <input
            name="sourceHandlingUnitBarcode"
            required
            autoComplete="off"
            placeholder="THM barkodunu okutun"
            className="mt-2 w-full rounded-xl border-2 border-blue-300 p-4 text-lg font-black uppercase"
          />
        </label>

        <label className="text-sm font-black">
          3. Ürün Barkodu
          <input
            name="productBarcode"
            required
            autoComplete="off"
            placeholder="Ürün barkodunu okutun"
            className="mt-2 w-full rounded-xl border-2 border-blue-300 p-4 text-lg font-black uppercase"
          />
        </label>

        <label className="text-sm font-black">
          4. Transfer Miktarı
          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            required
            inputMode="numeric"
            className="mt-2 w-full rounded-xl border p-4 text-lg font-black"
          />
        </label>

        <label className="text-sm font-black">
          5. Hedef Depo
          <select
            name="targetWarehouseId"
            required
            className="mt-2 w-full rounded-xl border p-4 text-lg font-black"
          >
            <option value="">Hedef depo seçin</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-black">
          6. Hedef Lokasyon
          <input
            name="targetLocationBarcode"
            required
            autoComplete="off"
            placeholder="Lokasyon barkodunu okutun"
            className="mt-2 w-full rounded-xl border-2 border-cyan-300 p-4 text-lg font-black uppercase"
          />
        </label>

        <label className="text-sm font-black">
          7. Hedef THM
          <input
            name="targetHandlingUnitBarcode"
            required
            autoComplete="off"
            placeholder="Hedef THM barkodunu okutun"
            className="mt-2 w-full rounded-xl border-2 border-cyan-300 p-4 text-lg font-black uppercase"
          />
        </label>

        <label className="text-sm font-black">
          Terminal Kodu
          <input
            name="terminalCode"
            placeholder="Örn. RF-01"
            className="mt-2 w-full rounded-xl border p-4 uppercase"
          />
        </label>

        {state.message ? (
          <div
            role="alert"
            className={
              state.success
                ? "rounded-xl border border-green-300 bg-green-50 p-4 font-bold text-green-900"
                : "rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-900"
            }
          >
            {state.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-900 py-4 text-lg font-black text-white disabled:opacity-50"
        >
          {isPending ? "İŞLEM YAPILIYOR..." : "ÜRÜN TRANSFERİNİ TAMAMLA"}
        </button>
      </div>
    </form>
  );
}
