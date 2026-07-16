"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  rfAddressHandlingUnit,
  type RFAddressingState,
} from "@/app/rf/addressing/actions";

type WarehouseOption = {
  id: number;
  code: string;
  name: string;
};

type LocationOption = {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  fullCode: string;
  locationType: string;
};

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  warehouseCode: string;
  locationCode: string;

  directStockQuantity: number;
  childStockQuantity: number;
  childUnitCount: number;
};

type Props = {
  warehouses: WarehouseOption[];
  locations: LocationOption[];
  handlingUnits: HandlingUnitOption[];
};

const initialState:
  RFAddressingState = {
  success: false,
  message: "",

  handlingUnitId: null,
  handlingUnitBarcode: "",

  warehouseCode: "",
  warehouseName: "",
  locationCode: "",

  affectedUnitCount: 0,
  totalStockQuantity: 0,
};

export default function RFHandlingUnitAddressForm({
  warehouses,
  locations,
  handlingUnits,
}: Props) {
  const warehouseInputRef =
    useRef<HTMLInputElement>(null);

  const locationInputRef =
    useRef<HTMLInputElement>(null);

  const handlingUnitInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * useActionState son sonucu bellekte
   * tuttuğu için aynı başarılı sonucu
   * yeniden işlemeyi engeller.
   */
  const lastHandledResultRef =
    useRef("");

  const [
    warehouseCode,
    setWarehouseCode,
  ] = useState("");

  const [
    locationBarcode,
    setLocationBarcode,
  ] = useState("");

  const [
    handlingUnitBarcode,
    setHandlingUnitBarcode,
  ] = useState("");

  const [
    sessionMainUnitCount,
    setSessionMainUnitCount,
  ] = useState(0);

  const [
    sessionAffectedUnitCount,
    setSessionAffectedUnitCount,
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
    rfAddressHandlingUnit,
    initialState
  );

  const normalizedWarehouseCode =
    warehouseCode
      .trim()
      .toUpperCase();

  const normalizedLocationBarcode =
    locationBarcode
      .trim()
      .toUpperCase();

  const normalizedHandlingUnitBarcode =
    handlingUnitBarcode
      .trim()
      .toUpperCase();

  const selectedWarehouse =
    useMemo(
      () =>
        warehouses.find(
          (warehouse) =>
            warehouse.code
              .trim()
              .toUpperCase() ===
            normalizedWarehouseCode
        ),
      [
        warehouses,
        normalizedWarehouseCode,
      ]
    );

  const warehouseLocations =
    useMemo(
      () => {
        if (!selectedWarehouse) {
          return [];
        }

        return locations.filter(
          (location) =>
            location.warehouseId ===
            selectedWarehouse.id
        );
      },
      [
        locations,
        selectedWarehouse,
      ]
    );

  const selectedLocation =
    useMemo(
      () =>
        warehouseLocations.find(
          (location) =>
            location.fullCode
              .trim()
              .toUpperCase() ===
            normalizedLocationBarcode
        ),
      [
        warehouseLocations,
        normalizedLocationBarcode,
      ]
    );

  const selectedHandlingUnit =
    useMemo(
      () =>
        handlingUnits.find(
          (unit) =>
            unit.barcode
              .trim()
              .toUpperCase() ===
            normalizedHandlingUnitBarcode
        ),
      [
        handlingUnits,
        normalizedHandlingUnitBarcode,
      ]
    );

  const selectedStockQuantity =
    selectedHandlingUnit
      ? selectedHandlingUnit
          .directStockQuantity +
        selectedHandlingUnit
          .childStockQuantity
      : 0;

  useEffect(() => {
    warehouseInputRef.current?.focus();
  }, []);

  /*
   * Depo değiştiğinde önceki deponun
   * lokasyon seçimini temizler.
   */
  useEffect(() => {
    setLocationBarcode("");
    setHandlingUnitBarcode("");
  }, [normalizedWarehouseCode]);

  /*
   * Lokasyon değiştiğinde önceki THM
   * barkodunu temizler.
   */
  useEffect(() => {
    setHandlingUnitBarcode("");
  }, [normalizedLocationBarcode]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const resultKey = [
      state.handlingUnitId,
      state.handlingUnitBarcode,
      state.warehouseCode,
      state.locationCode,
      state.affectedUnitCount,
      state.totalStockQuantity,
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

    setSessionMainUnitCount(
      (current) => current + 1
    );

    setSessionAffectedUnitCount(
      (current) =>
        current +
        state.affectedUnitCount
    );

    setSessionStockQuantity(
      (current) =>
        current +
        state.totalStockQuantity
    );

    /*
     * Aynı depo ve lokasyona seri
     * adresleme yapılabilmesi için yalnızca
     * THM alanı temizlenir.
     */
    setWarehouseCode(
      state.warehouseCode
    );

    setLocationBarcode(
      state.locationCode
    );

    setHandlingUnitBarcode("");

    window.setTimeout(() => {
      handlingUnitInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.handlingUnitId,
    state.handlingUnitBarcode,
    state.warehouseCode,
    state.locationCode,
    state.affectedUnitCount,
    state.totalStockQuantity,
  ]);

  function clearForm() {
    setWarehouseCode("");
    setLocationBarcode("");
    setHandlingUnitBarcode("");

    setSessionMainUnitCount(0);
    setSessionAffectedUnitCount(0);
    setSessionStockQuantity(0);

    setShowMessage(false);

    /*
     * Eski başarılı action sonucunun yeniden
     * işlenmemesi için ref temizlenmez.
     */

    window.setTimeout(() => {
      warehouseInputRef.current?.focus();
    }, 100);
  }

  function changeLocation() {
    setLocationBarcode("");
    setHandlingUnitBarcode("");
    setShowMessage(false);

    window.setTimeout(() => {
      locationInputRef.current?.focus();
    }, 100);
  }

  function handleWarehouseKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedWarehouse) {
      locationInputRef.current?.focus();
    }
  }

  function handleLocationKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedLocation) {
      handlingUnitInputRef.current?.focus();
    }
  }

  function handleHandlingUnitKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (
      selectedWarehouse &&
      selectedLocation &&
      selectedHandlingUnit
    ) {
      event.currentTarget.form
        ?.requestSubmit();
    }
  }

  const canSubmit =
    Boolean(selectedWarehouse) &&
    Boolean(selectedLocation) &&
    Boolean(selectedHandlingUnit) &&
    normalizedWarehouseCode.length > 0 &&
    normalizedLocationBarcode.length > 0 &&
    normalizedHandlingUnitBarcode.length >
      0;

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
            Depo → Lokasyon → Koli/Palet
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
            Ana THM
          </p>

          <p className="mt-2 text-2xl font-black text-orange-900">
            {sessionMainUnitCount}
          </p>
        </article>

        <article className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-green-700">
            Etkilenen
          </p>

          <p className="mt-2 text-2xl font-black text-green-900">
            {sessionAffectedUnitCount}
          </p>
        </article>

        <article className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-blue-700">
            Stok
          </p>

          <p className="mt-2 text-2xl font-black text-blue-900">
            {sessionStockQuantity}
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
                ? "✓ Adresleme Başarılı"
                : "✕ Adresleme Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Hedef
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold">
                    {state.warehouseCode}
                    {" / "}
                    {state.locationCode}
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Güncellenen THM
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      state.affectedUnitCount
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="rf-warehouse-options">
        {warehouses.map(
          (warehouse) => (
            <option
              key={warehouse.id}
              value={warehouse.code}
            >
              {warehouse.name}
            </option>
          )
        )}
      </datalist>

      <datalist id="rf-location-options">
        {warehouseLocations.map(
          (location) => (
            <option
              key={location.id}
              value={location.fullCode}
            >
              {location.locationType}
            </option>
          )
        )}
      </datalist>

      <datalist id="rf-address-unit-options">
        {handlingUnits.map((unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType}
            {" — "}
            {unit.status}
            {" — Stok: "}
            {unit.directStockQuantity +
              unit.childStockQuantity}
          </option>
        ))}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Depo Kodu
          </span>

          <input
            ref={warehouseInputRef}
            name="warehouseCode"
            list="rf-warehouse-options"
            value={warehouseCode}
            onChange={(event) =>
              setWarehouseCode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleWarehouseKeyDown
            }
            autoComplete="off"
            placeholder="Depo kodunu okut veya yaz"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {normalizedWarehouseCode &&
            !selectedWarehouse && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Depo bulunamadı.
              </p>
            )}

          {selectedWarehouse && (
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-blue-900">
              <p className="font-black">
                {selectedWarehouse.code}
                {" — "}
                {selectedWarehouse.name}
              </p>

              <p className="mt-1 text-sm">
                Aktif lokasyon:{" "}
                {warehouseLocations.length}
              </p>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            2. Hedef Lokasyon Barkodu
          </span>

          <input
            ref={locationInputRef}
            name="locationBarcode"
            list="rf-location-options"
            value={locationBarcode}
            onChange={(event) =>
              setLocationBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleLocationKeyDown
            }
            autoComplete="off"
            placeholder={
              selectedWarehouse
                ? "Lokasyon barkodunu okut"
                : "Önce depo kodunu okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedWarehouse
            }
            required
          />

          {normalizedLocationBarcode &&
            selectedWarehouse &&
            !selectedLocation && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Bu lokasyon seçilen depoda
                bulunamadı.
              </p>
            )}

          {selectedLocation && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-green-50 p-3 text-green-900">
              <div>
                <p className="font-mono font-black">
                  {selectedLocation.fullCode}
                </p>

                <p className="mt-1 text-sm">
                  {
                    selectedLocation.locationType
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={changeLocation}
                disabled={isPending}
                className="rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            3. Koli / Palet Barkodu
          </span>

          <input
            ref={handlingUnitInputRef}
            name="handlingUnitBarcode"
            list="rf-address-unit-options"
            value={handlingUnitBarcode}
            onChange={(event) =>
              setHandlingUnitBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleHandlingUnitKeyDown
            }
            autoComplete="off"
            placeholder={
              selectedLocation
                ? "Koli veya palet barkodunu okut"
                : "Önce hedef lokasyonu okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedLocation
            }
            required
          />

          {normalizedHandlingUnitBarcode &&
            !selectedHandlingUnit && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Koli veya palet bulunamadı.
              </p>
            )}

          {selectedHandlingUnit && (
            <div className="mt-2 rounded-xl bg-orange-50 p-3 text-orange-900">
              <p className="font-black">
                {
                  selectedHandlingUnit.unitType
                }
                {" — "}
                {
                  selectedHandlingUnit.status
                }
              </p>

              <p className="mt-1 text-sm">
                Toplam stok:{" "}
                {selectedStockQuantity}
                {" | "}
                Bağlı koli:{" "}
                {
                  selectedHandlingUnit.childUnitCount
                }
              </p>

              <p className="mt-1 font-mono text-xs">
                Mevcut adres:{" "}
                {selectedHandlingUnit.warehouseCode &&
                selectedHandlingUnit.locationCode
                  ? `${selectedHandlingUnit.warehouseCode}/${selectedHandlingUnit.locationCode}`
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
          ? "ADRESLEME YAPILIYOR..."
          : "ADRESLEMEYİ TAMAMLA"}
      </button>
    </form>
  );
}