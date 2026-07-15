"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createWarehouseLocation,
  type WarehouseLocationActionState,
} from "@/app/admin/warehouses/[id]/locations/actions";

type Props = {
  warehouseId: number;
  warehouseIsActive: boolean;
};

const initialState:
  WarehouseLocationActionState = {
  success: false,
  message: "",
};

function normalizePart(
  value: string,
  minimumLength = 2
) {
  const normalized = value
    .trim()
    .toUpperCase();

  if (!normalized) {
    return "";
  }

  if (/^\d+$/.test(normalized)) {
    return normalized.padStart(
      minimumLength,
      "0"
    );
  }

  return normalized;
}

export default function WarehouseLocationCreateForm({
  warehouseId,
  warehouseIsActive,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [aisle, setAisle] =
    useState("");

  const [section, setSection] =
    useState("");

  const [level, setLevel] =
    useState("");

  const [bin, setBin] =
    useState("");

  const boundAction =
    createWarehouseLocation.bind(
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

  const generatedCode = useMemo(
    () => {
      const parts = [
        normalizePart(aisle, 1),
        normalizePart(section),
        normalizePart(level),
        normalizePart(bin),
      ];

      if (
        parts.some(
          (part) => !part
        )
      ) {
        return "";
      }

      return parts.join("-");
    },
    [aisle, section, level, bin]
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();

      setAisle("");
      setSection("");
      setLevel("");
      setBin("");
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="h-fit rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-2xl font-bold">
        Yeni Lokasyon
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Standart raf lokasyonu için kodu
        boş bırakıp koridor, bölüm, kat ve
        göz bilgilerini doldurabilirsiniz.
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
        </div>
      )}

      {!warehouseIsActive && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
          Depo pasif durumda olduğu için
          yeni lokasyon oluşturulamaz.
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Özel Lokasyon Kodu
          </span>

          <input
            name="code"
            placeholder="Örneğin: IADE-01 veya RFID-01"
            maxLength={50}
            className="w-full rounded-xl border p-4 uppercase"
          />

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Bu alan doldurulursa otomatik
            oluşturulan kod yerine yazdığınız
            kod kullanılır.
          </p>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Koridor
            </span>

            <input
              name="aisle"
              value={aisle}
              onChange={(event) =>
                setAisle(
                  event.target.value
                )
              }
              placeholder="A"
              className="w-full rounded-xl border p-4 uppercase"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Bölüm / Blok
            </span>

            <input
              name="section"
              value={section}
              onChange={(event) =>
                setSection(
                  event.target.value
                )
              }
              placeholder="01"
              className="w-full rounded-xl border p-4 uppercase"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Kat
            </span>

            <input
              name="level"
              value={level}
              onChange={(event) =>
                setLevel(
                  event.target.value
                )
              }
              placeholder="01"
              className="w-full rounded-xl border p-4 uppercase"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Göz
            </span>

            <input
              name="bin"
              value={bin}
              onChange={(event) =>
                setBin(
                  event.target.value
                )
              }
              placeholder="01"
              className="w-full rounded-xl border p-4 uppercase"
            />
          </label>
        </div>

        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-700">
            Otomatik Kod Önizlemesi
          </p>

          <p className="mt-2 text-xl font-bold text-blue-900">
            {generatedCode ||
              "A-01-01-01"}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Lokasyon Tipi
          </span>

          <select
            name="locationType"
            defaultValue="PALLET"
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

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Kapasite
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

            <p className="mt-2 text-xs text-gray-500">
              Örneğin palet gözü için palet
              kapasitesi.
            </p>
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
              defaultValue="0"
              className="w-full rounded-xl border p-4"
            />

            <p className="mt-2 text-xs text-gray-500">
              Toplama rotasında kullanılacak
              sıra değeri.
            </p>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={3}
            placeholder="Lokasyonla ilgili operasyon notu"
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          !warehouseIsActive
        }
        className={`mt-7 w-full rounded-xl py-4 font-bold ${
          !isPending &&
          warehouseIsActive
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Lokasyon Kaydediliyor..."
          : "Lokasyonu Kaydet"}
      </button>
    </form>
  );
}