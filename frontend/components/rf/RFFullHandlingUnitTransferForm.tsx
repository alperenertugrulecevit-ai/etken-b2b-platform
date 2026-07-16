"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fullTransferHandlingUnit,
  type FullHandlingUnitTransferState,
} from "@/app/admin/handling-units/full-transfer/actions";

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  warehouseCode: string;
  locationCode: string;

  totalQuantity: number;
  reservedQuantity: number;
  productCount: number;
  childUnitCount: number;
};

type Props = {
  handlingUnits: HandlingUnitOption[];
};

const initialState:
  FullHandlingUnitTransferState = {
  success: false,
  message: "",

  sourceUnitId: null,
  sourceBarcode: "",
  sourceRemainingQuantity: 0,

  targetUnitId: null,
  targetBarcode: "",
  targetTotalQuantity: 0,

  transferredProductCount: 0,
  transferredQuantity: 0,
};

export default function RFFullHandlingUnitTransferForm({
  handlingUnits,
}: Props) {
  const sourceInputRef =
    useRef<HTMLInputElement>(null);

  const targetInputRef =
    useRef<HTMLInputElement>(null);

  const lastHandledResultRef =
    useRef("");

  const [
    sourceBarcode,
    setSourceBarcode,
  ] = useState("");

  const [
    targetBarcode,
    setTargetBarcode,
  ] = useState("");

  const [
    processedSourceIds,
    setProcessedSourceIds,
  ] = useState<number[]>([]);

  const [
    currentQuantities,
    setCurrentQuantities,
  ] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        handlingUnits.map((unit) => [
          unit.barcode.toUpperCase(),
          unit.totalQuantity,
        ])
      )
  );

  const [
    sessionTransferCount,
    setSessionTransferCount,
  ] = useState(0);

  const [
    sessionTransferredQuantity,
    setSessionTransferredQuantity,
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
    fullTransferHandlingUnit,
    initialState
  );

  const normalizedSource =
    sourceBarcode
      .trim()
      .toUpperCase();

  const normalizedTarget =
    targetBarcode
      .trim()
      .toUpperCase();

  const sourceUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode.toUpperCase() ===
            normalizedSource &&
          !processedSourceIds.includes(
            unit.id
          )
      ),
    [
      handlingUnits,
      normalizedSource,
      processedSourceIds,
    ]
  );

  const targetUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode.toUpperCase() ===
          normalizedTarget
      ),
    [
      handlingUnits,
      normalizedTarget,
    ]
  );

  const sourceQuantity =
    normalizedSource
      ? currentQuantities[
          normalizedSource
        ] ?? 0
      : 0;

  const targetQuantity =
    normalizedTarget
      ? currentQuantities[
          normalizedTarget
        ] ?? 0
      : 0;

  useEffect(() => {
    sourceInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const resultKey = [
      state.sourceUnitId,
      state.sourceBarcode,
      state.targetUnitId,
      state.targetBarcode,
      state.targetTotalQuantity,
      state.transferredQuantity,
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

    const sourceKey =
      state.sourceBarcode.toUpperCase();

    const targetKey =
      state.targetBarcode.toUpperCase();

    setCurrentQuantities(
      (current) => ({
        ...current,

        [sourceKey]: 0,

        [targetKey]:
          state.targetTotalQuantity,
      })
    );

    if (state.sourceUnitId) {
      setProcessedSourceIds(
        (current) => [
          ...current,
          state.sourceUnitId as number,
        ]
      );
    }

    setSessionTransferCount(
      (current) => current + 1
    );

    setSessionTransferredQuantity(
      (current) =>
        current +
        state.transferredQuantity
    );

    setSourceBarcode("");
    setTargetBarcode("");

    window.setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.sourceUnitId,
    state.sourceBarcode,
    state.targetUnitId,
    state.targetBarcode,
    state.targetTotalQuantity,
    state.transferredQuantity,
  ]);

  function clearForm() {
    setSourceBarcode("");
    setTargetBarcode("");

    setSessionTransferCount(0);
    setSessionTransferredQuantity(0);

    setShowMessage(false);

    window.setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  }

  function handleSourceKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (sourceUnit) {
      targetInputRef.current?.focus();
    }
  }

  function handleTargetKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (canSubmit) {
      event.currentTarget.form
        ?.requestSubmit();
    }
  }

  const canSubmit =
    Boolean(sourceUnit) &&
    Boolean(targetUnit) &&
    normalizedSource !==
      normalizedTarget &&
    sourceQuantity > 0 &&
    (sourceUnit?.reservedQuantity ??
      0) === 0 &&
    (sourceUnit?.childUnitCount ??
      0) === 0;

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
            Kaynak THM → Hedef THM
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
        <article className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-orange-700">
            Kaynak Stok
          </p>

          <p className="mt-2 text-2xl font-black text-orange-900">
            {sourceQuantity}
          </p>
        </article>

        <article className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-green-700">
            Hedef Stok
          </p>

          <p className="mt-2 text-2xl font-black text-green-900">
            {targetQuantity}
          </p>
        </article>

        <article className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-blue-700">
            Aktarılan
          </p>

          <p className="mt-2 text-2xl font-black text-blue-900">
            {sessionTransferredQuantity}
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
                ? "✓ Komple Transfer Başarılı"
                : "✕ Komple Transfer Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Ürün Çeşidi
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      state.transferredProductCount
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Aktarılan Adet
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      state.transferredQuantity
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="rf-full-transfer-units">
        {handlingUnits.map(
          (unit) => (
            <option
              key={unit.id}
              value={unit.barcode}
            >
              {unit.unitType}
              {" — "}
              {unit.status}
              {" — Stok: "}
              {currentQuantities[
                unit.barcode.toUpperCase()
              ] ?? unit.totalQuantity}
            </option>
          )
        )}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Kaynak Koli / Palet
          </span>

          <input
            ref={sourceInputRef}
            name="sourceBarcode"
            list="rf-full-transfer-units"
            value={sourceBarcode}
            onChange={(event) =>
              setSourceBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleSourceKeyDown
            }
            autoComplete="off"
            placeholder="Kaynak THM barkodunu okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {sourceUnit && (
            <div className="mt-2 rounded-xl bg-orange-50 p-3 text-orange-900">
              <p className="font-black">
                {sourceUnit.unitType}
                {" — "}
                {sourceUnit.status}
              </p>

              <p className="mt-1 text-sm">
                Ürün çeşidi:{" "}
                {sourceUnit.productCount}
                {" | "}
                Stok: {sourceQuantity}
                {" | "}
                Rezerve:{" "}
                {sourceUnit.reservedQuantity}
              </p>

              <p className="mt-1 font-mono text-xs">
                {sourceUnit.warehouseCode &&
                sourceUnit.locationCode
                  ? `${sourceUnit.warehouseCode}/${sourceUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            2. Hedef Koli / Palet
          </span>

          <input
            ref={targetInputRef}
            name="targetBarcode"
            list="rf-full-transfer-units"
            value={targetBarcode}
            onChange={(event) =>
              setTargetBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleTargetKeyDown
            }
            autoComplete="off"
            placeholder={
              sourceUnit
                ? "Hedef THM barkodunu okut"
                : "Önce kaynak THM okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !sourceUnit
            }
            required
          />

          {targetUnit && (
            <div className="mt-2 rounded-xl bg-green-50 p-3 text-green-900">
              <p className="font-black">
                {targetUnit.unitType}
                {" — "}
                {targetUnit.status}
              </p>

              <p className="mt-1 text-sm">
                Mevcut stok:{" "}
                {targetQuantity}
              </p>

              <p className="mt-1 font-mono text-xs">
                {targetUnit.warehouseCode &&
                targetUnit.locationCode
                  ? `${targetUnit.warehouseCode}/${targetUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
        <p className="font-black">
          Dikkat
        </p>

        <p className="mt-2 text-sm leading-6">
          Kaynak taşıma birimindeki bütün
          ürünler ve miktarlar hedefe
          aktarılır. Kaynak işlem sonunda Boş
          olur.
        </p>
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
          ? "KOMPLE TRANSFER YAPILIYOR..."
          : "KOMPLE TRANSFERİ TAMAMLA"}
      </button>

      <p className="mt-4 text-center text-xs font-semibold text-slate-400">
        Bu oturumda tamamlanan işlem:{" "}
        {sessionTransferCount}
      </p>
    </form>
  );
}