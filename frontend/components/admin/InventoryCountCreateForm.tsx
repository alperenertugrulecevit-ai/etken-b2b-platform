"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  createInventoryCountAction,
} from "@/app/admin/inventory-counts/new/actions";

export type InventoryCountLocationOption = {
  id: number;
  code: string;
  aisle: string;
  section: string;
  level: string;
  bin: string;
  fullCode: string;
  locationType: string;
};

export type InventoryCountWarehouseOption = {
  id: number;
  code: string;
  name: string;
  locations:
    InventoryCountLocationOption[];
};

export type InventoryCountAssigneeOption = {
  userId: string;
  username: string;
  employeeCode: string;
  fullName: string;
  department: string;
  title: string;
};

type InventoryCountCreateFormProps = {
  warehouses:
    InventoryCountWarehouseOption[];
  assignees:
    InventoryCountAssigneeOption[];
};

const initialState = {
  success: false,
  message: "",
};

export default function InventoryCountCreateForm({
  warehouses,
  assignees,
}: InventoryCountCreateFormProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createInventoryCountAction,
    initialState
  );

  const [
    warehouseId,
    setWarehouseId,
  ] = useState("");

  const [
    scope,
    setScope,
  ] = useState<
    | "ALL_LOCATIONS"
    | "SELECTED_LOCATIONS"
  >("SELECTED_LOCATIONS");

  const [
    selectedLocationIds,
    setSelectedLocationIds,
  ] = useState<number[]>([]);

  const [
    assignedUserIds,
    setAssignedUserIds,
  ] = useState<string[]>([]);

  const selectedWarehouse =
    useMemo(
      () =>
        warehouses.find(
          (warehouse) =>
            String(
              warehouse.id
            ) === warehouseId
        ) ?? null,
      [
        warehouseId,
        warehouses,
      ]
    );

  const locations =
    selectedWarehouse
      ?.locations ?? [];

  const allLocationsSelected =
    locations.length > 0 &&
    locations.every(
      (location) =>
        selectedLocationIds.includes(
          location.id
        )
    );

  const allAssigneesSelected =
    assignees.length > 0 &&
    assignees.every(
      (assignee) =>
        assignedUserIds.includes(
          assignee.userId
        )
    );

  const canSubmit =
    Boolean(warehouseId) &&
    assignedUserIds.length > 0 &&
    (
      scope ===
        "ALL_LOCATIONS" ||
      selectedLocationIds.length > 0
    ) &&
    !isPending;

  function handleWarehouseChange(
    value: string
  ) {
    setWarehouseId(value);
    setSelectedLocationIds([]);
  }

  function toggleLocation(
    locationId: number
  ) {
    setSelectedLocationIds(
      (currentIds) =>
        currentIds.includes(
          locationId
        )
          ? currentIds.filter(
              (id) =>
                id !== locationId
            )
          : [
              ...currentIds,
              locationId,
            ]
    );
  }

  function toggleAllLocations() {
    if (allLocationsSelected) {
      setSelectedLocationIds(
        []
      );

      return;
    }

    setSelectedLocationIds(
      locations.map(
        (location) =>
          location.id
      )
    );
  }

  function toggleAssignee(
    userId: string
  ) {
    setAssignedUserIds(
      (currentIds) =>
        currentIds.includes(
          userId
        )
          ? currentIds.filter(
              (id) =>
                id !== userId
            )
          : [
              ...currentIds,
              userId,
            ]
    );
  }

  function toggleAllAssignees() {
    if (allAssigneesSelected) {
      setAssignedUserIds(
        []
      );

      return;
    }

    setAssignedUserIds(
      assignees.map(
        (assignee) =>
          assignee.userId
      )
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-8"
    >
      <input
        type="hidden"
        name="selectedLocationIds"
        value={JSON.stringify(
          selectedLocationIds
        )}
      />

      <input
        type="hidden"
        name="assignedUserIds"
        value={JSON.stringify(
          assignedUserIds
        )}
      />

      {state.message && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800"
        >
          {state.message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            1. Depo Seçimi
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Sayım yapılacak depo
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Planlı sayım yalnızca
            seçilen depodaki aktif
            lokasyonları kapsayacaktır.
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="warehouseId"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Depo
          </label>

          <select
            id="warehouseId"
            name="warehouseId"
            required
            disabled={isPending}
            value={warehouseId}
            onChange={(event) =>
              handleWarehouseChange(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:bg-slate-100"
          >
            <option value="">
              Depo seçin
            </option>

            {warehouses.map(
              (warehouse) => (
                <option
                  key={warehouse.id}
                  value={
                    warehouse.id
                  }
                >
                  {warehouse.code} -{" "}
                  {warehouse.name} (
                  {
                    warehouse
                      .locations
                      .length
                  }{" "}
                  aktif lokasyon)
                </option>
              )
            )}
          </select>

          {warehouses.length ===
            0 && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Sayım yapılabilecek
              aktif depo bulunmuyor.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            2. Sayım Kapsamı
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Sayılacak lokasyonlar
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Deponun tamamını veya
            yalnızca belirlediğiniz
            lokasyonları sayıma dahil
            edebilirsiniz.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label
            className={`cursor-pointer rounded-2xl border p-5 transition ${
              scope ===
              "ALL_LOCATIONS"
                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20"
                : "border-slate-200 bg-white hover:border-slate-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="scope"
                value="ALL_LOCATIONS"
                checked={
                  scope ===
                  "ALL_LOCATIONS"
                }
                disabled={
                  isPending ||
                  !warehouseId
                }
                onChange={() =>
                  setScope(
                    "ALL_LOCATIONS"
                  )
                }
                className="mt-1 h-5 w-5"
              />

              <div>
                <p className="font-black text-slate-900">
                  Tüm Depo
                  Lokasyonları
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Seçilen depodaki
                  bütün aktif
                  lokasyonlar sayım
                  planına eklenir.
                </p>

                {selectedWarehouse && (
                  <p className="mt-3 font-bold text-blue-800">
                    {
                      locations.length
                    }{" "}
                    lokasyon
                  </p>
                )}
              </div>
            </div>
          </label>

          <label
            className={`cursor-pointer rounded-2xl border p-5 transition ${
              scope ===
              "SELECTED_LOCATIONS"
                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20"
                : "border-slate-200 bg-white hover:border-slate-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="scope"
                value="SELECTED_LOCATIONS"
                checked={
                  scope ===
                  "SELECTED_LOCATIONS"
                }
                disabled={
                  isPending ||
                  !warehouseId
                }
                onChange={() =>
                  setScope(
                    "SELECTED_LOCATIONS"
                  )
                }
                className="mt-1 h-5 w-5"
              />

              <div>
                <p className="font-black text-slate-900">
                  Seçili Lokasyonlar
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Yalnızca
                  işaretlediğiniz
                  lokasyonlar sayım
                  planına eklenir.
                </p>

                <p className="mt-3 font-bold text-blue-800">
                  {
                    selectedLocationIds.length
                  }{" "}
                  lokasyon seçildi
                </p>
              </div>
            </div>
          </label>
        </div>

        {scope ===
          "SELECTED_LOCATIONS" &&
          selectedWarehouse && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">
                    Lokasyon Seçimi
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Sayıma dahil
                    edilecek lokasyonları
                    işaretleyin.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    isPending ||
                    locations.length ===
                      0
                  }
                  onClick={
                    toggleAllLocations
                  }
                  className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allLocationsSelected
                    ? "Tümünü Temizle"
                    : "Tümünü Seç"}
                </button>
              </div>

              {locations.length ===
              0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  Seçilen depoda aktif
                  lokasyon bulunmuyor.
                </div>
              ) : (
                <div className="mt-4 max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {locations.map(
                    (location) => {
                      const checked =
                        selectedLocationIds.includes(
                          location.id
                        );

                      return (
                        <label
                          key={
                            location.id
                          }
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                            checked
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            disabled={
                              isPending
                            }
                            onChange={() =>
                              toggleLocation(
                                location.id
                              )
                            }
                            className="mt-1 h-5 w-5"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-900">
                              {
                                location.fullCode
                              }
                            </p>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span>
                                Tip:{" "}
                                {
                                  location.locationType
                                }
                              </span>

                              {location.aisle && (
                                <span>
                                  Koridor:{" "}
                                  {
                                    location.aisle
                                  }
                                </span>
                              )}

                              <span>
                                Kayıt No:{" "}
                                {
                                  location.id
                                }
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
              3. Personel Ataması
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Sayımı yapacak
              personeller
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              RF terminalde bu sayım
              numarasını görebilecek
              personelleri seçin.
            </p>
          </div>

          <button
            type="button"
            disabled={
              isPending ||
              assignees.length === 0
            }
            onClick={
              toggleAllAssignees
            }
            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allAssigneesSelected
              ? "Tümünü Temizle"
              : "Tümünü Seç"}
          </button>
        </div>

        {assignees.length === 0 ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
            RF erişimi ve sayım
            yetkisi bulunan aktif
            personel bulunamadı.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {assignees.map(
              (assignee) => {
                const checked =
                  assignedUserIds.includes(
                    assignee.userId
                  );

                return (
                  <label
                    key={
                      assignee.userId
                    }
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      checked
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        disabled={
                          isPending
                        }
                        onChange={() =>
                          toggleAssignee(
                            assignee.userId
                          )
                        }
                        className="mt-1 h-5 w-5"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900">
                          {
                            assignee.fullName
                          }
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          @
                          {
                            assignee.username
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                            Sicil:{" "}
                            {
                              assignee.employeeCode
                            }
                          </span>

                          {assignee.department && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                              {
                                assignee.department
                              }
                            </span>
                          )}

                          {assignee.title && (
                            <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                              {
                                assignee.title
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              }
            )}
          </div>
        )}

        <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
          {
            assignedUserIds.length
          }{" "}
          personel sayıma atandı.
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            4. Açıklama
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Sayım notları
          </h2>
        </div>

        <div className="mt-5">
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Açıklama
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={5}
            maxLength={1000}
            disabled={isPending}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:bg-slate-100"
            placeholder="Sayım amacı, vardiya bilgisi veya personele iletilecek açıklamalar..."
          />

          <p className="mt-2 text-xs text-slate-500">
            En fazla 1.000 karakter.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-600">
          <p>
            <strong>Depo:</strong>{" "}
            {selectedWarehouse
              ? `${selectedWarehouse.code} - ${selectedWarehouse.name}`
              : "Seçilmedi"}
          </p>

          <p className="mt-1">
            <strong>
              Lokasyon:
            </strong>{" "}
            {scope ===
            "ALL_LOCATIONS"
              ? `${locations.length} aktif lokasyonun tamamı`
              : `${selectedLocationIds.length} seçili lokasyon`}
          </p>

          <p className="mt-1">
            <strong>
              Personel:
            </strong>{" "}
            {
              assignedUserIds.length
            }{" "}
            kişi
          </p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-blue-900 px-6 py-3 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending
            ? "Sayım oluşturuluyor..."
            : "Sayım Numarası Oluştur"}
        </button>
      </div>
    </form>
  );
}