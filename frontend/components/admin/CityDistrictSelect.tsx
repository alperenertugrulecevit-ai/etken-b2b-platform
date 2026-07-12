"use client";

import { useMemo, useState } from "react";

type City = {
  code: string;
  name: string;
};

type DistrictsByCityCode = Record<string, string[]>;

type CityDistrictSelectProps = {
  cities: City[];
  districtsByCityCode: DistrictsByCityCode;
  defaultCity?: string;
  defaultDistrict?: string;
};

export default function CityDistrictSelect({
  cities,
  districtsByCityCode,
  defaultCity = "",
  defaultDistrict = "",
}: CityDistrictSelectProps) {
  const initialCityCode =
    cities.find((city) => city.name === defaultCity)?.code ?? "";

  const [selectedCityCode, setSelectedCityCode] =
    useState(initialCityCode);

  const [selectedDistrict, setSelectedDistrict] =
    useState(defaultDistrict);

  const selectedCityName =
    cities.find((city) => city.code === selectedCityCode)?.name ?? "";

  const districts = useMemo(() => {
    if (!selectedCityCode) {
      return [];
    }

    return districtsByCityCode[selectedCityCode] ?? [];
  }, [districtsByCityCode, selectedCityCode]);

  function handleCityChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setSelectedCityCode(event.target.value);
    setSelectedDistrict("");
  }

  return (
    <>
      <label>
        <span className="mb-2 block text-sm font-semibold">
          İl
        </span>

        <select
          value={selectedCityCode}
          onChange={handleCityChange}
          className="w-full rounded-xl border bg-white p-4"
          required
        >
          <option value="">
            İl seçiniz
          </option>

          {cities.map((city) => (
            <option
              key={city.code}
              value={city.code}
            >
              {city.name}
            </option>
          ))}
        </select>

        <input
          type="hidden"
          name="city"
          value={selectedCityName}
        />
      </label>

      <label>
        <span className="mb-2 block text-sm font-semibold">
          İlçe
        </span>

        <select
          name="district"
          value={selectedDistrict}
          onChange={(event) =>
            setSelectedDistrict(event.target.value)
          }
          disabled={!selectedCityCode}
          className={`w-full rounded-xl border p-4 ${
            selectedCityCode
              ? "bg-white"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
          required
        >
          <option value="">
            {selectedCityCode
              ? "İlçe seçiniz"
              : "Önce il seçiniz"}
          </option>

          {districts.map((district) => (
            <option
              key={district}
              value={district}
            >
              {district}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}