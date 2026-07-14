import Link from "next/link";

import {
  getCities,
  getDistrictsOfEachCity,
} from "turkey-neighbourhoods";

import { prisma } from "@/lib/prisma";

import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

import {
  createSupplier,
  toggleSupplierStatus,
} from "./actions";

function formatRate(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default async function AdminSuppliersPage() {
  const suppliers =
    await prisma.supplier.findMany({
      orderBy: {
        name: "asc",
      },

      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
    });

  const cities = getCities();

  const districtsByCityCode =
    getDistrictsOfEachCity();

  return (
    <section className="p-10">
      <div>
        <h1 className="text-4xl font-bold">
          Tedarikçi Yönetimi
        </h1>

        <p className="mt-2 text-gray-500">
          Tedarikçi iletişim, adres, vergi ve
          ticari koşullarını yönetin.
        </p>
      </div>

      <div className="mt-10 grid gap-8 2xl:grid-cols-[460px_1fr]">
        {/* YENİ TEDARİKÇİ FORMU */}

        <form
          action={createSupplier}
          className="h-fit rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-2xl font-bold">
            Yeni Tedarikçi
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Firma, vergi, adres ve ticari
            koşul bilgilerini girin.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Firma Adı
              </span>

              <input
                name="name"
                placeholder="Tedarikçi firma unvanı"
                className="w-full rounded-xl border p-4"
                required
              />
            </label>

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
                Açık Adres
              </span>

              <textarea
                name="address"
                rows={3}
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

            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  Vade (Gün)
                </span>

                <input
                  name="paymentTermDays"
                  type="number"
                  min="0"
                  step="1"
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
                  Teslim Günü
                </span>

                <input
                  name="deliveryDays"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="1"
                  className="w-full rounded-xl border p-4"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800"
          >
            Tedarikçiyi Kaydet
          </button>
        </form>

        {/* TEDARİKÇİ LİSTESİ */}

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full min-w-[1750px] text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">
                  Firma
                </th>

                <th className="p-4">
                  Vergi Bilgileri
                </th>

                <th className="p-4">
                  Yetkili
                </th>

                <th className="p-4">
                  İletişim
                </th>

                <th className="p-4">
                  Adres
                </th>

                <th className="p-4">
                  Vade
                </th>

                <th className="p-4">
                  İskonto
                </th>

                <th className="p-4">
                  Teslim
                </th>

                <th className="p-4">
                  Satın Alma
                </th>

                <th className="p-4">
                  Durum
                </th>

                <th className="p-4">
                  İşlemler
                </th>
              </tr>
            </thead>

            <tbody>
              {suppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className={`border-b hover:bg-slate-50 ${
                    !supplier.isActive
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <td className="p-4">
                    <p className="font-bold text-blue-900">
                      {supplier.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Tedarikçi No:{" "}
                      {supplier.id}
                    </p>
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {supplier.taxOffice ||
                        "Vergi dairesi yok"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {supplier.taxNumber ||
                        "Vergi numarası yok"}
                    </p>
                  </td>

                  <td className="p-4">
                    {supplier.contactName || "-"}
                  </td>

                  <td className="p-4">
                    <p>
                      {supplier.phone || "-"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {supplier.email || "-"}
                    </p>
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {supplier.city || "-"}

                      {supplier.district
                        ? ` / ${supplier.district}`
                        : ""}
                    </p>

                    <p className="mt-1 max-w-72 truncate text-sm text-gray-500">
                      {supplier.address ||
                        "Adres girilmedi"}
                    </p>

                    {supplier.postalCode && (
                      <p className="mt-1 text-xs text-gray-400">
                        Posta Kodu:{" "}
                        {supplier.postalCode}
                      </p>
                    )}
                  </td>

                  <td className="p-4">
                    {supplier.paymentTermDays} gün
                  </td>

                  <td className="p-4">
                    %
                    {formatRate(
                      supplier.discountRate
                    )}
                  </td>

                  <td className="p-4">
                    {supplier.deliveryDays} gün
                  </td>

                  <td className="p-4 font-semibold">
                    {
                      supplier._count
                        .purchaseOrders
                    }{" "}
                    kayıt
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        supplier.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {supplier.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/suppliers/${supplier.id}/edit`}
                        className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                      >
                        ✏️ Düzenle
                      </Link>

                      <form
                        action={toggleSupplierStatus.bind(
                          null,
                          supplier.id,
                          supplier.isActive
                        )}
                      >
                        <button
                          type="submit"
                          className={`rounded-lg px-4 py-2 font-semibold text-white ${
                            supplier.isActive
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {supplier.isActive
                            ? "Pasif Yap"
                            : "Aktifleştir"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {suppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="p-12 text-center text-gray-500"
                  >
                    Henüz tedarikçi
                    oluşturulmadı.
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