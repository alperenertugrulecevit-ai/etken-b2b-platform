import Link from "next/link";
import {
  getCities,
  getDistrictsOfEachCity,
} from "turkey-neighbourhoods";

import { prisma } from "@/lib/prisma";
import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

import {
  createCustomer,
  toggleCustomerStatus,
} from "./actions";

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: {
      companyName: "asc",
    },
  });

  const cities = getCities();
  const districtsByCityCode =
    getDistrictsOfEachCity();

  return (
    <section className="p-10">
      <div>
        <h1 className="text-4xl font-bold">
          Müşteri Yönetimi
        </h1>

        <p className="mt-2 text-gray-500">
          Kurumsal müşterileri ve ticari koşullarını yönetin.
        </p>
      </div>

      <div className="mt-10 grid gap-8 2xl:grid-cols-[440px_1fr]">
        <form
          action={createCustomer}
          className="h-fit rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-bold">
            Yeni Müşteri
          </h2>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Cari Kodu
                </span>

                <input
                  name="customerCode"
                  placeholder="Örneğin: MUS000001"
                  className="w-full rounded-xl border p-4 uppercase"
                  required
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Firma Adı
                </span>

                <input
                  name="companyName"
                  placeholder="Firma unvanı"
                  className="w-full rounded-xl border p-4"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Vergi Dairesi
                </span>

                <input
                  name="taxOffice"
                  placeholder="Vergi dairesi"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Vergi Numarası
                </span>

                <input
                  name="taxNumber"
                  placeholder="Vergi numarası"
                  className="w-full rounded-xl border p-4"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Yetkili Kişi
              </span>

              <input
                name="contactName"
                placeholder="Ad soyad"
                className="w-full rounded-xl border p-4"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
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

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  E-posta
                </span>

                <input
                  name="email"
                  type="email"
                  placeholder="E-posta"
                  className="w-full rounded-xl border p-4"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Adres
              </span>

              <textarea
                name="address"
                placeholder="Fatura veya merkez adresi"
                rows={3}
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

            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Vade
                </span>

                <input
                  name="paymentTermDays"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  İskonto %
                </span>

                <input
                  name="discountRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue="0"
                  className="w-full rounded-xl border p-4"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Kredi Limiti
                </span>

                <input
                  name="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  placeholder="Örneğin: 250000"
                  className="w-full rounded-xl border p-4"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800"
          >
            Müşteriyi Kaydet
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full min-w-[1580px] text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">Cari Kodu</th>
                <th className="p-4">Firma</th>
                <th className="p-4">Yetkili</th>
                <th className="p-4">İletişim</th>
                <th className="p-4">Konum</th>
                <th className="p-4">Vade</th>
                <th className="p-4">İskonto</th>
                <th className="p-4">Kredi Limiti</th>
                <th className="p-4">Durum</th>
                <th className="p-4">İşlemler</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`border-b hover:bg-slate-50 ${
                    !customer.isActive
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <td className="p-4 font-semibold text-blue-900">
                    {customer.customerCode}
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {customer.companyName}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {customer.taxOffice ||
                        "Vergi dairesi yok"}

                      {customer.taxNumber
                        ? ` / ${customer.taxNumber}`
                        : ""}
                    </p>
                  </td>

                  <td className="p-4">
                    {customer.contactName || "-"}
                  </td>

                  <td className="p-4">
                    <p>
                      {customer.phone || "-"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {customer.email || "-"}
                    </p>
                  </td>

                  <td className="p-4">
                    <p>
                      {customer.city || "-"}

                      {customer.district
                        ? ` / ${customer.district}`
                        : ""}
                    </p>

                    <p className="mt-1 max-w-60 truncate text-sm text-gray-500">
                      {customer.address ||
                        "Adres girilmedi"}
                    </p>
                  </td>

                  <td className="p-4">
                    {customer.paymentTermDays} gün
                  </td>

                  <td className="p-4">
                    %
                    {customer.discountRate.toLocaleString(
                      "tr-TR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </td>

                  <td className="whitespace-nowrap p-4 font-semibold">
                    {formatCurrency(
                      customer.creditLimit
                    )}{" "}
                    ₺
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        customer.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {customer.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/customers/${customer.id}/addresses`}
                        className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600"
                      >
                        📍 Adresler
                      </Link>

                      <Link
                        href={`/admin/customers/${customer.id}/edit`}
                        className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                      >
                        ✏️ Düzenle
                      </Link>

                      <form
                        action={toggleCustomerStatus.bind(
                          null,
                          customer.id,
                          customer.isActive
                        )}
                      >
                        <button
                          type="submit"
                          className={`rounded-lg px-4 py-2 font-semibold text-white ${
                            customer.isActive
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {customer.isActive
                            ? "Pasif Yap"
                            : "Aktifleştir"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="p-10 text-center text-gray-500"
                  >
                    Henüz müşteri oluşturulmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}