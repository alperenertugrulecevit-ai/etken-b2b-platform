"use client";

import {
  useActionState,
} from "react";

import {
  updateWarehouseLocation,
  type UpdateWarehouseLocationState,
} from "@/app/admin/warehouses/[id]/locations/[locationId]/edit/actions";

type Props = {
  warehouseId: number;
  locationId: number;
  initialCode: string;
  initialAisle: string;
  initialSection: string;
  initialLevel: string;
  initialBin: string;
  initialLocationType: string;
  initialCapacity: number;
  initialSortOrder: number;
  initialDescription: string;
};

const initialState:
  UpdateWarehouseLocationState = {
  success: false,
  message: "",
};

export default function WarehouseLocationEditForm({
  warehouseId,
  locationId,
  initialCode,
  initialAisle,
  initialSection,
  initialLevel,
  initialBin,
  initialLocationType,
  initialCapacity,
  initialSortOrder,
  initialDescription,
}: Props) {
  const boundAction =
    updateWarehouseLocation.bind(
      null,
      warehouseId,
      locationId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    boundAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-8 rounded-2xl bg-white p-8 shadow"
    >
      {state.message && (
        <div
          role="alert"
          className={`rounded-xl border p-5 ${
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
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Lokasyon Kodu
          </span>

          <input
            name="code"
            defaultValue={initialCode}
            maxLength={50}
            className="w-full rounded-xl border p-4 uppercase"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Örneğin: A, B, IADE veya RFID
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Koridor
          </span>

          <input
            name="aisle"
            defaultValue={initialAisle}
            className="w-full rounded-xl border p-4 uppercase"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Bölüm / Blok
          </span>

          <input
            name="section"
            defaultValue={initialSection}
            className="w-full rounded-xl border p-4 uppercase"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Kat
          </span>

          <input
            name="level"
            defaultValue={initialLevel}
            className="w-full rounded-xl border p-4 uppercase"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Göz
          </span>

          <input
            name="bin"
            defaultValue={initialBin}
            className="w-full rounded-xl border p-4 uppercase"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Lokasyon Tipi
          </span>

          <select
            name="locationType"
            defaultValue={
              initialLocationType
            }
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="PALLET">
              Palet Lokasyonu
            </option>

            <option value="BOX">
              Koli Lokasyonu
            </option>

            <option value="HANGING">
              Askılı Lokasyon
            </option>

            <option value="FLOOR">
              Zemin Lokasyonu
            </option>

            <option value="RETURN">
              İade Alanı
            </option>

            <option value="QUALITY">
              Kalite Kontrol
            </option>

            <option value="RFID">
              RFID Alanı
            </option>

            <option value="SHIPPING">
              Mal Çıkış Alanı
            </option>

            <option value="RECEIVING">
              Mal Kabul Alanı
            </option>

            <option value="QUARANTINE">
              Karantina Alanı
            </option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Kapasite
          </span>

          <input
            name="capacity"
            type="number"
            min="1"
            step="1"
            defaultValue={
              initialCapacity
            }
            className="w-full rounded-xl border p-4"
            required
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Sıralama Değeri
          </span>

          <input
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={
              initialSortOrder
            }
            className="w-full rounded-xl border p-4"
          />
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={4}
            defaultValue={
              initialDescription
            }
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-8 w-full rounded-xl py-4 font-bold ${
          isPending
            ? "cursor-not-allowed bg-slate-300 text-slate-500"
            : "bg-blue-900 text-white hover:bg-blue-800"
        }`}
      >
        {isPending
          ? "Lokasyon Güncelleniyor..."
          : "Değişiklikleri Kaydet"}
      </button>
    </form>
  );
}