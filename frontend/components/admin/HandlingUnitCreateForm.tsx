"use client";

import Link from "next/link";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createHandlingUnit,
  type HandlingUnitActionState,
} from "@/app/admin/handling-units/actions";

const initialState: HandlingUnitActionState = {
  success: false,
  message: "",
  handlingUnitId: null,
  barcode: "",
  purpose: "",
};

export default function HandlingUnitCreateForm() {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [
    useAutomaticBarcode,
    setUseAutomaticBarcode,
  ] = useState(true);

  const [
    selectedType,
    setSelectedType,
  ] = useState("BOX");

  const [
    selectedPurpose,
    setSelectedPurpose,
  ] = useState("STOCK");

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createHandlingUnit,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setUseAutomaticBarcode(true);
      setSelectedType("BOX");
      setSelectedPurpose("STOCK");
    }
  }, [state.success]);

  function getBarcodeExample() {
    if (
      selectedPurpose ===
      "SHIPPING"
    ) {
      return selectedType ===
        "PALLET"
        ? "SPAL00000001"
        : "SKOL00000001";
    }

    if (
      selectedPurpose ===
      "PICKING"
    ) {
      return selectedType ===
        "PALLET"
        ? "PPAL00000001"
        : "PKOL00000001";
    }

    return selectedType ===
      "PALLET"
      ? "PLT00000001"
      : "KOL00000001";
  }

  function getButtonText() {
    const typeLabel =
      selectedType ===
      "PALLET"
        ? "Paleti"
        : "Kolisi";

    if (
      selectedPurpose ===
      "SHIPPING"
    ) {
      return `Sevk ${typeLabel} Oluştur`;
    }

    if (
      selectedPurpose ===
      "PICKING"
    ) {
      return `Toplama ${typeLabel} Oluştur`;
    }

    return `Stok ${typeLabel} Oluştur`;
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="h-fit rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-2xl font-bold">
        Yeni Taşıma Birimi
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Fiziksel tipi ve operasyon amacını
        seçerek Stok, Toplama veya Sevk
        THM oluşturun.
      </p>

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
            state.handlingUnitId && (
              <Link
                href={`/labels/print?type=handling-unit&ids=${state.handlingUnitId}&layout=thermal-70x40`}
                target="_blank"
                className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-3 font-bold text-white"
              >
                🖨️ {state.barcode} Etiketini Yazdır
              </Link>
            )}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Kullanım Amacı
          </span>

          <select
            name="purpose"
            value={selectedPurpose}
            onChange={(event) =>
              setSelectedPurpose(
                event.target.value,
              )
            }
            className="w-full rounded-xl border bg-white p-4 font-semibold"
            required
          >
            <option value="STOCK">
              📚 Stok THM
            </option>

            <option value="PICKING">
              🧺 Toplama THM
            </option>

            <option value="SHIPPING">
              🚚 Sevk THM
            </option>
          </select>

          {selectedPurpose ===
            "SHIPPING" && (
            <p className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold leading-6 text-cyan-900">
              Bu THM, doğrudan sipariş
              toplamasında veya Wave
              paketlemesinde hedef sevk
              kolisi/paleti olarak
              kullanılacaktır.
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Fiziksel Tip
          </span>

          <select
            name="unitType"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(
                event.target.value,
              )
            }
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="BOX">
              📦 Koli
            </option>

            <option value="PALLET">
              🟦 Palet
            </option>
          </select>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-4">
          <input
            type="checkbox"
            name="useAutomaticBarcode"
            checked={useAutomaticBarcode}
            onChange={(event) =>
              setUseAutomaticBarcode(
                event.target.checked,
              )
            }
            className="mt-1 h-5 w-5"
          />

          <span>
            <span className="block font-semibold">
              Otomatik Barkod Oluştur
            </span>

            <span className="mt-1 block text-sm text-gray-500">
              Oluşturulacak barkod:
              <strong className="ml-1">
                {getBarcodeExample()}
              </strong>
            </span>
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Hazır Barkod
          </span>

          <input
            name="barcode"
            disabled={
              useAutomaticBarcode
            }
            placeholder="Barkodu okutun veya yazın"
            maxLength={60}
            className="w-full rounded-xl border p-4 uppercase disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <p className="mt-2 text-xs text-gray-500">
            Otomatik barkod kapatılırsa bu
            alan zorunlu olur.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={4}
            placeholder="İsteğe bağlı açıklama"
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-7 w-full rounded-xl py-4 font-bold ${
          isPending
            ? "cursor-not-allowed bg-slate-300 text-slate-500"
            : selectedPurpose ===
                "SHIPPING"
              ? "bg-cyan-700 text-white hover:bg-cyan-600"
              : "bg-blue-900 text-white hover:bg-blue-800"
        }`}
      >
        {isPending
          ? "Oluşturuluyor..."
          : getButtonText()}
      </button>
    </form>
  );
}
