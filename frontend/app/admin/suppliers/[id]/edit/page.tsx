import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { Prisma } from "@prisma/client";
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

function optionalText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  return value || null;
}

export default async function EditSupplierPage({
  params,
}: Props) {
  const { id } = await params;
  const supplierId = Number(id);

  if (
    !Number.isInteger(supplierId) ||
    supplierId <= 0
  ) {
    notFound();
  }

  const supplier =
    await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

  if (!supplier) {
    notFound();
  }

  const cities = getCities();

  const districtsByCityCode =
    getDistrictsOfEachCity();

  async function updateSupplier(
    formData: FormData
  ) {
    "use server";

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    if (!name) {
      throw new Error(
        "Tedarikçi firma adı zorunludur."
      );
    }

    const paymentTermDays = Number(
      formData.get("paymentTermDays") ?? 0
    );

    const discountRate = Number(
      formData.get("discountRate") ?? 0
    );

    const deliveryDays = Number(
      formData.get("deliveryDays") ?? 1
    );

    if (
      !Number.isInteger(paymentTermDays) ||
      paymentTermDays < 0
    ) {
      throw new Error(
        "Vade günü geçerli değil."
      );
    }

    if (
      !Number.isFinite(discountRate) ||
      discountRate < 0 ||
      discountRate > 100
    ) {
      throw new Error(
        "İskonto oranı 0 ile 100 arasında olmalıdır."
      );
    }

    if (
      !Number.isInteger(deliveryDays) ||
      deliveryDays < 0
    ) {
      throw new Error(
        "Teslim süresi geçerli değil."
      );
    }

    try {
      await prisma.supplier.update({
        where: {
          id: supplierId,
        },

        data: {
          name,

          taxOffice: optionalText(
            formData,
            "taxOffice"
          ),

          taxNumber: optionalText(
            formData,
            "taxNumber"
          ),

          contactName: optionalText(
            formData,
            "contactName"
          ),

          phone: optionalText(
            formData,
            "phone"
          ),

          email: optionalText(
            formData,
            "email"
          ),

          address: optionalText(
            formData,
            "address"
          ),

          city: optionalText(
            formData,
            "city"
          ),

          district: optionalText(
            formData,
            "district"
          ),

          postalCode: optionalText(
            formData,
            "postalCode"
          ),

          paymentTermDays,
          discountRate,
          deliveryDays,
        },
      });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error(
          "Aynı firma adı veya vergi numarasıyla kayıtlı başka bir tedarikçi bulunuyor."
        );
      }

      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/suppliers");
    revalidatePath(
      `/admin/suppliers/${supplierId}/edit`
    );
    revalidatePath(
      "/admin/purchase-orders"
    );
    revalidatePath(
      "/admin/purchase-orders/new"
    );

    redirect("/admin/suppliers");
  }

  return (
    <section className="p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Tedarikçi Düzenle
            </h1>

            <p className="mt-2 text-gray-500">
              {supplier.name} firma, vergi,
              adres ve ticari koşul bilgilerini
              güncelleyin.
            </p>
          </div>

          <Link
            href="/admin/suppliers"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Tedarikçi Listesine Dön
          </Link>
        </div>

        <form
          action={updateSupplier}
          className="mt-10 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Firma Adı
            </span>

            <input
              name="name"
              defaultValue={supplier.name}
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
              defaultValue={
                supplier.taxOffice ?? ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Vergi Numarası
            </span>

            <input
              name="taxNumber"
              defaultValue={
                supplier.taxNumber ?? ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Yetkili Kişi
            </span>

            <input
              name="contactName"
              defaultValue={
                supplier.contactName ?? ""
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
                supplier.phone ?? ""
              }
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
              defaultValue={
                supplier.email ?? ""
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
              rows={4}
              defaultValue={
                supplier.address ?? ""
              }
              className="w-full resize-none rounded-xl border p-4"
            />
          </label>

          <CityDistrictSelect
            cities={cities}
            districtsByCityCode={
              districtsByCityCode
            }
            defaultCity={
              supplier.city ?? ""
            }
            defaultDistrict={
              supplier.district ?? ""
            }
          />

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Posta Kodu
            </span>

            <input
              name="postalCode"
              defaultValue={
                supplier.postalCode ?? ""
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Vade (Gün)
            </span>

            <input
              name="paymentTermDays"
              type="number"
              min="0"
              step="1"
              defaultValue={
                supplier.paymentTermDays
              }
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
              defaultValue={
                supplier.discountRate
              }
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Ortalama Teslim Süresi (Gün)
            </span>

            <input
              name="deliveryDays"
              type="number"
              min="0"
              step="1"
              defaultValue={
                supplier.deliveryDays
              }
              className="w-full rounded-xl border p-4"
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