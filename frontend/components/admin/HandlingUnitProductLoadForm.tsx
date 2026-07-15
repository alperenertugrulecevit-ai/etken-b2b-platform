"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addProductToHandlingUnit,
  type HandlingUnitProductActionState,
} from "@/app/admin/handling-units/[id]/actions";

type Props = {
  handlingUnitId: number;
  handlingUnitBarcode: string;
  canLoadProduct: boolean;
};

const initialState:
  HandlingUnitProductActionState = {
  success: false,
  message: "",
};

export default function HandlingUnitProductLoadForm({
  handlingUnitId,
  handlingUnitBarcode,
  canLoadProduct,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const barcodeInputRef =
    useRef<HTMLInputElement>(null);

  const [quantity, setQuantity] =
    useState("1");

  const boundAction =
    addProductToHandlingUnit.bind(
      null,
      handlingUnitId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    boundAction,
    initialState
  );

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();

      setQuantity("1");

      window.setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <div>
        <h2 className="text-2xl font-bold">
          Ürün Yükle
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Önce ürün barkodunu okutun.
          Miktar 1 ise her okutma bir adet
          ekler.
        </p>
      </div>

      <div className="mt-5 rounded-xl bg-slate-900 p-5 text-white">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Açık Koli / Palet
        </p>

        <p className="mt-2 break-all font-mono text-2xl font-bold">
          {handlingUnitBarcode}
        </p>
      </div>

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

      {!canLoadProduct && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
          Bu koli veya palet ürün yüklemeye
          açık değil. Önce taşıma birimini
          açık duruma getirin.
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Ürün Barkodu
          </span>

          <input
            ref={barcodeInputRef}
            name="productBarcode"
            autoComplete="off"
            inputMode="text"
            placeholder="Ürün barkodunu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={
              !canLoadProduct ||
              isPending
            }
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Ürün barkodu veya ürün kodu
            okutulabilir.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Miktar
          </span>

          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) =>
              setQuantity(
                event.target.value
              )
            }
            className="w-full rounded-xl border p-5 text-xl"
            disabled={
              !canLoadProduct ||
              isPending
            }
            required
          />
        </label>

        <div className="grid gap-3 md:grid-cols-4">
          {[1, 5, 10, 24].map(
            (quickQuantity) => (
              <button
                key={quickQuantity}
                type="button"
                onClick={() =>
                  setQuantity(
                    String(
                      quickQuantity
                    )
                  )
                }
                disabled={
                  !canLoadProduct ||
                  isPending
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {quickQuantity} Adet
              </button>
            )
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={
          !canLoadProduct ||
          isPending
        }
        className={`mt-7 w-full rounded-xl py-5 text-lg font-bold ${
          canLoadProduct &&
          !isPending
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Ürün Yükleniyor..."
          : "Ürünü Koli / Palete Yükle"}
      </button>
    </form>
  );
}