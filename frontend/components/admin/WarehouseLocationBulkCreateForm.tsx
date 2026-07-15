"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  createBulkWarehouseLocations,
  type BulkLocationActionState,
} from "@/app/admin/warehouses/[id]/locations/bulk/actions";

type Props = {
  warehouseId: number;
  warehouseIsActive: boolean;
};

const initialState:
  BulkLocationActionState = {
  success: false,
  message: "",
};

function safeRangeCount(
  startValue: string,
  endValue: string
) {
  const start = Number(startValue);
  const end = Number(endValue);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start
  ) {
    return 0;
  }

  return end - start + 1;
}

export default function WarehouseLocationBulkCreateForm({
  warehouseId,
  warehouseIsActive,
}: Props) {
  const [sectionStart, setSectionStart] =
    useState("1");

  const [sectionEnd, setSectionEnd] =
    useState("10");

  const [levelStart, setLevelStart] =
    useState("1");

  const [levelEnd, setLevelEnd] =
    useState("5");

  const [binStart, setBinStart] =
    useState("1");

  const [binEnd, setBinEnd] =
    useState("2");

  const boundAction =
    createBulkWarehouseLocations.bind(
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

  const totalLocationCount =
    useMemo(() => {
      const sectionCount =
        safeRangeCount(
          sectionStart,
          sectionEnd
        );

      const levelCount =
        safeRangeCount(
          levelStart,
          levelEnd
        );

      const binCount =
        safeRangeCount(
          binStart,
          binEnd
        );

      return (
        sectionCount *
        levelCount *
        binCount
      );
    }, [
      sectionStart,
      sectionEnd,
      levelStart,
      levelEnd,
      binStart,
      binEnd,
    ]);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-8 shadow"
    >
      <div>
        <h2 className="text-2xl font-bold">
          Toplu Lokasyon Oluştur
        </h2>

        <p className="mt-2 text-gray-500">
          Bölüm, kat ve göz aralıklarını
          girerek çok sayıda lokasyonu tek
          işlemde oluşturun.
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

          <p className="mt-2">
            {state.message}
          </p>
        </div>
      )}

      {!warehouseIsActive && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
          Pasif depoya yeni lokasyon
          oluşturulamaz.
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Lokasyon Kodu
          </span>

          <input
            name="code"
            placeholder="Örneğin: A"
            className="w-full rounded-xl border p-4 uppercase"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Aynı kod farklı bölüm, kat ve
            gözlerde kullanılabilir.
          </p>
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Koridor
          </span>

          <input
            name="aisle"
            placeholder="Örneğin: A"
            className="w-full rounded-xl border p-4 uppercase"
          />

          <p className="mt-2 text-xs text-gray-500">
            Boş bırakılırsa lokasyon kodu
            koridor olarak kullanılır.
          </p>
        </label>

        <div className="rounded-xl border p-5">
          <p className="font-bold">
            Bölüm Aralığı
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label>
              <span className="mb-2 block text-xs font-semibold">
                Başlangıç
              </span>

              <input
                name="sectionStart"
                type="number"
                min="0"
                step="1"
                value={sectionStart}
                onChange={(event) =>
                  setSectionStart(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border p-4"
                required
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold">
                Bitiş
              </span>

              <input
                name="sectionEnd"
                type="number"
                min="0"
                step="1"
                value={sectionEnd}
                onChange={(event) =>
                  setSectionEnd(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border p-4"
                required
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <p className="font-bold">
            Kat Aralığı
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label>
              <span className="mb-2 block text-xs font-semibold">
                Başlangıç
              </span>

              <input
                name="levelStart"
                type="number"
                min="0"
                step="1"
                value={levelStart}
                onChange={(event) =>
                  setLevelStart(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border p-4"
                required
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold">
                Bitiş
              </span>

              <input
                name="levelEnd"
                type="number"
                min="0"
                step="1"
                value={levelEnd}
                onChange={(event) =>
                  setLevelEnd(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border p-4"
                required
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <p className="font-bold">
            Göz Aralığı
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label>
              <span className="mb-2 block text-xs font-semibold">
                Başlangıç
              </span>

              <input
                name="binStart"
                type="number"
                min="0"
                step="1"
                value={binStart}
                onChange={(event) =>
                  setBinStart(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border p-4"
                required
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold">
                Bitiş
              </span>

              <input
                name="binEnd"
                type="number"
                min="0"
                step="1"
                value={binEnd}
                onChange={(event) =>
                  setBinEnd(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border p-4"
                required
              />
            </label>
          </div>
        </div>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Lokasyon Tipi
          </span>

          <select
            name="locationType"
            defaultValue="PALLET"
            className="w-full rounded-xl border bg-white p-4"
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
            Lokasyon Kapasitesi
          </span>

          <input
            name="capacity"
            type="number"
            min="1"
            step="1"
            defaultValue="1"
            className="w-full rounded-xl border p-4"
            required
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Başlangıç Sıra Değeri
          </span>

          <input
            name="sortOrderStart"
            type="number"
            min="0"
            step="1"
            defaultValue="1"
            className="w-full rounded-xl border p-4"
          />

          <p className="mt-2 text-xs text-gray-500">
            Her yeni lokasyonda sıra değeri
            bir artırılır.
          </p>
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={3}
            placeholder="Toplu oluşturulan lokasyonlar için açıklama"
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <div className="mt-8 rounded-2xl bg-blue-50 p-6">
        <p className="text-sm font-semibold text-blue-700">
          Oluşturulacak Lokasyon Sayısı
        </p>

        <p className="mt-3 text-5xl font-bold text-blue-900">
          {totalLocationCount.toLocaleString(
            "tr-TR"
          )}
        </p>

        {totalLocationCount > 2000 && (
          <p className="mt-3 font-semibold text-red-700">
            Tek işlemde en fazla 2.000
            lokasyon oluşturulabilir.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          !warehouseIsActive ||
          totalLocationCount <= 0 ||
          totalLocationCount > 2000
        }
        className={`mt-8 w-full rounded-xl py-4 font-bold ${
          !isPending &&
          warehouseIsActive &&
          totalLocationCount > 0 &&
          totalLocationCount <= 2000
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Lokasyonlar Oluşturuluyor..."
          : `${totalLocationCount.toLocaleString(
              "tr-TR"
            )} Lokasyonu Oluştur`}
      </button>
    </form>
  );
}