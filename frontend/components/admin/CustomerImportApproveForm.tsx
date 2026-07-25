"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  executeCustomerImportAction,
  type CustomerImportActionState,
} from "@/app/admin/data-imports/customers/actions";

type Props = {
  jobId: string;
  totalRows: number;
  modeLabel: string;
};

const initialState:
  CustomerImportActionState = {
  success: false,
  message: "",
  jobId: null,
  completed: false,
};

export default function CustomerImportApproveForm({
  jobId,
  totalRows,
  modeLabel,
}: Props) {
  const router =
    useRouter();

  const executeAction =
    executeCustomerImportAction.bind(
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
      className="rounded-2xl border border-orange-200 bg-orange-50 p-5"
    >
      <h2 className="text-lg font-black text-orange-950">
        Müşteri Aktarımını
        Onayla
      </h2>

      <p className="mt-2 text-sm leading-6 text-orange-900">
        {totalRows} müşteri ve
        teslimat adresi satırı
        “{modeLabel}” yöntemiyle
        işlenecek. Ön izleme
        sonuçlarını kontrol ettikten
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
        disabled={
          isPending ||
          state.completed
        }
        className="mt-5 w-full rounded-xl bg-orange-700 px-5 py-3 font-black text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Müşteri ve Adresler Aktarılıyor..."
          : state.completed
            ? "Aktarım Tamamlandı"
            : "Kontrol Ettim, Müşteri ve Adresleri Aktar"}
      </button>
    </form>
  );
}