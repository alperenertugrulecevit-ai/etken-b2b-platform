"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  mergeHandlingUnits,
  type HandlingUnitBulkMergeState,
} from "@/app/admin/handling-units/merge/actions";

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;
  totalQuantity: number;
  reservedQuantity: number;
  childUnitCount: number;
};

type Props = {
  handlingUnits: HandlingUnitOption[];
};

const initialState:
  HandlingUnitBulkMergeState = {
  success: false,
  message: "",

  targetBarcode: "",
  targetStockQuantity: 0,

  mergedSourceCount: 0,
  transferredProductCount: 0,
  transferredQuantity: 0,
};

export default function HandlingUnitBulkMergeForm({
  handlingUnits,
}: Props) {
  const sourceInputRef =
    useRef<HTMLInputElement>(null);

  const [
    targetBarcode,
    setTargetBarcode,
  ] = useState("");

  const [
    sourceInput,
    setSourceInput,
  ] = useState("");

  const [
    selectedSourceBarcodes,
    setSelectedSourceBarcodes,
  ] = useState<string[]>([]);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    mergeHandlingUnits,
    initialState
  );

  const normalizedTargetBarcode =
    targetBarcode
      .trim()
      .toUpperCase();

  const normalizedSourceInput =
    sourceInput
      .trim()
      .toUpperCase();

  const selectedSourceUnits =
    useMemo(
      () =>
        selectedSourceBarcodes
          .map((barcode) =>
            handlingUnits.find(
              (unit) =>
                unit.barcode ===
                barcode
            )
          )
          .filter(
            (
              unit
            ): unit is HandlingUnitOption =>
              Boolean(unit)
          ),
      [
        handlingUnits,
        selectedSourceBarcodes,
      ]
    );

  const targetUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode ===
          normalizedTargetBarcode
      ),
    [
      handlingUnits,
      normalizedTargetBarcode,
    ]
  );

  const selectedSourceQuantity =
    selectedSourceUnits.reduce(
      (total, unit) =>
        total + unit.totalQuantity,
      0
    );

  const selectedReservedQuantity =
    selectedSourceUnits.reduce(
      (total, unit) =>
        total +
        unit.reservedQuantity,
      0
    );

  const expectedTargetQuantity =
    (targetUnit?.totalQuantity ?? 0) +
    selectedSourceQuantity;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setTargetBarcode(
      state.targetBarcode
    );

    setSelectedSourceBarcodes([]);
    setSourceInput("");

    window.setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.targetBarcode,
  ]);

  function addSourceBarcode() {
    if (!normalizedSourceInput) {
      return;
    }

    const sourceUnit =
      handlingUnits.find(
        (unit) =>
          unit.barcode ===
          normalizedSourceInput
      );

    if (!sourceUnit) {
      window.alert(
        "Bu barkodla açık bir koli veya palet bulunamadı."
      );
      return;
    }

    if (
      normalizedSourceInput ===
      normalizedTargetBarcode
    ) {
      window.alert(
        "Hedef taşıma birimi kaynak olarak eklenemez."
      );
      return;
    }

    if (
      selectedSourceBarcodes.includes(
        normalizedSourceInput
      )
    ) {
      window.alert(
        "Bu taşıma birimi kaynak listesinde zaten bulunuyor."
      );
      return;
    }

    setSelectedSourceBarcodes(
      (current) => [
        ...current,
        normalizedSourceInput,
      ]
    );

    setSourceInput("");

    window.setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  }

  function removeSourceBarcode(
    barcode: string
  ) {
    setSelectedSourceBarcodes(
      (current) =>
        current.filter(
          (item) => item !== barcode
        )
    );
  }

  function clearForm() {
    setTargetBarcode("");
    setSourceInput("");
    setSelectedSourceBarcodes([]);

    window.setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  }

  function handleSourceKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSourceBarcode();
    }
  }

  const canSubmit =
    normalizedTargetBarcode &&
    Boolean(targetUnit) &&
    selectedSourceBarcodes.length > 0 &&
    selectedReservedQuantity === 0 &&
    !selectedSourceBarcodes.includes(
      normalizedTargetBarcode
    );

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-8 shadow"
    >
      <input
        type="hidden"
        name="sourceBarcodes"
        value={JSON.stringify(
          selectedSourceBarcodes
        )}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Toplu Koli / Palet Birleştirme
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Birden fazla kaynak taşıma
            biriminin tüm ürünlerini tek
            hedef koli veya palette
            birleştirin.
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
        <article className="rounded-2xl bg-orange-50 p-6">
          <p className="text-sm font-semibold uppercase text-orange-700">
            Kaynak THM Sayısı
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-800">
            {
              selectedSourceBarcodes.length
            }
          </p>

          <p className="mt-3 text-sm font-semibold text-orange-700">
            Toplam kaynak stok:{" "}
            {selectedSourceQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase text-green-700">
            Hedef Mevcut Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-green-800">
            {(
              targetUnit?.totalQuantity ??
              state.targetStockQuantity
            ).toLocaleString("tr-TR")}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold text-green-700">
            {normalizedTargetBarcode ||
              state.targetBarcode ||
              "Hedef seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase text-blue-700">
            Beklenen Hedef Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {expectedTargetQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm font-semibold text-blue-700">
            Hedef + seçilen kaynaklar
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
              ? "Birleştirme başarılı"
              : "Birleştirme gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Birleştirilen Kaynak
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    state.mergedSourceCount
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Transfer Edilen
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    state.transferredQuantity
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Hedef Yeni Bakiye
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    state.targetStockQuantity
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <datalist id="merge-unit-options">
        {handlingUnits.map((unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType} — Stok:{" "}
            {unit.totalQuantity} — Rezerve:{" "}
            {unit.reservedQuantity}
          </option>
        ))}
      </datalist>

      <div className="mt-8">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Hedef Koli / Palet
          </span>

          <input
            name="targetBarcode"
            list="merge-unit-options"
            value={targetBarcode}
            onChange={(event) =>
              setTargetBarcode(
                event.target.value.toUpperCase()
              )
            }
            autoComplete="off"
            placeholder="Hedef barkodu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {targetUnit && (
            <p className="mt-2 text-sm font-semibold text-green-700">
              {targetUnit.unitType}
              {" — "}
              {targetUnit.status}
              {" — Stok: "}
              {targetUnit.totalQuantity}
            </p>
          )}
        </label>
      </div>

      <div className="mt-8 rounded-2xl border p-6">
        <h3 className="text-xl font-bold">
          Kaynak Taşıma Birimleri
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Barkodu okutun ve Enter tuşuna
          basın. Her kaynak listeye eklenir.
        </p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            ref={sourceInputRef}
            list="merge-unit-options"
            value={sourceInput}
            onChange={(event) =>
              setSourceInput(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleSourceKeyDown
            }
            autoComplete="off"
            placeholder="Kaynak barkodu okutun"
            className="min-w-0 flex-1 rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
          />

          <button
            type="button"
            onClick={addSourceBarcode}
            disabled={
              isPending ||
              !normalizedSourceInput
            }
            className="rounded-xl bg-slate-800 px-7 py-4 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Kaynağı Ekle
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {selectedSourceUnits.map(
            (unit, index) => (
              <article
                key={unit.id}
                className={`grid items-center gap-4 rounded-xl border p-4 md:grid-cols-[50px_1fr_150px_150px_120px] ${
                  unit.reservedQuantity >
                  0
                    ? "border-red-200 bg-red-50"
                    : "bg-slate-50"
                }`}
              >
                <span className="text-center text-lg font-bold text-gray-400">
                  {index + 1}
                </span>

                <div>
                  <p className="font-mono text-lg font-bold text-blue-900">
                    {unit.barcode}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {unit.unitType}
                    {" — "}
                    {unit.status}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Stok
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {unit.totalQuantity}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Rezerve
                  </p>

                  <p
                    className={`mt-1 text-xl font-bold ${
                      unit.reservedQuantity >
                      0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}
                  >
                    {
                      unit.reservedQuantity
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeSourceBarcode(
                      unit.barcode
                    )
                  }
                  disabled={isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Kaldır
                </button>
              </article>
            )
          )}

          {selectedSourceUnits.length ===
            0 && (
            <div className="rounded-xl bg-slate-100 p-8 text-center text-gray-500">
              Henüz kaynak taşıma birimi
              eklenmedi.
            </div>
          )}
        </div>
      </div>

      {selectedReservedQuantity > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">
          Kaynaklardan birinde rezerve stok
          bulunuyor. Rezerve stok kaldırılmadan
          toplu birleştirme yapılamaz.
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
          ? "Taşıma Birimleri Birleştiriliyor..."
          : `${selectedSourceBarcodes.length} Kaynağı Hedefte Birleştir`}
      </button>
    </form>
  );
}