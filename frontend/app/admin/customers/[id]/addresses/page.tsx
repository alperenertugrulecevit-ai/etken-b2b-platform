import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCities,
  getDistrictsOfEachCity,
} from "turkey-neighbourhoods";

import { prisma } from "@/lib/prisma";
import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

import {
  createCustomerAddress,
  setDefaultCustomerAddress,
  toggleCustomerAddressStatus,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerAddressesPage({
  params,
}: Props) {
  const { id } = await params;
  const customerId = Number(id);

  if (!Number.isInteger(customerId)) {
    notFound();
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },

    include: {
      addresses: {
        orderBy: [
          {
            isDefault: "desc",
          },

          {
            title: "asc",
          },
        ],
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const cities = getCities();

  const districtsByCityCode =
    getDistrictsOfEachCity();

  return (
    <section className="p-10">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Müşteri Adresleri
          </h1>

          <p className="mt-2 text-gray-500">
            {customer.companyName} firmasının
            teslimat ve fatura adreslerini
            yönetin.
          </p>
        </div>

        <Link
          href="/admin/customers"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Müşteri Listesine Dön
        </Link>
      </div>

      <div className="mt-10 grid gap-8 2xl:grid-cols-[480px_1fr]">
        {/* YENİ ADRES FORMU */}

        <form
          action={createCustomerAddress.bind(
            null,
            customerId
          )}
          className="h-fit rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-bold">
            Yeni Adres
          </h2>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Adres Başlığı
              </span>

              <input
                name="title"
                placeholder="Örneğin: Gebze Depo"
                className="w-full rounded-xl border p-4"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Adres Tipi
              </span>

              <select
                name="addressType"
                defaultValue=""
                className="w-full rounded-xl border bg-white p-4"
                required
              >
                <option value="" disabled>
                  Adres tipi seçiniz
                </option>

                <option value="Merkez">
                  Merkez
                </option>

                <option value="Şube">
                  Şube
                </option>

                <option value="Depo">
                  Depo
                </option>

                <option value="Fabrika">
                  Fabrika
                </option>

                <option value="Teslimat">
                  Teslimat
                </option>

                <option value="Fatura">
                  Fatura
                </option>
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Teslim Alacak Kişi
                </span>

                <input
                  name="contactName"
                  placeholder="Ad soyad"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Telefon
                </span>

                <input
                  name="phone"
                  placeholder="Telefon"
                  className="w-full rounded-xl border p-4"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Açık Adres
              </span>

              <textarea
                name="address"
                rows={3}
                placeholder="Mahalle, cadde, sokak, bina no"
                className="w-full resize-none rounded-xl border p-4"
                required
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

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Posta Kodu
              </span>

              <input
                name="postalCode"
                placeholder="Posta kodu"
                className="w-full rounded-xl border p-4"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Teslim Alma Başlangıç
                </span>

                <input
                  name="deliveryStartTime"
                  type="time"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Teslim Alma Bitiş
                </span>

                <input
                  name="deliveryEndTime"
                  type="time"
                  className="w-full rounded-xl border p-4"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Rampa Sayısı
                </span>

                <input
                  name="rampCount"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Uygun Araç Tipi
                </span>

                <select
                  name="vehicleType"
                  defaultValue=""
                  className="w-full rounded-xl border bg-white p-4"
                >
                  <option value="">
                    Belirtilmedi
                  </option>

                  <option value="Panelvan">
                    Panelvan
                  </option>

                  <option value="Kamyonet">
                    Kamyonet
                  </option>

                  <option value="Kamyon">
                    Kamyon
                  </option>

                  <option value="Tır">
                    Tır
                  </option>

                  <option value="Tüm Araçlar">
                    Tüm Araçlar
                  </option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border p-4">
              <input
                name="hasForklift"
                type="checkbox"
              />

              Teslimat noktasında forklift var
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Operasyon Açıklaması
              </span>

              <textarea
                name="description"
                rows={3}
                placeholder="Giriş kapısı, güvenlik, araç kabulü ve diğer bilgiler"
                className="w-full resize-none rounded-xl border p-4"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border p-4">
              <input
                name="isDefault"
                type="checkbox"
              />

              Varsayılan teslimat adresi
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800"
          >
            Adresi Kaydet
          </button>
        </form>

        {/* ADRES LİSTESİ */}

        <div>
          <div className="grid gap-5">
            {customer.addresses.map(
              (address) => (
                <article
                  key={address.id}
                  className={`rounded-2xl bg-white p-6 shadow ${
                    !address.isActive
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">
                          {address.title}
                        </h2>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                          {address.addressType}
                        </span>

                        {address.isDefault && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                            Varsayılan
                          </span>
                        )}

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            address.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {address.isActive
                            ? "Aktif"
                            : "Pasif"}
                        </span>
                      </div>

                      <p className="mt-4 text-slate-700">
                        {address.address}
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {address.city} /{" "}
                        {address.district}
                      </p>

                      {address.postalCode && (
                        <p className="mt-1 text-sm text-gray-500">
                          Posta kodu:{" "}
                          {address.postalCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-gray-500">
                        Teslim Alacak Kişi
                      </p>

                      <p className="mt-1 font-semibold">
                        {address.contactName ||
                          "-"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {address.phone || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-gray-500">
                        Teslim Alma Saati
                      </p>

                      <p className="mt-1 font-semibold">
                        {address.deliveryStartTime ||
                          "--:--"}{" "}
                        -{" "}
                        {address.deliveryEndTime ||
                          "--:--"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-gray-500">
                        Operasyon
                      </p>

                      <p className="mt-1 font-semibold">
                        Forklift:{" "}
                        {address.hasForklift
                          ? "Var"
                          : "Yok"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Rampa:{" "}
                        {address.rampCount}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-gray-500">
                        Araç Tipi
                      </p>

                      <p className="mt-1 font-semibold">
                        {address.vehicleType ||
                          "-"}
                      </p>
                    </div>
                  </div>

                  {address.description && (
                    <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-yellow-900">
                      {address.description}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/customers/${customerId}/addresses/${address.id}/edit`}
                      className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                    >
                      ✏️ Düzenle
                    </Link>

                    {!address.isDefault && (
                      <form
                        action={setDefaultCustomerAddress.bind(
                          null,
                          customerId,
                          address.id
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600"
                        >
                          Varsayılan Yap
                        </button>
                      </form>
                    )}

                    <form
                      action={toggleCustomerAddressStatus.bind(
                        null,
                        customerId,
                        address.id,
                        address.isActive
                      )}
                    >
                      <button
                        type="submit"
                        className={`rounded-lg px-4 py-2 font-semibold text-white ${
                          address.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {address.isActive
                          ? "Pasif Yap"
                          : "Aktifleştir"}
                      </button>
                    </form>
                  </div>
                </article>
              )
            )}

            {customer.addresses.length ===
              0 && (
              <div className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow">
                Bu müşteriye henüz adres
                eklenmedi.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}