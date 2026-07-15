"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

import {
  createWarehouse,
  type WarehouseActionState,
} from "@/app/admin/warehouses/actions";

type City = {
  id?: string | number;
  code?: string | number;
  name?: string;
  city?: string;
  [key: string]: unknown;
};

type DistrictsByCityCode = Record<
  string,
  unknown
>;

type Props = {
  cities: City[];
  districtsByCityCode: DistrictsByCityCode;
};

const initialState: WarehouseActionState = {
  success: false,
  message: "",
};

export default function WarehouseCreateForm({
  cities,
  districtsByCityCode,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] =
    useActionState(
      createWarehouse,
      initialState
    );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="h-fit rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-2xl font-bold">
        Yeni Depo
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Depo kodu, adı ve adres
        bilgilerini tanımlayın.
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

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Depo Kodu
          </span>

          <input
            name="code"
            placeholder="Örneğin: MRK"
            maxLength={20}
            className="w-full rounded-xl border p-4 uppercase"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Kısa ve benzersiz bir kod
            kullanın.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Depo Adı
          </span>

          <input
            name="name"
            placeholder="Örneğin: Merkez Depo"
            className="w-full rounded-xl border p-4"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Açık Adres
          </span>

          <textarea
            name="address"
            rows={4}
            placeholder="Cadde, sokak, bina ve diğer adres bilgileri"
            className="w-full resize-none rounded-xl border p-4"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <CityDistrictSelect
            cities={cities}
            districtsByCityCode={
              districtsByCityCode
            }
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-7 w-full rounded-xl py-4 font-bold ${
          isPending
            ? "cursor-not-allowed bg-slate-300 text-slate-500"
            : "bg-blue-900 text-white hover:bg-blue-800"
        }`}
      >
        {isPending
          ? "Depo Kaydediliyor..."
          : "Depoyu Kaydet"}
      </button>
    </form>
  );
}