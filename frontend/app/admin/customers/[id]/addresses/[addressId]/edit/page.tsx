import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  getCities,
  getDistrictsOfEachCity,
} from "turkey-neighbourhoods";

import { prisma } from "@/lib/prisma";

import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import {
  updateCustomerAddress,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
    addressId: string;
  }>;
};

export default async function EditCustomerAddressPage({
  params,
}: Props) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  const {
    id,
    addressId,
  } = await params;

  const customerId = Number(id);

  const customerAddressId =
    Number(addressId);

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0 ||
    !Number.isInteger(
      customerAddressId
    ) ||
    customerAddressId <= 0
  ) {
    notFound();
  }

  const [
    customer,
    customerAddress,
  ] = await Promise.all([
    prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    }),

    prisma.customerAddress.findFirst({
      where: {
        id: customerAddressId,
        customerId,
      },
    }),
  ]);

  if (
    !customer ||
    !customerAddress
  ) {
    notFound();
  }

  const cities =
    getCities();

  const districtsByCityCode =
    getDistrictsOfEachCity();

  const updateCustomerAddressAction =
    updateCustomerAddress.bind(
      null,
      customerId,
      customerAddressId
    );

  return (
    <section className="p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Adres Düzenle
            </h1>

            <p className="mt-2 text-gray-500">
              {customer.companyName} —{" "}
              {customerAddress.title}
            </p>
          </div>

          <Link
            href={`/admin/customers/${customerId}/addresses`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Adres Listesine Dön
          </Link>
        </div>

        <form
          action={
            updateCustomerAddressAction
          }
          className="mt-10 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Adres Başlığı
            </span>

            <input
              name="title"
              defaultValue={
                customerAddress.title
              }
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Adres Tipi
            </span>

            <select
              name="addressType"
              defaultValue={
                customerAddress.addressType
              }
              className="w-full rounded-xl border bg-white p-4"
              required
            >
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

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Teslim Alacak Kişi
            </span>

            <input
              name="contactName"
              defaultValue={
                customerAddress.contactName ??
                ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Telefon
            </span>

            <input
              name="phone"
              defaultValue={
                customerAddress.phone ??
                ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Açık Adres
            </span>

            <textarea
              name="address"
              defaultValue={
                customerAddress.address
              }
              rows={4}
              className="w-full resize-none rounded-xl border p-4"
              required
            />
          </label>

          <CityDistrictSelect
            cities={cities}
            districtsByCityCode={
              districtsByCityCode
            }
            defaultCity={
              customerAddress.city
            }
            defaultDistrict={
              customerAddress.district
            }
          />

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Posta Kodu
            </span>

            <input
              name="postalCode"
              defaultValue={
                customerAddress.postalCode ??
                ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <div className="hidden md:block" />

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Teslim Alma Başlangıç
            </span>

            <input
              name="deliveryStartTime"
              type="time"
              defaultValue={
                customerAddress.deliveryStartTime ??
                ""
              }
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
              defaultValue={
                customerAddress.deliveryEndTime ??
                ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Rampa Sayısı
            </span>

            <input
              name="rampCount"
              type="number"
              min="0"
              step="1"
              defaultValue={
                customerAddress.rampCount
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Uygun Araç Tipi
            </span>

            <select
              name="vehicleType"
              defaultValue={
                customerAddress.vehicleType ??
                ""
              }
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

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              name="hasForklift"
              type="checkbox"
              defaultChecked={
                customerAddress.hasForklift
              }
            />

            Teslimat noktasında forklift var
          </label>

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              name="isDefault"
              type="checkbox"
              defaultChecked={
                customerAddress.isDefault
              }
            />

            Varsayılan teslimat adresi
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Operasyon Açıklaması
            </span>

            <textarea
              name="description"
              defaultValue={
                customerAddress.description ??
                ""
              }
              rows={4}
              className="w-full resize-none rounded-xl border p-4"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800 md:col-span-2"
          >
            Değişiklikleri Kaydet
          </button>
        </form>
      </div>
    </section>
  );
}