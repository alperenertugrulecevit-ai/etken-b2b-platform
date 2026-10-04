"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  type OrderStatusActionState,
  updateOrderStatus,
} from "./actions";

const initialState: OrderStatusActionState = { error: null };

export default function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = updateOrderStatus.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state?.error) {
      dialogRef.current?.showModal();
    }
  }, [state]);

  return (
    <>
      <form action={formAction} className="mt-6">
        <select
          name="status"
          defaultValue={currentStatus}
          className="w-full rounded-xl border bg-white p-4"
        >
          <option value="DRAFT">Taslak</option>
          <option value="PENDING">Bekliyor</option>
          <option value="APPROVED">Onaylandı</option>
          <option value="PREPARING">Hazırlanıyor</option>
          <option value="PICKING">Toplanıyor</option>
          <option value="PACKING">Paketleniyor</option>
          <option value="READY_TO_SHIP">Sevke Hazır</option>
          <option value="SHIPPED">Sevk Edildi</option>
          <option value="DELIVERED">Teslim Edildi</option>
          <option value="CANCELLED">İptal</option>
        </select>

        <label className="mt-4 block text-sm font-semibold">
          Müşteriye Gösterilecek Durum Notu
          <textarea
            name="statusNote"
            rows={3}
            maxLength={500}
            placeholder="Örnek: Siparişiniz hazırlanmak üzere depoya aktarıldı."
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-blue-900 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "İşleniyor..." : "Durumu Güncelle"}
        </button>
      </form>

      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-lg rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl font-black text-red-700">
            !
          </div>
          <h2 className="text-xl font-black text-red-700">
            Sipariş İptal Edilemez
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
            {state?.error}
          </p>
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="mt-6 w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white"
          >
            Tamam
          </button>
        </div>
      </dialog>
    </>
  );
}
