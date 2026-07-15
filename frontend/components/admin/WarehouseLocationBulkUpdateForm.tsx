"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  bulkUpdateWarehouseLocations,
  type BulkUpdateLocationState,
} from "@/app/admin/warehouses/[id]/locations/bulk-update/actions";

type Location = {
  id: number;
  fullCode: string;
};

type Props = {
  warehouseId: number;
  locations: Location[];
};

const initialState:
  BulkUpdateLocationState = {
  success: false,
  message: "",
};

export default function WarehouseLocationBulkUpdateForm({
  warehouseId,
  locations,
}: Props) {
  const [selectedIds, setSelectedIds] =
    useState<number[]>([]);

  const boundAction =
    bulkUpdateWarehouseLocations.bind(
      null,
      warehouseId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    boundAction,
    initialState
  );

  const allSelected =
    locations.length > 0 &&
    selectedIds.length ===
      locations.length;

  const selectedIdsJson = useMemo(
    () =>
      JSON.stringify(selectedIds),
    [selectedIds]
  );

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      locations.map(
        (location) => location.id
      )
    );
  }

  function toggleLocation(
    locationId: number
  ) {
    setSelectedIds((current) =>
      current.includes(locationId)
        ? current.filter(
            (id) => id !== locationId
          )
        : [...current, locationId]
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <input
        type="hidden"
        name="selectedIds"
        value={selectedIdsJson}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Toplu Bilgi Güncelleme
          </h2>

          <p className="mt-2 text-gray-500">
            Lokasyonları seçin ve yalnızca
            değiştirmek istediğiniz alanları
            işaretleyin.
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-900">
          Seçilen: {selectedIds.length}
        </div>
      </div>

      {state.message && (
        <div
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

          <p className="mt-2">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-6 max-h-72 overflow-y-auto rounded-xl border">
        <div className="sticky top-0 border-b bg-slate-100 p-4">
          <label className="flex items-center gap-3 font-bold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-5 w-5"
            />

            Tüm Gösterilenleri Seç
          </label>
        </div>

        {locations.map((location) => (
          <label
            key={location.id}
            className="flex cursor-pointer items-center gap-3 border-b p-4 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(
                location.id
              )}
              onChange={() =>
                toggleLocation(
                  location.id
                )
              }
              className="h-5 w-5"
            />

            <span className="font-mono font-bold">
              {location.fullCode}
            </span>
          </label>
        ))}

        {locations.length === 0 && (
          <p className="p-8 text-center text-gray-500">
            Güncellenecek lokasyon bulunmuyor.
          </p>
        )}
      </div>

      <div className="mt-8 space-y-5">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="updateCode"
              className="h-5 w-5"
            />

            Lokasyon Kodunu Değiştir
          </label>

          <input
            name="code"
            placeholder="Örneğin: A veya ASK"
            className="rounded-xl border p-4 uppercase"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="updateLocationType"
              className="h-5 w-5"
            />

            Lokasyon Tipini Değiştir
          </label>

          <select
            name="locationType"
            defaultValue="PALLET"
            className="rounded-xl border bg-white p-4"
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
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="updateCapacity"
              className="h-5 w-5"
            />

            Kapasiteyi Değiştir
          </label>

          <input
            name="capacity"
            type="number"
            min="1"
            step="1"
            defaultValue="1"
            className="rounded-xl border p-4"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="updateSortOrder"
              className="h-5 w-5"
            />

            Sıralamayı Değiştir
          </label>

          <input
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            className="rounded-xl border p-4"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="updateDescription"
              className="h-5 w-5"
            />

            Açıklamayı Değiştir
          </label>

          <textarea
            name="description"
            rows={3}
            placeholder="Boş bırakırsanız açıklama temizlenir."
            className="resize-none rounded-xl border p-4"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="updateStatus"
              className="h-5 w-5"
            />

            Durumu Değiştir
          </label>

          <select
            name="isActive"
            defaultValue="true"
            className="rounded-xl border bg-white p-4"
          >
            <option value="true">
              Aktif
            </option>

            <option value="false">
              Pasif
            </option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          selectedIds.length === 0
        }
        className={`mt-8 w-full rounded-xl py-4 font-bold ${
          !isPending &&
          selectedIds.length > 0
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Lokasyonlar Güncelleniyor..."
          : `${selectedIds.length} Lokasyonu Güncelle`}
      </button>
    </form>
  );
}