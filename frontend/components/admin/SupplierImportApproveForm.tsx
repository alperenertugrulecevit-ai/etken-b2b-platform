"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  executeSupplierImportAction,
  type SupplierImportActionState,
} from "@/app/admin/data-imports/suppliers/actions";

type Props = {
  jobId: string;
  totalRows: number;
  modeLabel: string;
};

const initialState:
  SupplierImportActionState = {
  success: false,
  message: "",
  jobId: null,
  completed: false,
};

export default function SupplierImportApproveForm({
  jobId,
  totalRows,
  modeLabel,
}: Props) {
  const router =
    useRouter();

  const executeAction =
    executeSupplierImportAction.bind(
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
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
    >
      <h2 className="text-lg font-black text-emerald-950">
        Tedarikçi Aktarımını
        Onayla
      </h2>

      <p className="mt-2 text-sm leading-6 text-emerald-900">
        {totalRows} tedarikçi
        satırı “{modeLabel}”
        yöntemiyle işlenecek.
        Ön izleme satırlarını
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
        className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Tedarikçiler Aktarılıyor..."
          : state.completed
            ? "Aktarım Tamamlandı"
            : "Kontrol Ettim, Tedarikçileri Aktar"}
      </button>
    </form>
  );
}