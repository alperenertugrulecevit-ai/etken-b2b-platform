"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createHandlingUnit,
  type HandlingUnitActionState,
} from "@/app/admin/handling-units/actions";

const initialState:
  HandlingUnitActionState = {
  success: false,
  message: "",
};

export default function HandlingUnitCreateForm() {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [
    useAutomaticBarcode,
    setUseAutomaticBarcode,
  ] = useState(true);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createHandlingUnit,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setUseAutomaticBarcode(true);
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="h-fit rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-2xl font-bold">
        Yeni Koli / Palet
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Ürün yüklemek için kullanılacak
        taşıma birimi barkodunu oluşturun.
      </p>

      {state.message && (
        <div
          role="alert"
          className={`mt-6 rounded-xl border p-5 ${
            state.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-bold">
            {state.success
              ? "İşlem başarılı"
              : "İşlem gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Taşıma Birimi Tipi
          </span>

          <select
            name="unitType"
            defaultValue="BOX"
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="BOX">
              Koli
            </option>

            <option value="PALLET">
              Palet
            </option>
          </select>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-4">
          <input
            type="checkbox"
            name="useAutomaticBarcode"
            checked={useAutomaticBarcode}
            onChange={(event) =>
              setUseAutomaticBarcode(
                event.target.checked
              )
            }
            className="mt-1 h-5 w-5"
          />

          <span>
            <span className="block font-semibold">
              Otomatik barkod oluştur
            </span>

            <span className="mt-1 block text-sm text-gray-500">
              Koli için `KOL00000001`,
              palet için `PLT00000001`
              biçiminde barkod oluşturulur.
            </span>
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Hazır Barkod
          </span>

          <input
            name="barcode"
            disabled={
              useAutomaticBarcode
            }
            placeholder="Barkodu okutun veya yazın"
            maxLength={60}
            className="w-full rounded-xl border p-4 uppercase disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <p className="mt-2 text-xs text-gray-500">
            Otomatik barkod kapatılırsa bu
            alan zorunlu hale gelir.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={4}
            placeholder="Örneğin: Satın alma mal kabul paleti"
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-7 w-full rounded-xl py-4 font-bold ${
          isPending
            ? "cursor-not-allowed bg-slate-300 text-slate-500"
            : "bg-blue-900 text-white hover:bg-blue-800"
        }`}
      >
        {isPending
          ? "Barkod Oluşturuluyor..."
          : "Koli / Palet Oluştur"}
      </button>
    </form>
  );
}