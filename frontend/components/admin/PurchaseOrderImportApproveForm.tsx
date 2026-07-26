"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  executePurchaseOrderImportAction,
  type PurchaseOrderImportActionState,
} from "@/app/admin/data-imports/purchase-orders/actions";

type Props = {
  jobId: string;
  totalRows: number;
  modeLabel: string;
};

const initialState:
  PurchaseOrderImportActionState = {
  success: false,
  message: "",
  jobId: null,
  completed: false,
};

export default function PurchaseOrderImportApproveForm({
  jobId,
  totalRows,
  modeLabel,
}: Props) {
  const router =
    useRouter();

  const executeAction =
    executePurchaseOrderImportAction.bind(
      null,
      jobId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    executeAction,
    initialState
  );

  useEffect(() => {
    if (
      state.completed
    ) {
      router.refresh();
    }
  }, [
    router,
    state.completed,
  ]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-violet-200 bg-violet-50 p-5"
    >
      <h2 className="text-lg font-black text-violet-950">
        Satın Alma Siparişlerini
        Onayla
      </h2>

      <p className="mt-2 text-sm leading-6 text-violet-900">
        {totalRows} sipariş ve ürün
        satırı “{modeLabel}”
        yöntemiyle işlenecek.
        Tedarikçi, ürün, miktar,
        fiyat ve tarih bilgilerini
        kontrol ettikten sonra
        aktarımı başlatın.
      </p>

      {state.message ? (
        <div
          role="status"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
            state.success
              ? "border-emerald-300 bg-white text-emerald-800"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          isPending ||
          state.completed
        }
        className="mt-5 w-full rounded-xl bg-violet-700 px-5 py-3 font-black text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Siparişler Aktarılıyor..."
          : state.completed
            ? "Aktarım Tamamlandı"
            : "Kontrol Ettim, Satın Alma Siparişlerini Aktar"}
      </button>
    </form>
  );
}