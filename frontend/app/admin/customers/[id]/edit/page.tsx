import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  getCities,
  getDistrictsOfEachCity,
} from "turkey-neighbourhoods";

import { prisma } from "@/lib/prisma";
import CityDistrictSelect from "@/components/admin/CityDistrictSelect";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCustomerPage({
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
  });

  if (!customer) {
    notFound();
  }

  const cities = getCities();
  const districtsByCityCode = getDistrictsOfEachCity();

  async function updateCustomer(formData: FormData) {
    "use server";

    const customerCode = String(
      formData.get("customerCode") ?? ""
    )
      .trim()
      .toUpperCase();

    const companyName = String(
      formData.get("companyName") ?? ""
    ).trim();

    await prisma.customer.update({
      where: {
        id: customerId,
      },

      data: {
        customerCode,
        companyName,

        taxOffice:
          String(
            formData.get("taxOffice") ?? ""
          ).trim() || null,

        taxNumber:
          String(
            formData.get("taxNumber") ?? ""
          ).trim() || null,

        contactName:
          String(
            formData.get("contactName") ?? ""
          ).trim() || null,

        phone:
          String(
            formData.get("phone") ?? ""
          ).trim() || null,

        email:
          String(
            formData.get("email") ?? ""
          ).trim() || null,

        address:
          String(
            formData.get("address") ?? ""
          ).trim() || null,

        city:
          String(
            formData.get("city") ?? ""
          ).trim() || null,

        district:
          String(
            formData.get("district") ?? ""
          ).trim() || null,

        paymentTermDays: Number(
          formData.get("paymentTermDays") ?? 0
        ),

        discountRate: Number(
          formData.get("discountRate") ?? 0
        ),

        creditLimit: Number(
          formData.get("creditLimit") ?? 0
        ),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/customers");

    redirect("/admin/customers");
  }

  return (
    <section className="p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Müşteri Düzenle
            </h1>

            <p className="mt-2 text-gray-500">
              {customer.companyName} müşteri bilgilerini güncelleyin.
            </p>
          </div>

          <Link
            href="/admin/customers"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Müşteri Listesine Dön
          </Link>
        </div>

        <form
          action={updateCustomer}
          className="mt-10 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Cari Kodu
            </span>

            <input
              name="customerCode"
              defaultValue={customer.customerCode}
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
              defaultValue={customer.companyName}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Vergi Dairesi
            </span>

            <input
              name="taxOffice"
              defaultValue={customer.taxOffice ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Vergi Numarası
            </span>

            <input
              name="taxNumber"
              defaultValue={customer.taxNumber ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Yetkili Kişi
            </span>

            <input
              name="contactName"
              defaultValue={customer.contactName ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Telefon
            </span>

            <input
              name="phone"
              defaultValue={customer.phone ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              E-posta
            </span>

            <input
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Adres
            </span>

            <textarea
              name="address"
              defaultValue={customer.address ?? ""}
              rows={4}
              className="w-full resize-none rounded-xl border p-4"
            />
          </label>

          <CityDistrictSelect
            cities={cities}
            districtsByCityCode={districtsByCityCode}
            defaultCity={customer.city ?? ""}
            defaultDistrict={customer.district ?? ""}
          />

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Vade (Gün)
            </span>

            <input
              name="paymentTermDays"
              type="number"
              min="0"
              defaultValue={customer.paymentTermDays}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              İskonto Oranı (%)
            </span>

            <input
              name="discountRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={customer.discountRate}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Kredi Limiti
            </span>

            <input
              name="creditLimit"
              type="number"
              min="0"
              step="0.01"
              defaultValue={customer.creditLimit}
              placeholder="Örneğin: 250000"
              className="w-full rounded-xl border p-4"
            />

            <p className="mt-2 text-sm text-gray-500">
              Değeri 250000 şeklinde girin. Müşteri listesinde
              250.000,00 ₺ olarak gösterilir.
            </p>
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