"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  addressHandlingUnit,
  type HandlingUnitAddressState,
} from "@/app/admin/handling-units/addressing/actions";

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

type WarehouseOption = {
  id: number;
  code: string;
  name: string;
};

type LocationOption = {
  id: number;
  warehouseId: number;
  fullCode: string;
  locationType: string;
};

type Props = {
  handlingUnits: HandlingUnitOption[];
  warehouses: WarehouseOption[];
  locations: LocationOption[];
};

const initialState:
  HandlingUnitAddressState = {
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

export default function HandlingUnitAddressForm({
  handlingUnits,
  warehouses,
  locations,
}: Props) {
  const handlingUnitInputRef =
    useRef<HTMLInputElement>(null);

  const [
    handlingUnitBarcode,
    setHandlingUnitBarcode,
  ] = useState("");

  const [
    warehouseId,
    setWarehouseId,
  ] = useState("");

  const [
    locationId,
    setLocationId,
  ] = useState("");

  const [
    sessionAddressedCount,
    setSessionAddressedCount,
  ] = useState(0);

  const [
    sessionStockQuantity,
    setSessionStockQuantity,
  ] = useState(0);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    addressHandlingUnit,
    initialState
  );

  const normalizedBarcode =
    handlingUnitBarcode
      .trim()
      .toUpperCase();

  const selectedHandlingUnit =
    useMemo(
      () =>
        handlingUnits.find(
          (unit) =>
            unit.barcode ===
            normalizedBarcode
        ),
      [
        handlingUnits,
        normalizedBarcode,
      ]
    );

  const filteredLocations =
    useMemo(
      () =>
        locations.filter(
          (location) =>
            location.warehouseId ===
            Number(warehouseId)
        ),
      [locations, warehouseId]
    );

  const selectedLocation =
    useMemo(
      () =>
        locations.find(
          (location) =>
            location.id ===
            Number(locationId)
        ),
      [locations, locationId]
    );

  const selectedWarehouse =
    useMemo(
      () =>
        warehouses.find(
          (warehouse) =>
            warehouse.id ===
            Number(warehouseId)
        ),
      [warehouses, warehouseId]
    );

  const selectedTotalStock =
    selectedHandlingUnit
      ? selectedHandlingUnit
          .directStockQuantity +
        selectedHandlingUnit
          .childStockQuantity
      : 0;

  useEffect(() => {
    handlingUnitInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setLocationId("");
  }, [warehouseId]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setSessionAddressedCount(
      (current) =>
        current +
        state.affectedUnitCount
    );

    setSessionStockQuantity(
      (current) =>
        current +
        state.totalStockQuantity
    );

    setHandlingUnitBarcode("");

    window.setTimeout(() => {
      handlingUnitInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.affectedUnitCount,
    state.totalStockQuantity,
  ]);

  function clearForm() {
    setHandlingUnitBarcode("");
    setWarehouseId("");
    setLocationId("");
    setSessionAddressedCount(0);
    setSessionStockQuantity(0);

    window.setTimeout(() => {
      handlingUnitInputRef.current?.focus();
    }, 100);
  }

  const canSubmit =
    normalizedBarcode.length > 0 &&
    Number(warehouseId) > 0 &&
    Number(locationId) > 0;

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-8 shadow"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Koli / Palet Adresleme
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Taşıma birimi barkodunu okutun,
            hedef depo ve lokasyonu seçerek
            adresleme işlemini tamamlayın.
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
            Taşıma Birimi Stoğu
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-800">
            {selectedTotalStock.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold text-orange-700">
            {normalizedBarcode ||
              "Barkod okutulmadı"}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase text-green-700">
            Oturumda Adreslenen THM
          </p>

          <p className="mt-3 text-4xl font-bold text-green-800">
            {sessionAddressedCount.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm font-semibold text-green-700">
            Palete bağlı koliler dahildir
          </p>
        </article>

        <article className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase text-blue-700">
            Adreslenen Stok Miktarı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {sessionStockQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm font-semibold text-blue-700">
            Bu ekran açıkken adreslenen stok
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
              ? "Adresleme başarılı"
              : "Adresleme gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Taşıma Birimi
                </p>

                <p className="mt-2 font-mono font-bold">
                  {
                    state.handlingUnitBarcode
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase">
                  Hedef
                </p>

                <p className="mt-2 font-bold">
                  {state.warehouseCode}
                  {" / "}
                  {state.locationCode}
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
            </div>
          )}
        </div>
      )}

      <datalist id="address-unit-options">
        {handlingUnits.map((unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType} —{" "}
            {unit.status} — Stok:{" "}
            {unit.directStockQuantity +
              unit.childStockQuantity}
            {" — Mevcut: "}
            {unit.warehouseCode &&
            unit.locationCode
              ? `${unit.warehouseCode}/${unit.locationCode}`
              : "Adreslenmedi"}
          </option>
        ))}
      </datalist>

      <div className="mt-8">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Koli / Palet Barkodu
          </span>

          <input
            ref={handlingUnitInputRef}
            name="handlingUnitBarcode"
            list="address-unit-options"
            value={handlingUnitBarcode}
            onChange={(event) =>
              setHandlingUnitBarcode(
                event.target.value.toUpperCase()
              )
            }
            autoComplete="off"
            placeholder="Koli veya palet barkodunu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {selectedHandlingUnit && (
            <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Tip
                </p>

                <p className="mt-1 font-bold">
                  {
                    selectedHandlingUnit.unitType
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Durum
                </p>

                <p className="mt-1 font-bold">
                  {
                    selectedHandlingUnit.status
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Mevcut Depo
                </p>

                <p className="mt-1 font-bold">
                  {selectedHandlingUnit
                    .warehouseCode || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Mevcut Lokasyon
                </p>

                <p className="mt-1 font-mono font-bold">
                  {selectedHandlingUnit
                    .locationCode || "-"}
                </p>
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Hedef Depo
          </span>

          <select
            name="warehouseId"
            value={warehouseId}
            onChange={(event) =>
              setWarehouseId(
                event.target.value
              )
            }
            className="w-full rounded-xl border bg-white p-5"
            disabled={isPending}
            required
          >
            <option value="">
              Depo seçin
            </option>

            {warehouses.map(
              (warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.code} —{" "}
                  {warehouse.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Hedef Lokasyon
          </span>

          <select
            name="locationId"
            value={locationId}
            onChange={(event) =>
              setLocationId(
                event.target.value
              )
            }
            disabled={
              isPending || !warehouseId
            }
            className="w-full rounded-xl border bg-white p-5 disabled:cursor-not-allowed disabled:bg-slate-100"
            required
          >
            <option value="">
              {warehouseId
                ? "Lokasyon seçin"
                : "Önce depo seçin"}
            </option>

            {filteredLocations.map(
              (location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.fullCode}
                  {" — "}
                  {location.locationType}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      {selectedWarehouse &&
        selectedLocation && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase text-blue-700">
              Hedef Adres
            </p>

            <p className="mt-2 text-xl font-bold text-blue-900">
              {selectedWarehouse.code}
              {" / "}
              {selectedLocation.fullCode}
            </p>
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
          ? "Adresleme Yapılıyor..."
          : selectedHandlingUnit?.locationCode
            ? "Koli / Paleti Yeni Lokasyona Taşı"
            : "Koli / Paleti Lokasyona Yerleştir"}
      </button>
    </form>
  );
}