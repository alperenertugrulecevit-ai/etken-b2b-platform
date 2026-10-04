"use client";

import { useActionState } from "react";
import { cancelGuestOrderAction, type GuestCancellationState } from "@/app/order-tracking/actions";

const initialState: GuestCancellationState = { success: false, message: "" };

export default function GuestOrderCancellationForm({ orderNumber, email }: { orderNumber: string; email: string }) {
  const action = cancelGuestOrderAction.bind(null, orderNumber, email);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Sipariş İptali</h2>
      <p className="mt-2 text-sm text-slate-600">
        Sipariş hazırlanmaya başlamadan önce iptal edebilirsiniz. Operasyon başladıysa destek ekibimiz yardımcı olacaktır.
      </p>
      {state.message ? (
        <div role="status" className={"mt-4 rounded-xl p-3 text-sm font-bold " + (state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
          {state.message}
        </div>
      ) : null}
      {!state.success ? (
        <form action={formAction} className="mt-4">
          <label className="text-sm font-bold text-slate-700">
            İptal nedeni
            <textarea name="reason" maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="İsteğe bağlı" />
          </label>
          <button type="submit" disabled={pending} className="mt-3 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300">
            {pending ? "İptal ediliyor..." : "Siparişi İptal Et"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
