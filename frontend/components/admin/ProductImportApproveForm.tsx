"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  executeProductImportAction,
  type ProductImportActionState,
} from "@/app/admin/data-imports/actions";

const initialState:
  ProductImportActionState = {
  success: false,
  message: "",
  jobId: null,
  completed: false,
};


type Props = {
  jobId: string;
  totalRows: number;
  modeLabel: string;
};

export default function ProductImportApproveForm({
  jobId,
  totalRows,
  modeLabel,
}: Props) {
  const router = useRouter();

  const executeAction =
    executeProductImportAction.bind(
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
    if (state.completed) {
      router.refresh();
    }
  }, [
    router,
    state.completed,
  ]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
    >
      <h2 className="text-lg font-black text-emerald-950">
        Aktarımı Onayla
      </h2>

      <p className="mt-2 text-sm leading-6 text-emerald-900">
        {totalRows} ürün satırı
        “{modeLabel}” yöntemiyle
        işlenecek. Ön izleme
        satırlarını kontrol ettikten
        sonra aktarımı başlatın.
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
        disabled={isPending}
        className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Ürünler Aktarılıyor..."
          : "Kontrol Ettim, Ürünleri Aktar"}
      </button>
    </form>
  );
}
