"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  unaddressHandlingUnits,
  type HandlingUnitUnaddressState,
} from "@/app/admin/handling-units/unaddressing/actions";

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  warehouseCode: string;
  warehouseName: string;
  locationCode: string;

  directStockQuantity: number;
  childStockQuantity: number;
  childUnitCount: number;
};

type Props = {
  handlingUnits: HandlingUnitOption[];
};

const initialState:
  HandlingUnitUnaddressState = {
  success: false,
  message: "",

  selectedMainUnitCount: 0,
  affectedUnitCount: 0,
  openedUnitCount: 0,
  emptiedUnitCount: 0,
  totalStockQuantity: 0,
};

export default function HandlingUnitUnaddressForm({
  handlingUnits,
}: Props) {
  const barcodeInputRef =
    useRef<HTMLInputElement>(null);

  const [
    barcodeInput,
    setBarcodeInput,
  ] = useState("");

  const [
    selectedBarcodes,
    setSelectedBarcodes,
  ] = useState<string[]>([]);

  const [
    showActionMessage,
    setShowActionMessage,
  ] = useState(true);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    unaddressHandlingUnits,
    initialState
  );

  const normalizedBarcodeInput =
    barcodeInput
      .trim()
      .toUpperCase();

  const selectedUnits = useMemo(
    () =>
      selectedBarcodes
        .map((barcode) =>
          handlingUnits.find(
            (unit) =>
              unit.barcode === barcode
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
      selectedBarcodes,
    ]
  );

  const selectedMainUnitCount =
    selectedUnits.length;

  const selectedChildUnitCount =
    selectedUnits.reduce(
      (total, unit) =>
        total + unit.childUnitCount,
      0
    );

  const selectedAffectedUnitCount =
    selectedMainUnitCount +
    selectedChildUnitCount;

  const selectedStockQuantity =
    selectedUnits.reduce(
      (total, unit) =>
        total +
        unit.directStockQuantity +
        unit.childStockQuantity,
      0
    );

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setShowActionMessage(true);
    setSelectedBarcodes([]);
    setBarcodeInput("");

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
  ]);

  function addHandlingUnit() {
    if (!normalizedBarcodeInput) {
      return;
    }

    const handlingUnit =
      handlingUnits.find(
        (unit) =>
          unit.barcode ===
          normalizedBarcodeInput
      );

    if (!handlingUnit) {
      window.alert(
        "Bu barkodla lokasyonda bulunan bağımsız bir koli veya palet bulunamadı."
      );

      return;
    }

    if (
      selectedBarcodes.includes(
        normalizedBarcodeInput
      )
    ) {
      window.alert(
        "Bu taşıma birimi listeye daha önce eklendi."
      );

      setBarcodeInput("");

      return;
    }

    setSelectedBarcodes(
      (current) => [
        ...current,
        normalizedBarcodeInput,
      ]
    );

    setBarcodeInput("");

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }

  function removeHandlingUnit(
    barcode: string
  ) {
    setSelectedBarcodes(
      (current) =>
        current.filter(
          (item) =>
            item !== barcode
        )
    );
  }

  function handleBarcodeKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addHandlingUnit();
    }
  }

  function clearForm() {
    setBarcodeInput("");
    setSelectedBarcodes([]);
    setShowActionMessage(false);

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }

  const canSubmit =
    selectedBarcodes.length > 0;

  return (
    <form
      action={formAction}
      onSubmit={() =>
        setShowActionMessage(true)
      }
      className="rounded-2xl bg-white p-8 shadow"
    >
      <input
        type="hidden"
        name="handlingUnitBarcodes"
        value={JSON.stringify(
          selectedBarcodes
        )}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Koli / Palet Adres Kaldırma
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Lokasyondan çıkarılacak koli veya
            palet barkodlarını okutun. Palet
            seçildiğinde bağlı kolileri de
            birlikte çıkarılır.
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
            Seçilen Ana THM
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-800">
            {selectedMainUnitCount}
          </p>

          <p className="mt-3 text-sm font-semibold text-orange-700">
            Bağlı koli:{" "}
            {selectedChildUnitCount}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase text-green-700">
            Etkilenecek THM
          </p>

          <p className="mt-3 text-4xl font-bold text-green-800">
            {selectedAffectedUnitCount}
          </p>

          <p className="mt-3 text-sm font-semibold text-green-700">
            Palet ve bağlı koliler
          </p>
        </article>

        <article className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase text-blue-700">
            Toplam Stok Miktarı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {selectedStockQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm font-semibold text-blue-700">
            Lokasyondan çıkarılacak stok
          </p>
        </article>
      </div>

      {showActionMessage &&
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
                ? "Adres kaldırma başarılı"
                : "Adres kaldırma gerçekleştirilemedi"}
            </p>

            <p className="mt-2 leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Ana THM
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      state.selectedMainUnitCount
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Güncellenen THM
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      state.affectedUnitCount
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Açık Yapılan
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      state.openedUnitCount
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase">
                    Boş Yapılan
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      state.emptiedUnitCount
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="unaddress-unit-options">
        {handlingUnits.map((unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType}
            {" — "}
            {unit.status}
            {" — "}
            {unit.warehouseCode}
            {" / "}
            {unit.locationCode}
            {" — Stok: "}
            {unit.directStockQuantity +
              unit.childStockQuantity}
          </option>
        ))}
      </datalist>

      <div className="mt-8 rounded-2xl border p-6">
        <h3 className="text-xl font-bold">
          Taşıma Birimlerini Okut
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Barkodu okut ve Enter tuşuna bas.
          Her taşıma birimi listeye eklenir.
        </p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            ref={barcodeInputRef}
            list="unaddress-unit-options"
            value={barcodeInput}
            onChange={(event) =>
              setBarcodeInput(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleBarcodeKeyDown
            }
            autoComplete="off"
            placeholder="Lokasyondaki koli veya paleti okutun"
            className="min-w-0 flex-1 rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
          />

          <button
            type="button"
            onClick={addHandlingUnit}
            disabled={
              isPending ||
              !normalizedBarcodeInput
            }
            className="rounded-xl bg-slate-800 px-7 py-4 font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Listeye Ekle
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {selectedUnits.map(
            (unit, index) => {
              const totalQuantity =
                unit.directStockQuantity +
                unit.childStockQuantity;

              return (
                <article
                  key={unit.id}
                  className="grid items-center gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-[50px_1fr_130px_130px_200px_110px]"
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
                      {totalQuantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Bağlı Koli
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {
                        unit.childUnitCount
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Mevcut Adres
                    </p>

                    <p className="mt-1 font-mono text-sm font-bold">
                      {unit.warehouseCode}
                      {" / "}
                      {unit.locationCode}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeHandlingUnit(
                        unit.barcode
                      )
                    }
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Kaldır
                  </button>
                </article>
              );
            }
          )}

          {selectedUnits.length === 0 && (
            <div className="rounded-xl bg-slate-100 p-8 text-center text-gray-500">
              Henüz koli veya palet
              okutulmadı.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
        <p className="font-bold">
          İşlem Sonucu
        </p>

        <p className="mt-2 leading-6">
          Taşıma birimlerinin depo ve
          lokasyon bilgileri temizlenir.
          Ürün miktarları ve koli–palet
          bağlantıları korunur.
        </p>
      </div>

      <button
        type="submit"
        disabled={
          isPending || !canSubmit
        }
        className={`mt-8 w-full rounded-xl py-5 text-lg font-bold ${
          !isPending && canSubmit
            ? "bg-red-700 text-white hover:bg-red-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Lokasyondan Çıkarılıyor..."
          : `${selectedBarcodes.length} Taşıma Biriminin Adresini Kaldır`}
      </button>
    </form>
  );
}