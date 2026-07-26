"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  printPackingListAction,
  type RFPackingListPrintState,
} from "@/app/rf/packing-list-print/actions";

type BarcodePrinterOption = {
  id: string;
  code: string;
  name: string;
  ipAddress: string;
  port: number;
  dpi: number;
};

type RFPackingListPrintFormProps = {
  printers: BarcodePrinterOption[];
};

const initialState: RFPackingListPrintState = {
  success: false,
  message: "",
  requiresConfirmation: false,
  shippingHandlingUnitBarcode: "",
  printerId: "",
};

const PRINTER_STORAGE_KEY =
  "etken.rf.packingListPrinterId";

const TERMINAL_STORAGE_KEY =
  "etken.rf.terminalCode";

export default function RFPackingListPrintForm({
  printers,
}: RFPackingListPrintFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const barcodeInputRef =
    useRef<HTMLInputElement>(null);

  const [
    selectedPrinterId,
    setSelectedPrinterId,
  ] = useState("");

  const [
    terminalCode,
    setTerminalCode,
  ] = useState("RF-01");

  const [
    dismissedConfirmation,
    setDismissedConfirmation,
  ] = useState("");

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    printPackingListAction,
    initialState
  );

  const confirmationKey =
    `${state.shippingHandlingUnitBarcode}|${state.message}`;

  const showReprintConfirmation =
    state.requiresConfirmation &&
    dismissedConfirmation !==
      confirmationKey;

  const selectedPrinter =
    printers.find(
      (printer) =>
        printer.id ===
        selectedPrinterId
    ) ?? null;

  useEffect(() => {
    const storedPrinterId =
      window.localStorage.getItem(
        PRINTER_STORAGE_KEY
      );

    const storedPrinterExists =
      printers.some(
        (printer) =>
          printer.id ===
          storedPrinterId
      );

    if (
      storedPrinterId &&
      storedPrinterExists
    ) {
      setSelectedPrinterId(
        storedPrinterId
      );
    }

    const storedTerminalCode =
      window.localStorage.getItem(
        TERMINAL_STORAGE_KEY
      );

    if (storedTerminalCode) {
      setTerminalCode(
        storedTerminalCode
      );
    }
  }, [printers]);

  useEffect(() => {
    if (!selectedPrinterId) {
      return;
    }

    window.localStorage.setItem(
      PRINTER_STORAGE_KEY,
      selectedPrinterId
    );

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, [selectedPrinterId]);

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

    if (barcodeInputRef.current) {
      barcodeInputRef.current.value =
        "";
    }

    setDismissedConfirmation("");

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.shippingHandlingUnitBarcode,
  ]);

  useEffect(() => {
    if (
      !state.requiresConfirmation
    ) {
      return;
    }

    if (barcodeInputRef.current) {
      barcodeInputRef.current.value =
        state.shippingHandlingUnitBarcode;
    }
  }, [
    state.requiresConfirmation,
    state.shippingHandlingUnitBarcode,
  ]);

  function handlePrinterChange(
    printerId: string
  ) {
    setSelectedPrinterId(
      printerId
    );

    setDismissedConfirmation("");

    if (barcodeInputRef.current) {
      barcodeInputRef.current.value =
        "";
    }
  }

  function handleFormSubmit() {
    setDismissedConfirmation("");
  }

  function handleCancelReprint() {
    setDismissedConfirmation(
      confirmationKey
    );

    if (barcodeInputRef.current) {
      barcodeInputRef.current.value =
        "";
    }

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }

  return (
    <div className="space-y-5">
      <form
        id="packing-list-print-form"
        ref={formRef}
        action={formAction}
        onSubmit={handleFormSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            Termal Etiket Baskısı
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Çeki Listesi Yazdır
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Önce ağ yazıcısını seçin.
            Ardından Sevk THM
            barkodlarını sırayla
            okutun. Her başarılı
            okutma işleminde çeki
            listesi doğrudan seçilen
            yazıcıya gönderilir.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              1. Barkod Yazıcısı
            </span>

            <select
              name="printerId"
              value={selectedPrinterId}
              onChange={(event) =>
                handlePrinterChange(
                  event.target.value
                )
              }
              required
              disabled={isPending}
              className="w-full rounded-xl border border-blue-300 bg-blue-50 p-4 font-bold text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                Yazıcı seçin...
              </option>

              {printers.map(
                (printer) => (
                  <option
                    key={printer.id}
                    value={printer.id}
                  >
                    {printer.code} —{" "}
                    {printer.name} —{" "}
                    {printer.ipAddress}:
                    {printer.port}
                  </option>
                )
              )}
            </select>
          </label>

          {selectedPrinter && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">
                  Seçili Yazıcı
                </p>

                <p className="mt-1 font-black text-slate-950">
                  {
                    selectedPrinter.name
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-blue-700">
                  Bağlantı
                </p>

                <p className="mt-1 font-black text-slate-950">
                  {
                    selectedPrinter.ipAddress
                  }
                  :
                  {
                    selectedPrinter.port
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-blue-700">
                  Çözünürlük
                </p>

                <p className="mt-1 font-black text-slate-950">
                  {
                    selectedPrinter.dpi
                  }{" "}
                  DPI
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-blue-700">
                  Etiket
                </p>

                <p className="mt-1 font-black text-slate-950">
                  100 × 100 mm
                </p>
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              2. Terminal Kodu
            </span>

            <input
              name="terminalCode"
              value={terminalCode}
              onChange={(event) =>
                setTerminalCode(
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder="RF-01"
              maxLength={30}
              disabled={isPending}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 font-bold uppercase text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              3. Sevk THM Barkodu
            </span>

            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                name="shippingHandlingUnitBarcode"
                defaultValue={
                  state.requiresConfirmation
                    ? state.shippingHandlingUnitBarcode
                    : ""
                }
                placeholder={
                  selectedPrinterId
                    ? "Sevk THM barkodunu okutun"
                    : "Önce yazıcı seçin"
                }
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={60}
                required
                disabled={
                  !selectedPrinterId ||
                  isPending ||
                  showReprintConfirmation
                }
                className="min-w-0 flex-1 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-black uppercase text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <button
                type="button"
                disabled={
                  isPending ||
                  !selectedPrinterId
                }
                onClick={() => {
                  if (
                    barcodeInputRef.current
                  ) {
                    barcodeInputRef.current.value =
                      "";

                    barcodeInputRef.current.focus();
                  }

                  setDismissedConfirmation(
                    ""
                  );
                }}
                className="rounded-xl bg-slate-800 px-4 font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Temizle
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Barkod okuyucunun Enter
              tuşu göndermesi halinde
              baskı otomatik başlar.
            </p>
          </label>
        </div>

        {!showReprintConfirmation && (
          <button
            type="submit"
            disabled={
              isPending ||
              !selectedPrinterId
            }
            className={`mt-6 w-full rounded-xl py-4 text-base font-black text-white ${
              isPending ||
              !selectedPrinterId
                ? "cursor-not-allowed bg-slate-400"
                : "bg-blue-900 hover:bg-blue-800"
            }`}
          >
            {isPending
              ? "Yazıcıya Gönderiliyor..."
              : "Çeki Listesini Yazdır"}
          </button>
        )}

        {state.message &&
          !showReprintConfirmation && (
            <div
              role="alert"
              className={`mt-5 rounded-xl border p-4 ${
                state.success
                  ? "border-green-300 bg-green-50 text-green-900"
                  : "border-red-300 bg-red-50 text-red-900"
              }`}
            >
              <p className="font-black">
                {state.success
                  ? "Baskı başarılı"
                  : "Baskı gerçekleştirilemedi"}
              </p>

              <p className="mt-2 text-sm leading-6">
                {state.message}
              </p>

              {state.success && (
                <p className="mt-2 text-xs font-bold">
                  Sıradaki Sevk THM
                  barkodunu okutabilirsiniz.
                </p>
              )}
            </div>
          )}
      </form>

      {showReprintConfirmation && (
        <section
          role="alertdialog"
          aria-labelledby="reprint-title"
          className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm"
        >
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">
            Tekrar Baskı Onayı
          </p>

          <h2
            id="reprint-title"
            className="mt-2 text-xl font-black text-amber-950"
          >
            Bu çeki listesi daha önce
            basılmıştır. Devam etmek
            istiyor musunuz?
          </h2>

          <p className="mt-3 text-sm leading-6 text-amber-900">
            Sevk THM:{" "}
            <strong>
              {
                state.shippingHandlingUnitBarcode
              }
            </strong>
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Tekrar baskı işlemi kullanıcı,
            terminal ve yazıcı bilgileriyle
            hareket geçmişine kaydedilecektir.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={
                handleCancelReprint
              }
              disabled={isPending}
              className="rounded-xl border border-slate-300 bg-white px-4 py-4 font-black text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              form="packing-list-print-form"
              name="forceReprint"
              value="true"
              disabled={isPending}
              onClick={() => {
                setDismissedConfirmation(
                  ""
                );
              }}
              className="rounded-xl bg-amber-700 px-4 py-4 font-black text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending
                ? "Yazdırılıyor..."
                : "Tekrar Yazdır"}
            </button>
          </div>

          {/*
            Dışarıdaki submit düğmesinin
            formu bulabilmesi için form
            kimliği aşağıdaki effect
            kullanılmadan doğrudan sabit
            tutulur.
          */}
        </section>
      )}
    </div>
  );
}