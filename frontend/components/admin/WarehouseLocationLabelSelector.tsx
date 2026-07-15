"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type LocationOption = {
  id: number;
  fullCode: string;
  locationType: string;
  isActive: boolean;
};

type Props = {
  locations: LocationOption[];
};

export default function WarehouseLocationLabelSelector({
  locations,
}: Props) {
  const [selectedIds, setSelectedIds] =
    useState<number[]>([]);

  const visibleIds = useMemo(
    () =>
      locations.map(
        (location) => location.id
      ),
    [locations]
  );

  const allSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) =>
      selectedIds.includes(id)
    );

  const idsQuery =
    selectedIds.join(",");

  useEffect(() => {
    setSelectedIds((currentIds) =>
      currentIds.filter((id) =>
        visibleIds.includes(id)
      )
    );
  }, [visibleIds]);

  function toggleLocation(
    locationId: number
  ) {
    setSelectedIds((currentIds) => {
      if (
        currentIds.includes(
          locationId
        )
      ) {
        return currentIds.filter(
          (id) => id !== locationId
        );
      }

      return [
        ...currentIds,
        locationId,
      ];
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(visibleIds);
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Lokasyon Etiketi Yazdır
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Etiketi basılacak lokasyonları
            seçin. Yazdırma ekranında yalnızca
            lokasyon kodu ve Code 128 barkod
            bulunur.
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-5 py-3 text-center">
          <p className="text-xs font-semibold uppercase text-blue-700">
            Seçilen
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-900">
            {selectedIds.length}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleAll}
          disabled={
            locations.length === 0
          }
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allSelected
            ? "Tüm Seçimleri Kaldır"
            : "Tüm Gösterilenleri Seç"}
        </button>

        <button
          type="button"
          onClick={clearSelection}
          disabled={
            selectedIds.length === 0
          }
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Seçimi Temizle
        </button>
      </div>

      <div className="mt-6 max-h-80 overflow-y-auto rounded-xl border">
        {locations.map(
          (location) => (
            <label
              key={location.id}
              className={`grid cursor-pointer items-center gap-4 border-b p-4 hover:bg-slate-50 md:grid-cols-[30px_1fr_160px_100px] ${
                !location.isActive
                  ? "opacity-60"
                  : ""
              }`}
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

              <span className="font-mono text-lg font-bold text-blue-900">
                {location.fullCode}
              </span>

              <span className="text-sm font-semibold text-gray-600">
                {location.locationType}
              </span>

              <span
                className={`text-sm font-semibold ${
                  location.isActive
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {location.isActive
                  ? "Aktif"
                  : "Pasif"}
              </span>
            </label>
          )
        )}

        {locations.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            Etiketi basılabilecek lokasyon
            bulunmuyor.
          </div>
        )}
      </div>

      {selectedIds.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link
            href={`/labels/print?type=location&ids=${idsQuery}&layout=a4`}
            target="_blank"
            className="rounded-xl bg-blue-900 px-5 py-4 text-center font-bold text-white hover:bg-blue-800"
          >
            A4 3×5 Yazdır
          </Link>

          <Link
            href={`/labels/print?type=location&ids=${idsQuery}&layout=thermal-70x40`}
            target="_blank"
            className="rounded-xl bg-slate-800 px-5 py-4 text-center font-bold text-white hover:bg-slate-700"
          >
            Termal 70×40
          </Link>

          <Link
            href={`/labels/print?type=location&ids=${idsQuery}&layout=thermal-100x50`}
            target="_blank"
            className="rounded-xl bg-violet-800 px-5 py-4 text-center font-bold text-white hover:bg-violet-700"
          >
            Termal 100×50
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-slate-100 p-4 text-center font-semibold text-slate-500">
          Yazdırma seçeneklerini açmak için
          en az bir lokasyon seçin.
        </div>
      )}
    </section>
  );
}