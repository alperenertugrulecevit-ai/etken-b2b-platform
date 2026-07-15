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
  linkedBoxCount: number;
  totalQuantity: number;
};

type BoxOption = {
  id: number;
  barcode: string;
  status: string;
  totalQuantity: number;
};

type Props = {
  pallets: PalletOption[];
  boxes: BoxOption[];
};

const initialState: PalletLinkActionState = {
  success: false,
  message: "",
  palletBarcode: "",
  boxBarcode: "",
  linkedBoxCount: 0,
};

export default function PalletBoxLinkForm({
  pallets,
  boxes,
}: Props) {
  const palletInputRef =
    useRef<HTMLInputElement>(null);

  const boxInputRef =
    useRef<HTMLInputElement>(null);

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
  ] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        pallets.map((pallet) => [
          pallet.barcode,
          pallet.linkedBoxCount,
        ])
      )
  );

  const [
    sessionLinkedCount,
    setSessionLinkedCount,
  ] = useState(0);

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

  const selectedPallet = useMemo(
    () =>
      pallets.find(
        (pallet) =>
          pallet.barcode.toUpperCase() ===
          normalizedPalletBarcode
      ),
    [
      pallets,
      normalizedPalletBarcode,
    ]
  );

  const selectedBox = useMemo(
    () =>
      boxes.find(
        (box) =>
          box.barcode.toUpperCase() ===
          normalizedBoxBarcode
      ),
    [
      boxes,
      normalizedBoxBarcode,
    ]
  );

  useEffect(() => {
    setLinkedBoxCounts(
      Object.fromEntries(
        pallets.map((pallet) => [
          pallet.barcode,
          pallet.linkedBoxCount,
        ])
      )
    );
  }, [pallets]);

  useEffect(() => {
    palletInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setLinkedBoxCounts(
      (current) => ({
        ...current,
        [state.palletBarcode]:
          state.linkedBoxCount,
      })
    );

    setSessionLinkedCount(
      (current) => current + 1
    );

    /*
     * Aynı palete seri koli bağlamak için
     * palet barkodunu koruyoruz.
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
    state.palletBarcode,
    state.linkedBoxCount,
  ]);

  function clearForm() {
    setPalletBarcode("");
    setBoxBarcode("");
    setSessionLinkedCount(0);

    window.setTimeout(() => {
      palletInputRef.current?.focus();
    }, 100);
  }

  function handlePalletKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (normalizedPalletBarcode) {
        boxInputRef.current?.focus();
      }
    }
  }

  const currentLinkedBoxCount =
    normalizedPalletBarcode
      ? linkedBoxCounts[
          normalizedPalletBarcode
        ] ?? 0
      : 0;

  /*
   * Client tarafında yalnızca barkodların
   * dolu ve farklı olması kontrol edilir.
   *
   * Barkodun gerçekten palet veya koli
   * olup olmadığını Server Action kontrol eder.
   */
  const canSubmit =
    normalizedPalletBarcode.length > 0 &&
    normalizedBoxBarcode.length > 0 &&
    normalizedPalletBarcode !==
      normalizedBoxBarcode;

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-8 shadow"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Koliyi Palete Bağla
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Önce hedef palet barkodunu,
            ardından palete bağlanacak koli
            barkodunu okutun.
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          disabled={isPending}
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Temizle
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase text-blue-700">
            Palete Bağlı Koli
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {currentLinkedBoxCount}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold text-blue-700">
            {normalizedPalletBarcode ||
              "Palet seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase text-green-700">
            Seçilen Koli Stoğu
          </p>

          <p className="mt-3 text-4xl font-bold text-green-800">
            {selectedBox?.totalQuantity ??
              0}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold text-green-700">
            {normalizedBoxBarcode ||
              "Koli seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-violet-50 p-6">
          <p className="text-sm font-semibold uppercase text-violet-700">
            Oturumda Bağlanan
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-900">
            {sessionLinkedCount}
          </p>

          <p className="mt-3 text-sm font-semibold text-violet-700">
            Bu ekran açıkken bağlanan koliler
          </p>
        </article>
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
              ? "Bağlama başarılı"
              : "Bağlama gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Palet
                </p>

                <p className="mt-2 font-mono font-bold">
                  {state.palletBarcode}
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Bağlanan Koli
                </p>

                <p className="mt-2 font-mono font-bold">
                  {state.boxBarcode}
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Toplam Bağlı Koli
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {state.linkedBoxCount}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <datalist id="pallet-options">
        {pallets.map((pallet) => (
          <option
            key={pallet.id}
            value={pallet.barcode}
          >
            {pallet.status} — Bağlı koli:{" "}
            {linkedBoxCounts[
              pallet.barcode
            ] ?? pallet.linkedBoxCount}
            {" — Direkt stok: "}
            {pallet.totalQuantity}
          </option>
        ))}
      </datalist>

      <datalist id="box-options">
        {boxes.map((box) => (
          <option
            key={box.id}
            value={box.barcode}
          >
            {box.status} — Stok:{" "}
            {box.totalQuantity}
          </option>
        ))}
      </datalist>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Hedef Palet Barkodu
          </span>

          <input
            ref={palletInputRef}
            name="palletBarcode"
            list="pallet-options"
            value={palletBarcode}
            onChange={(event) =>
              setPalletBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handlePalletKeyDown
            }
            autoComplete="off"
            placeholder="Palet barkodunu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {selectedPallet ? (
            <p className="mt-2 text-sm font-semibold text-blue-700">
              {selectedPallet.status}
              {" — Bağlı koli: "}
              {currentLinkedBoxCount}
              {" — Direkt ürün: "}
              {selectedPallet.totalQuantity}
            </p>
          ) : (
            normalizedPalletBarcode && (
              <p className="mt-2 text-sm font-semibold text-orange-700">
                Barkod sunucuda kontrol
                edilecektir.
              </p>
            )
          )}
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Koli Barkodu
          </span>

          <input
            ref={boxInputRef}
            name="boxBarcode"
            list="box-options"
            value={boxBarcode}
            onChange={(event) =>
              setBoxBarcode(
                event.target.value.toUpperCase()
              )
            }
            autoComplete="off"
            placeholder="Koli barkodunu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {selectedBox ? (
            <p className="mt-2 text-sm font-semibold text-green-700">
              {selectedBox.status}
              {" — Koli stoğu: "}
              {selectedBox.totalQuantity}
            </p>
          ) : (
            normalizedBoxBarcode && (
              <p className="mt-2 text-sm font-semibold text-orange-700">
                Barkod sunucuda kontrol
                edilecektir.
              </p>
            )
          )}
        </label>
      </div>

      {normalizedPalletBarcode &&
        normalizedBoxBarcode &&
        normalizedPalletBarcode ===
          normalizedBoxBarcode && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            Palet ve koli barkodu aynı
            olamaz.
          </div>
        )}

      <button
        type="submit"
        disabled={
          isPending || !canSubmit
        }
        className={`mt-8 w-full rounded-xl py-5 text-lg font-bold ${
          !isPending && canSubmit
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Koli Palete Bağlanıyor..."
          : "Koliyi Palete Bağla"}
      </button>
    </form>
  );
}