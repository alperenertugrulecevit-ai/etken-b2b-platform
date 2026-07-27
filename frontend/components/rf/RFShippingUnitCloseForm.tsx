"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  closeShippingUnitAction,
  type RFShippingUnitCloseState,
} from "@/app/rf/shipping-unit-close/actions";

const initialState: RFShippingUnitCloseState = {
  success: false,
  message: "",
  shippingHandlingUnitBarcode: "",
};

const TERMINAL_STORAGE_KEY =
  "etken.rf.terminalCode";

export default function RFShippingUnitCloseForm() {
  const barcodeInputRef =
    useRef<HTMLInputElement>(null);

  const [
    shippingHandlingUnitBarcode,
    setShippingHandlingUnitBarcode,
  ] = useState("");

  const [
    terminalCode,
    setTerminalCode,
  ] = useState("RF-01");

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    closeShippingUnitAction,
    initialState
  );

  useEffect(() => {
    const storedTerminalCode =
      window.localStorage.getItem(
        TERMINAL_STORAGE_KEY
      );

    if (storedTerminalCode) {
      setTerminalCode(
        storedTerminalCode
      );
    }

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    const normalizedTerminalCode =
      terminalCode
        .trim()
        .toUpperCase();

    if (!normalizedTerminalCode) {
      return;
    }

    window.localStorage.setItem(
      TERMINAL_STORAGE_KEY,
      normalizedTerminalCode
    );
  }, [terminalCode]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setShippingHandlingUnitBarcode(
      ""
    );

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.shippingHandlingUnitBarcode,
  ]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    const barcode =
      shippingHandlingUnitBarcode
        .trim()
        .toUpperCase();

    if (!barcode) {
      event.preventDefault();
      barcodeInputRef.current?.focus();
      return;
    }

    const confirmed =
      window.confirm(
        `${barcode} Sevk THM kapatılsın ve sevke hazır hâle getirilsin mi?\n\nBu işlemden sonra bu THM'ye ürün eklenemez.`
      );

    if (!confirmed) {
      event.preventDefault();

      window.setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    }
  }

  function clearBarcode() {
    setShippingHandlingUnitBarcode(
      ""
    );

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  }

  return (
    <div className="space-y-5">
      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-red-700">
            Sevke Hazırlama
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Sevk THM Kapatma
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Paketleme işlemi tamamlanan
            veya açık kalan Sevk THM
            barkodunu okutarak koliyi
            kapatın ve sevke hazır hâle
            getirin.
          </p>
        </div>

        {state.message && (
          <div
            role="alert"
            className={`mt-5 rounded-xl border p-4 ${
              state.success
                ? "border-green-300 bg-green-50 text-green-950"
                : "border-red-300 bg-red-50 text-red-950"
            }`}
          >
            <p className="font-black">
              {state.success
                ? "Sevk THM kapatıldı"
                : "Sevk THM kapatılamadı"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              1. Sevk THM Barkodu
            </span>

            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                name="shippingHandlingUnitBarcode"
                value={
                  shippingHandlingUnitBarcode
                }
                onChange={(event) =>
                  setShippingHandlingUnitBarcode(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="Sevk THM barkodunu okutun"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={60}
                required
                disabled={isPending}
                className="min-w-0 flex-1 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 font-mono text-xl font-black uppercase text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {shippingHandlingUnitBarcode && (
                <button
                  type="button"
                  onClick={
                    clearBarcode
                  }
                  disabled={
                    isPending
                  }
                  className="rounded-xl bg-slate-800 px-4 font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Temizle
                </button>
              )}
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Barkod okuyucunun Enter
              tuşu göndermesi halinde
              kapatma onayı otomatik
              açılır.
            </p>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              2. Terminal Kodu
            </span>

            <input
              name="terminalCode"
              value={terminalCode}
              onChange={(event) =>
                setTerminalCode(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="RF-01"
              maxLength={30}
              disabled={isPending}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 font-bold uppercase text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950">
          <p className="font-black">
            Dikkat
          </p>

          <p className="mt-1 text-xs leading-5">
            Kapatılan Sevk THM sevke
            hazır duruma geçer. Bu
            işlemden sonra normal
            paketleme ekranından koliye
            yeni ürün eklenemez.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            isPending ||
            !shippingHandlingUnitBarcode.trim()
          }
          className={`mt-6 w-full rounded-xl py-4 font-black text-white ${
            isPending ||
            !shippingHandlingUnitBarcode.trim()
              ? "cursor-not-allowed bg-slate-400"
              : "bg-red-700 hover:bg-red-800"
          }`}
        >
          {isPending
            ? "Sevk THM Kapatılıyor..."
            : "Sevk THM'yi Kapat ve Sevke Hazırla"}
        </button>
      </form>

      {state.success &&
        state.shippingHandlingUnitBarcode && (
          <div className="rounded-2xl border border-green-300 bg-green-50 p-5 text-green-950">
            <h2 className="font-black">
              Çeki listesi kontrolüne
              geçebilirsiniz
            </h2>

            <p className="mt-2 text-sm leading-6">
              {
                state.shippingHandlingUnitBarcode
              }{" "}
              kapatıldı ve artık çeki
              listesi ön izlemesine
              uygundur.
            </p>

            <Link
              href={`/rf/packing-list-preview?barcode=${encodeURIComponent(
                state.shippingHandlingUnitBarcode
              )}`}
              className="mt-4 inline-flex rounded-xl bg-blue-900 px-5 py-3 font-black text-white hover:bg-blue-800"
            >
              Çeki Listesini Ön İzle
            </Link>
          </div>
        )}
    </div>
  );
}