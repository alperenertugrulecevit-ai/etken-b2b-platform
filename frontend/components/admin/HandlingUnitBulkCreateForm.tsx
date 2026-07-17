"use client";

import Link from "next/link";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  createBulkHandlingUnits,
  type BulkHandlingUnitState,
} from "@/app/admin/handling-units/bulk/actions";

const initialState: BulkHandlingUnitState = {
  success: false,
  message: "",
  createdIds: [],
  firstBarcode: "",
  lastBarcode: "",
};

function getDefaultPrefix(
  unitType: string
) {
  switch (unitType) {
    case "PALLET":
      return "PLT";

    case "PICKING_BOX":
      return "PKOL";

    case "PICKING_PALLET":
      return "PPAL";

    case "BOX":
    default:
      return "KOL";
  }
}

function getUnitTypeLabel(
  unitType: string
) {
  switch (unitType) {
    case "PALLET":
      return "Palet";

    case "PICKING_BOX":
      return "Toplama Kolisi";

    case "PICKING_PALLET":
      return "Toplama Paleti";

    case "BOX":
    default:
      return "Koli";
  }
}

export default function HandlingUnitBulkCreateForm() {
  const [unitType, setUnitType] =
    useState("BOX");

  const [count, setCount] =
    useState("10");

  const [prefix, setPrefix] =
    useState("");

  const [digitCount, setDigitCount] =
    useState("8");

  const [
    startNumber,
    setStartNumber,
  ] = useState("0");

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createBulkHandlingUnits,
    initialState
  );

  const defaultPrefix =
    getDefaultPrefix(unitType);

  const previewPrefix =
    prefix.trim().toUpperCase() ||
    defaultPrefix;

  const firstPreview = useMemo(() => {
    const numericStart =
      Number(startNumber) > 0
        ? Number(startNumber)
        : 1;

    const digits =
      Number(digitCount) || 8;

    return `${previewPrefix}${String(
      numericStart
    ).padStart(digits, "0")}`;
  }, [
    previewPrefix,
    startNumber,
    digitCount,
  ]);

  const lastPreview = useMemo(() => {
    const numericStart =
      Number(startNumber) > 0
        ? Number(startNumber)
        : 1;

    const numericCount =
      Number(count) || 0;

    const digits =
      Number(digitCount) || 8;

    const lastNumber =
      numericStart +
      Math.max(
        0,
        numericCount - 1
      );

    return `${previewPrefix}${String(
      lastNumber
    ).padStart(digits, "0")}`;
  }, [
    previewPrefix,
    startNumber,
    count,
    digitCount,
  ]);

  const createdIdsQuery =
    state.createdIds.join(",");

  const unitTypeLabel =
    getUnitTypeLabel(unitType);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-8 shadow"
    >
      <div>
        <h2 className="text-2xl font-bold">
          Toplu Barkod Oluştur
        </h2>

        <p className="mt-2 leading-6 text-gray-500">
          Stok kolisi, stok paleti,
          toplama kolisi veya toplama
          paleti için seri barkod
          oluşturun.
        </p>
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
              ? "İşlem başarılı"
              : "İşlem gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success &&
            state.firstBarcode && (
              <p className="mt-3 font-mono font-bold">
                {state.firstBarcode}
                {" → "}
                {state.lastBarcode}
              </p>
            )}
        </div>
      )}

      {state.success &&
        state.createdIds.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Link
              href={`/labels/print?type=handling-unit&ids=${createdIdsQuery}&layout=a4`}
              target="_blank"
              className="rounded-xl bg-blue-900 px-5 py-4 text-center font-bold text-white hover:bg-blue-800"
            >
              🖨️ A4 3×5 Etiketleri
            </Link>

            <Link
              href={`/labels/print?type=handling-unit&ids=${createdIdsQuery}&layout=thermal-70x40`}
              target="_blank"
              className="rounded-xl bg-slate-800 px-5 py-4 text-center font-bold text-white hover:bg-slate-700"
            >
              🏷️ Termal 70×40
            </Link>

            <Link
              href={`/labels/print?type=handling-unit&ids=${createdIdsQuery}&layout=thermal-100x50`}
              target="_blank"
              className="rounded-xl bg-violet-800 px-5 py-4 text-center font-bold text-white hover:bg-violet-700"
            >
              🏷️ Termal 100×50
            </Link>
          </div>
        )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Taşıma Birimi Tipi
          </span>

          <select
            name="unitType"
            value={unitType}
            onChange={(event) => {
              setUnitType(
                event.target.value
              );

              setPrefix("");
            }}
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="BOX">
              📦 Koli
            </option>

            <option value="PALLET">
              🟦 Palet
            </option>

            <option value="PICKING_BOX">
              🟨 Toplama Kolisi
            </option>

            <option value="PICKING_PALLET">
              🟧 Toplama Paleti
            </option>
          </select>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Toplama tipleri RF toplama
            operasyonlarında hedef THM
            olarak kullanılacaktır.
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Barkod Adedi
          </span>

          <input
            name="count"
            type="number"
            min="1"
            max="200"
            step="1"
            value={count}
            onChange={(event) =>
              setCount(
                event.target.value
              )
            }
            className="w-full rounded-xl border p-4"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Tek işlemde en fazla 200
            etiket oluşturabilirsiniz.
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Barkod Ön Eki
          </span>

          <input
            name="prefix"
            value={prefix}
            onChange={(event) =>
              setPrefix(
                event.target.value.toUpperCase()
              )
            }
            placeholder={defaultPrefix}
            maxLength={20}
            className="w-full rounded-xl border p-4 uppercase"
          />

          <p className="mt-2 text-xs text-gray-500">
            Boş bırakılırsa{" "}
            <strong>
              {defaultPrefix}
            </strong>{" "}
            ön eki otomatik kullanılır.
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Numara Basamak Sayısı
          </span>

          <input
            name="digitCount"
            type="number"
            min="4"
            max="12"
            step="1"
            value={digitCount}
            onChange={(event) =>
              setDigitCount(
                event.target.value
              )
            }
            className="w-full rounded-xl border p-4"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Önerilen standart değer 8
            basamaktır.
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Başlangıç Numarası
          </span>

          <input
            name="startNumber"
            type="number"
            min="0"
            step="1"
            value={startNumber}
            onChange={(event) =>
              setStartNumber(
                event.target.value
              )
            }
            className="w-full rounded-xl border p-4"
          />

          <p className="mt-2 text-xs leading-5 text-gray-500">
            0 girilirse sistem seçilen
            barkod ön ekine ait mevcut son
            numaradan otomatik devam eder.
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <input
            name="description"
            placeholder={`Örneğin: ${unitTypeLabel} etiketleri`}
            className="w-full rounded-xl border p-4"
          />

          <p className="mt-2 text-xs text-gray-500">
            Açıklama isteğe bağlıdır.
          </p>
        </label>
      </div>

      <div className="mt-8 rounded-2xl bg-blue-50 p-6">
        <p className="text-sm font-semibold uppercase text-blue-700">
          Barkod Önizlemesi
        </p>

        <p className="mt-3 text-sm font-semibold text-blue-800">
          {unitTypeLabel}
        </p>

        <p className="mt-2 break-all font-mono text-xl font-bold text-blue-900">
          {firstPreview}
          {" → "}
          {lastPreview}
        </p>

        {startNumber === "0" && (
          <p className="mt-3 text-sm text-blue-700">
            Gerçek başlangıç numarası,
            veritabanındaki aynı ön eke
            sahip son barkoda göre
            belirlenecektir.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          Number(count) <= 0 ||
          Number(count) > 200
        }
        className={`mt-8 w-full rounded-xl py-4 font-bold ${
          !isPending &&
          Number(count) > 0 &&
          Number(count) <= 200
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Barkodlar Oluşturuluyor..."
          : `${Number(count) || 0} Adet ${unitTypeLabel} Barkodu Oluştur`}
      </button>
    </form>
  );
}