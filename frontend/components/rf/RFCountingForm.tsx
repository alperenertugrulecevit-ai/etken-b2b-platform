"use client";

import {
  type KeyboardEvent,
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  rfCountLocationStock,
  type RFCountingState,
} from "@/app/rf/counting/actions";

export type RFCountingWarehouseOption = {
  id: number;
  code: string;
  name: string;
};

type Props = {
  warehouses?:
    RFCountingWarehouseOption[];
};

const initialState:
  RFCountingState = {
    success: false,
    message: "",

    warehouseCode: "",
    warehouseName: "",
    locationCode: "",

    handlingUnitId: null,
    handlingUnitBarcode: "",
    handlingUnitType: "",

    productId: null,
    productCode: "",
    productName: "",
    productBarcode: "",

    expectedQuantity: 0,
    countedQuantity: 0,
    difference: 0,

    handlingUnitReservedStock: 0,

    locationQuantityBefore: 0,
    locationQuantityAfter: 0,
    locationReservedStock: 0,

    movementType: "",
    documentNumber: "",
  };

export default function RFCountingForm({
  warehouses = [],
}: Props) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    rfCountLocationStock,
    initialState
  );

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const warehouseInputRef =
    useRef<HTMLSelectElement>(
      null
    );

  const locationInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const handlingUnitInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const productInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const quantityInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const noteInputRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  useEffect(() => {
    warehouseInputRef.current
      ?.focus();
  }, []);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    if (productInputRef.current) {
      productInputRef.current.value =
        "";
    }

    if (quantityInputRef.current) {
      quantityInputRef.current.value =
        "";
    }

    if (noteInputRef.current) {
      noteInputRef.current.value =
        "";
    }

    productInputRef.current
      ?.focus();
  }, [state]);

  function moveFocusOnEnter(
    event:
      KeyboardEvent<
        | HTMLInputElement
        | HTMLSelectElement
      >,
    nextElement:
      HTMLElement | null
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    nextElement?.focus();

    if (
      nextElement instanceof
      HTMLInputElement
    ) {
      nextElement.select();
    }
  }

  function submitOnEnter(
    event:
      KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    formRef.current
      ?.requestSubmit();
  }

  function resetForm() {
    formRef.current?.reset();

    window.setTimeout(() => {
      warehouseInputRef.current
        ?.focus();
    }, 0);
  }

  function clearHandlingUnit() {
    if (
      handlingUnitInputRef.current
    ) {
      handlingUnitInputRef.current.value =
        "";

      handlingUnitInputRef.current.focus();
    }

    if (productInputRef.current) {
      productInputRef.current.value =
        "";
    }

    if (quantityInputRef.current) {
      quantityInputRef.current.value =
        "";
    }

    if (noteInputRef.current) {
      noteInputRef.current.value =
        "";
    }
  }

  const differenceClass =
    state.difference > 0
      ? "text-emerald-700"
      : state.difference < 0
        ? "text-red-700"
        : "text-slate-700";

  const hasWarehouses =
    warehouses.length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
          Cycle Count
        </p>

        <h2 className="mt-2 text-xl font-black">
          Anlık THM Stok Kontrolü
        </h2>

        <p className="mt-2 text-sm leading-6">
          Bu işlem planlı genel sayım
          değildir. Girilen fark
          onay beklemeden THM,
          lokasyon ve global ürün
          stoğuna uygulanır.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="warehouseCode"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              1. Depo
            </label>

            <select
              ref={
                warehouseInputRef
              }
              id="warehouseCode"
              name="warehouseCode"
              required
              disabled={
                isPending ||
                !hasWarehouses
              }
              defaultValue=""
              onKeyDown={(event) =>
                moveFocusOnEnter(
                  event,
                  locationInputRef.current
                )
              }
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-4 text-lg font-bold text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {hasWarehouses
                  ? "Depo seçin"
                  : "Aktif depo bulunamadı"}
              </option>

              {warehouses.map(
                (warehouse) => (
                  <option
                    key={
                      warehouse.id
                    }
                    value={
                      warehouse.code
                    }
                  >
                    {warehouse.code} -{" "}
                    {warehouse.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="locationBarcode"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              2. Lokasyon Barkodu
            </label>

            <input
              ref={
                locationInputRef
              }
              id="locationBarcode"
              name="locationBarcode"
              type="text"
              required
              disabled={isPending}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Örnek: A-01-02-03"
              onKeyDown={(event) =>
                moveFocusOnEnter(
                  event,
                  handlingUnitInputRef.current
                )
              }
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-4 text-lg font-bold uppercase text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="handlingUnitBarcode"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              3. THM Barkodu
            </label>

            <input
              ref={
                handlingUnitInputRef
              }
              id="handlingUnitBarcode"
              name="handlingUnitBarcode"
              type="text"
              required
              disabled={isPending}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Koli veya palet barkodunu okutun"
              onKeyDown={(event) =>
                moveFocusOnEnter(
                  event,
                  productInputRef.current
                )
              }
              className="w-full rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-4 text-lg font-black uppercase text-slate-950 outline-none transition focus:border-violet-700 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Palete bağlı koliler
              bulunuyorsa palet yerine
              sayılacak koli barkodunu
              okutun.
            </p>
          </div>

          <div>
            <label
              htmlFor="productBarcode"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              4. Ürün Kodu veya
              Barkodu
            </label>

            <input
              ref={
                productInputRef
              }
              id="productBarcode"
              name="productBarcode"
              type="text"
              required
              disabled={isPending}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Ürün barkodunu okutun"
              onKeyDown={(event) =>
                moveFocusOnEnter(
                  event,
                  quantityInputRef.current
                )
              }
              className="w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-4 text-lg font-black uppercase text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="countedQuantity"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              5. Sayılan Miktar
            </label>

            <input
              ref={
                quantityInputRef
              }
              id="countedQuantity"
              name="countedQuantity"
              type="number"
              min={0}
              step={1}
              required
              disabled={isPending}
              inputMode="numeric"
              placeholder="0"
              onKeyDown={
                submitOnEnter
              }
              className="w-full rounded-xl border-2 border-orange-300 bg-orange-50 px-4 py-4 text-2xl font-black text-slate-950 outline-none transition focus:border-orange-600 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="note"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              Cycle Count Notu
            </label>

            <textarea
              ref={noteInputRef}
              id="note"
              name="note"
              rows={3}
              disabled={isPending}
              placeholder="İsteğe bağlı açıklama"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={resetForm}
            className="rounded-xl border border-slate-300 bg-white px-3 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Temizle
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={
              clearHandlingUnit
            }
            className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-4 text-sm font-black text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Yeni THM
          </button>

          <button
            type="submit"
            disabled={
              isPending ||
              !hasWarehouses
            }
            className="rounded-xl bg-blue-900 px-3 py-4 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending
              ? "Kaydediliyor..."
              : "Farkı Uygula"}
          </button>
        </div>
      </form>

      {state.message && (
        <section
          role={
            state.success
              ? "status"
              : "alert"
          }
          className={`rounded-2xl border p-5 shadow-sm ${
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <h2 className="font-black">
            {state.success
              ? "Cycle Count Başarılı"
              : "Cycle Count Kaydedilemedi"}
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6">
            {state.message}
          </p>
        </section>
      )}

      {state.success && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Son Cycle Count
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                {
                  state.handlingUnitBarcode
                }
              </h2>

              <p className="mt-1 text-sm font-bold text-violet-700">
                {
                  state.handlingUnitType
                }
              </p>

              <p className="mt-3 text-sm font-bold text-slate-800">
                {state.productCode} -{" "}
                {state.productName}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {state.warehouseCode} /{" "}
                {state.locationCode}
              </p>
            </div>

            <span className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-800">
              {state.movementType}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                THM Sistem
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {
                  state.expectedQuantity
                }
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-600">
                Sayılan
              </p>

              <p className="mt-2 text-2xl font-black text-blue-900">
                {
                  state.countedQuantity
                }
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase text-orange-600">
                Fark
              </p>

              <p
                className={`mt-2 text-2xl font-black ${differenceClass}`}
              >
                {state.difference > 0
                  ? "+"
                  : ""}
                {state.difference}
              </p>
            </div>

            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-xs font-bold uppercase text-violet-600">
                THM Rezerve
              </p>

              <p className="mt-2 text-2xl font-black text-violet-900">
                {
                  state.handlingUnitReservedStock ??
                  0
                }
              </p>
            </div>

            <div className="rounded-xl bg-cyan-50 p-4">
              <p className="text-xs font-bold uppercase text-cyan-700">
                Lokasyon Önce
              </p>

              <p className="mt-2 text-2xl font-black text-cyan-950">
                {
                  state.locationQuantityBefore ??
                  0
                }
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">
                Lokasyon Sonra
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-950">
                {
                  state.locationQuantityAfter ??
                  0
                }
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">
              Lokasyon Rezerve Stok
            </p>

            <p className="mt-1 font-black text-slate-900">
              {
                state.locationReservedStock
              }
            </p>
          </div>

          {state.documentNumber && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-500">
                Cycle Count Belgesi
              </p>

              <code className="mt-1 block break-all text-sm font-bold text-slate-800">
                {
                  state.documentNumber
                }
              </code>
            </div>
          )}
        </section>
      )}

      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900">
        <p className="font-black">
          Anlık Stok Değişikliği
        </p>

        <p className="mt-2">
          Cycle Count farkı onay
          beklemeden THM ürün
          miktarına, lokasyon toplamına
          ve global ürün stoğuna
          uygulanır. Planlı depo sayımı
          ayrı modülden yürütülecektir.
        </p>
      </div>
    </div>
  );
}