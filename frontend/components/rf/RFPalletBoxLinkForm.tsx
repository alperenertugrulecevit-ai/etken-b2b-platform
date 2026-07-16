"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  linkBoxToPallet,
  type PalletLinkActionState,
} from "@/app/admin/handling-units/pallet-link/actions";

type PalletOption = {
  id: number;
  barcode: string;
  status: string;

  warehouseCode: string;
  locationCode: string;

  linkedBoxCount: number;
  directStockQuantity: number;
};

type BoxOption = {
  id: number;
  barcode: string;
  status: string;

  warehouseCode: string;
  locationCode: string;

  totalQuantity: number;
};

type Props = {
  pallets: PalletOption[];
  boxes: BoxOption[];
};

const initialState:
  PalletLinkActionState = {
  success: false,
  message: "",

  palletId: null,
  palletBarcode: "",

  boxId: null,
  boxBarcode: "",

  linkedBoxCount: 0,
  boxStockQuantity: 0,
};

export default function RFPalletBoxLinkForm({
  pallets,
  boxes,
}: Props) {
  const palletInputRef =
    useRef<HTMLInputElement>(null);

  const boxInputRef =
    useRef<HTMLInputElement>(null);

  const lastHandledResultRef =
    useRef("");

  const [
    palletBarcode,
    setPalletBarcode,
  ] = useState("");

  const [
    boxBarcode,
    setBoxBarcode,
  ] = useState("");

  const [
    linkedBoxCounts,
    setLinkedBoxCounts,
  ] = useState<
    Record<string, number>
  >(() =>
    Object.fromEntries(
      pallets.map((pallet) => [
        pallet.barcode.toUpperCase(),
        pallet.linkedBoxCount,
      ])
    )
  );

  const [
    linkedBoxIds,
    setLinkedBoxIds,
  ] = useState<number[]>([]);

  const [
    sessionLinkedCount,
    setSessionLinkedCount,
  ] = useState(0);

  const [
    sessionStockQuantity,
    setSessionStockQuantity,
  ] = useState(0);

  const [
    showMessage,
    setShowMessage,
  ] = useState(true);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    linkBoxToPallet,
    initialState
  );

  const normalizedPalletBarcode =
    palletBarcode
      .trim()
      .toUpperCase();

  const normalizedBoxBarcode =
    boxBarcode
      .trim()
      .toUpperCase();

  const selectedPallet =
    useMemo(
      () =>
        pallets.find(
          (pallet) =>
            pallet.barcode
              .trim()
              .toUpperCase() ===
            normalizedPalletBarcode
        ),
      [
        pallets,
        normalizedPalletBarcode,
      ]
    );

  const availableBoxes =
    useMemo(
      () =>
        boxes.filter(
          (box) =>
            !linkedBoxIds.includes(
              box.id
            )
        ),
      [boxes, linkedBoxIds]
    );

  const selectedBox =
    useMemo(
      () =>
        availableBoxes.find(
          (box) =>
            box.barcode
              .trim()
              .toUpperCase() ===
            normalizedBoxBarcode
        ),
      [
        availableBoxes,
        normalizedBoxBarcode,
      ]
    );

  const currentLinkedBoxCount =
    normalizedPalletBarcode
      ? linkedBoxCounts[
          normalizedPalletBarcode
        ] ?? 0
      : 0;

  useEffect(() => {
    palletInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setLinkedBoxCounts(
      Object.fromEntries(
        pallets.map((pallet) => [
          pallet.barcode.toUpperCase(),
          pallet.linkedBoxCount,
        ])
      )
    );
  }, [pallets]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const resultKey = [
      state.palletId,
      state.palletBarcode,
      state.boxId,
      state.boxBarcode,
      state.linkedBoxCount,
      state.boxStockQuantity,
      state.message,
    ].join("|");

    if (
      lastHandledResultRef.current ===
      resultKey
    ) {
      return;
    }

    lastHandledResultRef.current =
      resultKey;

    setShowMessage(true);

    const palletKey =
      state.palletBarcode
        .trim()
        .toUpperCase();

    setLinkedBoxCounts(
      (current) => ({
        ...current,

        [palletKey]:
          state.linkedBoxCount,
      })
    );

    if (state.boxId) {
      setLinkedBoxIds(
        (current) =>
          current.includes(
            state.boxId as number
          )
            ? current
            : [
                ...current,
                state.boxId as number,
              ]
      );
    }

    setSessionLinkedCount(
      (current) => current + 1
    );

    setSessionStockQuantity(
      (current) =>
        current +
        state.boxStockQuantity
    );

    /*
     * Aynı palete seri koli bağlamak için
     * palet barkodu korunur.
     */
    setPalletBarcode(
      state.palletBarcode
    );

    setBoxBarcode("");

    window.setTimeout(() => {
      boxInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.palletId,
    state.palletBarcode,
    state.boxId,
    state.boxBarcode,
    state.linkedBoxCount,
    state.boxStockQuantity,
  ]);

  function clearForm() {
    setPalletBarcode("");
    setBoxBarcode("");

    setSessionLinkedCount(0);
    setSessionStockQuantity(0);

    setShowMessage(false);

    /*
     * Bu ekranda yapılan bağlantılar
     * geçerliliğini koruduğu için
     * linkedBoxIds temizlenmez.
     */

    window.setTimeout(() => {
      palletInputRef.current?.focus();
    }, 100);
  }

  function changePallet() {
    setPalletBarcode("");
    setBoxBarcode("");
    setShowMessage(false);

    window.setTimeout(() => {
      palletInputRef.current?.focus();
    }, 100);
  }

  function handlePalletKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedPallet) {
      boxInputRef.current?.focus();
    }
  }

  function handleBoxKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (
      selectedPallet &&
      selectedBox
    ) {
      event.currentTarget.form
        ?.requestSubmit();
    }
  }

  const canSubmit =
    Boolean(selectedPallet) &&
    Boolean(selectedBox) &&
    normalizedPalletBarcode.length >
      0 &&
    normalizedBoxBarcode.length > 0 &&
    normalizedPalletBarcode !==
      normalizedBoxBarcode;

  return (
    <form
      action={formAction}
      onSubmit={() =>
        setShowMessage(true)
      }
      className="rounded-2xl bg-white p-4 shadow md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">
            Barkod Akışı
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Palet → Koli
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          disabled={isPending}
          className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700 disabled:opacity-50"
        >
          Temizle
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <article className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-blue-700">
            Palete Bağlı
          </p>

          <p className="mt-2 text-2xl font-black text-blue-900">
            {currentLinkedBoxCount}
          </p>
        </article>

        <article className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-green-700">
            Oturumda Bağlanan
          </p>

          <p className="mt-2 text-2xl font-black text-green-900">
            {sessionLinkedCount}
          </p>
        </article>

        <article className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-orange-700">
            Bağlanan Stok
          </p>

          <p className="mt-2 text-2xl font-black text-orange-900">
            {sessionStockQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>
      </div>

      {showMessage &&
        state.message && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border p-4 ${
              state.success
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            <p className="text-lg font-black">
              {state.success
                ? "✓ Bağlama Başarılı"
                : "✕ Bağlama Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Palet
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold">
                    {state.palletBarcode}
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Bağlanan Koli
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold">
                    {state.boxBarcode}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="rf-pallet-options">
        {pallets.map((pallet) => {
          const palletKey =
            pallet.barcode.toUpperCase();

          return (
            <option
              key={pallet.id}
              value={pallet.barcode}
            >
              {pallet.status}
              {" — Bağlı koli: "}
              {linkedBoxCounts[
                palletKey
              ] ??
                pallet.linkedBoxCount}
              {" — Direkt stok: "}
              {
                pallet.directStockQuantity
              }
            </option>
          );
        })}
      </datalist>

      <datalist id="rf-free-box-options">
        {availableBoxes.map((box) => (
          <option
            key={box.id}
            value={box.barcode}
          >
            {box.status}
            {" — Stok: "}
            {box.totalQuantity}
          </option>
        ))}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Hedef Palet Barkodu
          </span>

          <input
            ref={palletInputRef}
            name="palletBarcode"
            list="rf-pallet-options"
            value={palletBarcode}
            onChange={(event) => {
              setPalletBarcode(
                event.target.value.toUpperCase()
              );

              setBoxBarcode("");
            }}
            onKeyDown={
              handlePalletKeyDown
            }
            autoComplete="off"
            placeholder="Palet barkodunu okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {normalizedPalletBarcode &&
            !selectedPallet && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Kullanılabilir palet
                bulunamadı.
              </p>
            )}

          {selectedPallet && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-blue-50 p-3 text-blue-900">
              <div>
                <p className="font-black">
                  {selectedPallet.status}
                </p>

                <p className="mt-1 text-sm">
                  Bağlı koli:{" "}
                  {currentLinkedBoxCount}
                  {" | "}
                  Direkt stok:{" "}
                  {
                    selectedPallet.directStockQuantity
                  }
                </p>

                <p className="mt-1 font-mono text-xs">
                  Adres:{" "}
                  {selectedPallet.warehouseCode &&
                  selectedPallet.locationCode
                    ? `${selectedPallet.warehouseCode}/${selectedPallet.locationCode}`
                    : "Adreslenmedi"}
                </p>
              </div>

              <button
                type="button"
                onClick={changePallet}
                disabled={isPending}
                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            2. Koli Barkodu
          </span>

          <input
            ref={boxInputRef}
            name="boxBarcode"
            list="rf-free-box-options"
            value={boxBarcode}
            onChange={(event) =>
              setBoxBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleBoxKeyDown
            }
            autoComplete="off"
            placeholder={
              selectedPallet
                ? "Koli barkodunu okut"
                : "Önce hedef paleti okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedPallet
            }
            required
          />

          {normalizedBoxBarcode &&
            selectedPallet &&
            !selectedBox && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Bağımsız veya kullanılabilir
                koli bulunamadı.
              </p>
            )}

          {selectedBox && (
            <div className="mt-2 rounded-xl bg-green-50 p-3 text-green-900">
              <p className="font-black">
                {selectedBox.status}
              </p>

              <p className="mt-1 text-sm">
                Koli stoğu:{" "}
                {selectedBox.totalQuantity}
              </p>

              <p className="mt-1 font-mono text-xs">
                Mevcut adres:{" "}
                {selectedBox.warehouseCode &&
                selectedBox.locationCode
                  ? `${selectedBox.warehouseCode}/${selectedBox.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>
      </div>

      <button
        type="submit"
        disabled={
          isPending || !canSubmit
        }
        className={`mt-6 w-full rounded-xl py-5 text-xl font-black ${
          !isPending && canSubmit
            ? "bg-blue-900 text-white active:bg-blue-950"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "KOLİ PALETE BAĞLANIYOR..."
          : "KOLİYİ PALETE BAĞLA"}
      </button>
    </form>
  );
}