"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  rfUnlinkBoxFromPallet,
  type RFPalletUnlinkState,
} from "@/app/rf/pallet-unlink/actions";

type LinkedBoxOption = {
  id: number;
  barcode: string;
  status: string;

  palletId: number;
  palletBarcode: string;

  warehouseCode: string;
  locationCode: string;

  totalQuantity: number;
};

type Props = {
  linkedBoxes: LinkedBoxOption[];
};

const initialState:
  RFPalletUnlinkState = {
  success: false,
  message: "",

  boxId: null,
  boxBarcode: "",
  boxStockQuantity: 0,
  boxNextStatus: "",

  palletId: null,
  palletBarcode: "",
  remainingBoxCount: 0,
};

export default function RFPalletBoxUnlinkForm({
  linkedBoxes,
}: Props) {
  const boxInputRef =
    useRef<HTMLInputElement>(null);

  const lastHandledResultRef =
    useRef("");

  const [
    boxBarcode,
    setBoxBarcode,
  ] = useState("");

  const [
    processedBoxIds,
    setProcessedBoxIds,
  ] = useState<number[]>([]);

  const [
    sessionUnlinkedCount,
    setSessionUnlinkedCount,
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
    rfUnlinkBoxFromPallet,
    initialState
  );

  const normalizedBoxBarcode =
    boxBarcode
      .trim()
      .toUpperCase();

  const availableLinkedBoxes =
    useMemo(
      () =>
        linkedBoxes.filter(
          (box) =>
            !processedBoxIds.includes(
              box.id
            )
        ),
      [
        linkedBoxes,
        processedBoxIds,
      ]
    );

  const selectedBox =
    useMemo(
      () =>
        availableLinkedBoxes.find(
          (box) =>
            box.barcode
              .trim()
              .toUpperCase() ===
            normalizedBoxBarcode
        ),
      [
        availableLinkedBoxes,
        normalizedBoxBarcode,
      ]
    );

  useEffect(() => {
    boxInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const resultKey = [
      state.boxId,
      state.boxBarcode,
      state.palletId,
      state.palletBarcode,
      state.remainingBoxCount,
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

    if (state.boxId) {
      setProcessedBoxIds(
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

    setSessionUnlinkedCount(
      (current) => current + 1
    );

    setSessionStockQuantity(
      (current) =>
        current +
        state.boxStockQuantity
    );

    setBoxBarcode("");

    window.setTimeout(() => {
      boxInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.boxId,
    state.boxBarcode,
    state.boxStockQuantity,
    state.palletId,
    state.palletBarcode,
    state.remainingBoxCount,
  ]);

  function clearForm() {
    setBoxBarcode("");

    setSessionUnlinkedCount(0);
    setSessionStockQuantity(0);

    setShowMessage(false);

    /*
     * İşlem yapılan kolilerin tekrar
     * seçilmemesi için processedBoxIds
     * temizlenmez.
     */

    window.setTimeout(() => {
      boxInputRef.current?.focus();
    }, 100);
  }

  function handleBoxKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedBox) {
      event.currentTarget.form
        ?.requestSubmit();
    }
  }

  const canSubmit =
    Boolean(selectedBox) &&
    normalizedBoxBarcode.length > 0;

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
            Bağlı Koli → Paletten Ayır
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
            Bağlı Koli
          </p>

          <p className="mt-2 text-2xl font-black text-blue-900">
            {
              availableLinkedBoxes.length
            }
          </p>
        </article>

        <article className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-green-700">
            Oturumda Ayrılan
          </p>

          <p className="mt-2 text-2xl font-black text-green-900">
            {sessionUnlinkedCount}
          </p>
        </article>

        <article className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-orange-700">
            Ayrılan Stok
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
                ? "✓ Ayırma Başarılı"
                : "✕ Ayırma Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Ayrılan Koli
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold">
                    {state.boxBarcode}
                  </p>

                  <p className="mt-1 text-xs font-bold">
                    Durum:{" "}
                    {
                      state.boxNextStatus
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Palet
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold">
                    {
                      state.palletBarcode
                    }
                  </p>

                  <p className="mt-1 text-xs font-bold">
                    Kalan koli:{" "}
                    {
                      state.remainingBoxCount
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="rf-linked-box-options">
        {availableLinkedBoxes.map(
          (box) => (
            <option
              key={box.id}
              value={box.barcode}
            >
              Palet:{" "}
              {box.palletBarcode}
              {" — Stok: "}
              {box.totalQuantity}
            </option>
          )
        )}
      </datalist>

      <div className="mt-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            Bağlı Koli Barkodu
          </span>

          <input
            ref={boxInputRef}
            name="boxBarcode"
            list="rf-linked-box-options"
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
            placeholder="Paletten ayrılacak koliyi okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {normalizedBoxBarcode &&
            !selectedBox && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Bu barkodla palete bağlı bir
                koli bulunamadı.
              </p>
            )}

          {selectedBox && (
            <div className="mt-3 rounded-xl bg-blue-50 p-4 text-blue-900">
              <p className="text-xs font-black uppercase text-blue-600">
                Bağlı Olduğu Palet
              </p>

              <p className="mt-1 font-mono text-xl font-black">
                {
                  selectedBox.palletBarcode
                }
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Koli Stoğu
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedBox.totalQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Durum
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      selectedBox.status
                    }
                  </p>
                </div>
              </div>

              <p className="mt-3 font-mono text-xs">
                Adres:{" "}
                {selectedBox.warehouseCode &&
                selectedBox.locationCode
                  ? `${selectedBox.warehouseCode}/${selectedBox.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
        <p className="font-black">
          Fiziksel Konum
        </p>

        <p className="mt-2 text-sm leading-6">
          Koli paletten ayrıldıktan sonra
          aynı depo ve lokasyonda kalır.
          Yalnızca palet bağlantısı
          kaldırılır.
        </p>
      </div>

      <button
        type="submit"
        disabled={
          isPending || !canSubmit
        }
        className={`mt-6 w-full rounded-xl py-5 text-xl font-black ${
          !isPending && canSubmit
            ? "bg-red-700 text-white active:bg-red-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "KOLİ PALETTEN AYRILIYOR..."
          : "KOLİYİ PALETTEN AYIR"}
      </button>
    </form>
  );
}