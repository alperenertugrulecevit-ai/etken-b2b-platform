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

type ProductOption = {
  itemId: number;
  productId: number;
  code: string;
  barcode: string;
  name: string;
  quantity: number;
  reservedStock: number;
};

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  warehouseCode: string;
  locationCode: string;

  totalQuantity: number;
  reservedQuantity: number;
  childUnitCount: number;

  products: ProductOption[];
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

export default function HandlingUnitFullTransferForm({
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
    currentUnitQuantities,
    setCurrentUnitQuantities,
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
      ? currentUnitQuantities[
          normalizedSource
        ] ?? 0
      : 0;

  const targetQuantity =
    normalizedTarget
      ? currentUnitQuantities[
          normalizedTarget
        ] ?? 0
      : 0;

  useEffect(() => {
    sourceInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCurrentUnitQuantities(
      Object.fromEntries(
        handlingUnits.map((unit) => [
          unit.barcode.toUpperCase(),
          unit.totalQuantity,
        ])
      )
    );
  }, [handlingUnits]);

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
      state.transferredProductCount,
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

    setCurrentUnitQuantities(
      (current) => ({
        ...current,

        [sourceKey]: 0,

        [targetKey]:
          state.targetTotalQuantity,
      })
    );

    if (state.sourceUnitId) {
      setProcessedSourceIds(
        (current) =>
          current.includes(
            state.sourceUnitId as number
          )
            ? current
            : [
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
    state.transferredProductCount,
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

  function swapUnits() {
    setSourceBarcode(
      targetBarcode
    );

    setTargetBarcode(
      sourceBarcode
    );

    setShowMessage(false);
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

  const sourceHasReservedStock =
    (sourceUnit?.reservedQuantity ??
      0) > 0;

  const sourceHasChildUnits =
    (sourceUnit?.childUnitCount ??
      0) > 0;

  const canSubmit =
    Boolean(sourceUnit) &&
    Boolean(targetUnit) &&
    normalizedSource !==
      normalizedTarget &&
    sourceQuantity > 0 &&
    !sourceHasReservedStock &&
    !sourceHasChildUnits;

  return (
    <form
      action={formAction}
      onSubmit={() =>
        setShowMessage(true)
      }
      className="rounded-2xl bg-white p-8 shadow"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Komple THM Transferi
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Kaynak koli veya palette bulunan
            bütün ürünleri ve miktarları tek
            işlemle hedef taşıma birimine
            aktarın.
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          disabled={isPending}
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Temizle
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-orange-50 p-6">
          <p className="text-sm font-semibold uppercase text-orange-700">
            Kaynak THM Stoğu
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-900">
            {sourceQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold">
            {normalizedSource ||
              "Kaynak seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase text-green-700">
            Hedef THM Stoğu
          </p>

          <p className="mt-3 text-4xl font-bold text-green-900">
            {targetQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold">
            {normalizedTarget ||
              "Hedef seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase text-blue-700">
            Oturum Transferi
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {sessionTransferredQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm font-semibold">
            İşlem:{" "}
            {sessionTransferCount}
          </p>
        </article>
      </div>

      {showMessage &&
        state.message && (
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
                ? "Komple transfer başarılı"
                : "Komple transfer gerçekleştirilemedi"}
            </p>

            <p className="mt-2 leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Kaynak
                  </p>

                  <p className="mt-2 font-mono font-bold">
                    {state.sourceBarcode}
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Hedef
                  </p>

                  <p className="mt-2 font-mono font-bold">
                    {state.targetBarcode}
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Ürün Çeşidi
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      state.transferredProductCount
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Toplam Adet
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      state.transferredQuantity
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="full-transfer-unit-options">
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
              {currentUnitQuantities[
                unit.barcode.toUpperCase()
              ] ?? unit.totalQuantity}
            </option>
          )
        )}
      </datalist>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_90px_1fr]">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Kaynak Koli / Palet
          </span>

          <input
            ref={sourceInputRef}
            name="sourceBarcode"
            list="full-transfer-unit-options"
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
            placeholder="Kaynak THM barkodunu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {normalizedSource &&
            !sourceUnit && (
              <p className="mt-2 font-semibold text-red-700">
                Kullanılabilir kaynak taşıma
                birimi bulunamadı.
              </p>
            )}

          {sourceUnit && (
            <div className="mt-3 rounded-xl bg-orange-50 p-4 text-orange-900">
              <p className="font-bold">
                {sourceUnit.unitType}
                {" — "}
                {sourceUnit.status}
              </p>

              <p className="mt-2 text-sm">
                Ürün çeşidi:{" "}
                {sourceUnit.products.length}
                {" | "}
                Toplam stok:{" "}
                {sourceQuantity}
                {" | "}
                Rezerve:{" "}
                {sourceUnit.reservedQuantity}
              </p>

              <p className="mt-2 font-mono text-sm">
                Adres:{" "}
                {sourceUnit.warehouseCode &&
                sourceUnit.locationCode
                  ? `${sourceUnit.warehouseCode}/${sourceUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>

              {sourceHasChildUnits && (
                <p className="mt-3 rounded-lg bg-red-100 p-3 font-bold text-red-800">
                  Bu THM üzerinde{" "}
                  {sourceUnit.childUnitCount}{" "}
                  bağlı alt koli bulunuyor.
                </p>
              )}
            </div>
          )}
        </label>

        <div className="flex items-end justify-center">
          <button
            type="button"
            onClick={swapUnits}
            disabled={isPending}
            className="mb-7 rounded-xl border border-slate-300 bg-white px-5 py-4 text-xl font-bold hover:bg-slate-50"
          >
            ⇄
          </button>
        </div>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Hedef Koli / Palet
          </span>

          <input
            ref={targetInputRef}
            name="targetBarcode"
            list="full-transfer-unit-options"
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
            placeholder="Hedef THM barkodunu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {normalizedTarget &&
            !targetUnit && (
              <p className="mt-2 font-semibold text-red-700">
                Kullanılabilir hedef taşıma
                birimi bulunamadı.
              </p>
            )}

          {targetUnit && (
            <div className="mt-3 rounded-xl bg-green-50 p-4 text-green-900">
              <p className="font-bold">
                {targetUnit.unitType}
                {" — "}
                {targetUnit.status}
              </p>

              <p className="mt-2 text-sm">
                Mevcut ürün çeşidi:{" "}
                {targetUnit.products.length}
                {" | "}
                Mevcut stok:{" "}
                {targetQuantity}
              </p>

              <p className="mt-2 font-mono text-sm">
                Adres:{" "}
                {targetUnit.warehouseCode &&
                targetUnit.locationCode
                  ? `${targetUnit.warehouseCode}/${targetUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>
      </div>

      {sourceUnit && (
        <div className="mt-8 rounded-2xl border p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">
                Aktarılacak Kaynak İçeriği
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Aşağıdaki ürünlerin tamamı
                hedef taşıma birimine
                aktarılacaktır.
              </p>
            </div>

            <div className="rounded-xl bg-orange-100 px-5 py-3 text-center">
              <p className="text-xs font-semibold uppercase">
                Toplam
              </p>

              <p className="mt-1 text-2xl font-bold">
                {sourceQuantity}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4">
                    Ürün Kodu
                  </th>

                  <th className="p-4">
                    Barkod
                  </th>

                  <th className="p-4">
                    Ürün
                  </th>

                  <th className="p-4">
                    Miktar
                  </th>

                  <th className="p-4">
                    Rezerve
                  </th>
                </tr>
              </thead>

              <tbody>
                {sourceUnit.products.map(
                  (product) => (
                    <tr
                      key={product.itemId}
                      className="border-t"
                    >
                      <td className="p-4 font-bold text-blue-900">
                        {product.code}
                      </td>

                      <td className="p-4 font-mono">
                        {product.barcode}
                      </td>

                      <td className="p-4">
                        {product.name}
                      </td>

                      <td className="p-4 text-xl font-bold">
                        {product.quantity}
                      </td>

                      <td className="p-4 font-bold text-orange-700">
                        {
                          product.reservedStock
                        }
                      </td>
                    </tr>
                  )
                )}

                {sourceUnit.products.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-gray-500"
                    >
                      Kaynak taşıma biriminde
                      ürün bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
          ? "KOMPLE TRANSFER YAPILIYOR..."
          : "KAYNAĞIN TAMAMINI HEDEFE TRANSFER ET"}
      </button>
    </form>
  );
}