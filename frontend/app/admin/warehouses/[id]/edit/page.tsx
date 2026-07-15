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

function getOptionalText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  return value || null;
}

export default async function EditWarehousePage({
  params,
}: Props) {
  const { id } = await params;
  const warehouseId = Number(id);

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    notFound();
  }

  const warehouse =
    await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },

      include: {
        _count: {
          select: {
            locations: true,
          },
        },
      },
    });

  if (!warehouse) {
    notFound();
  }

  const cities = getCities();

  const districtsByCityCode =
    getDistrictsOfEachCity();

  async function updateWarehouse(
    formData: FormData
  ) {
    "use server";

    const code = String(
      formData.get("code") ?? ""
    )
      .trim()
      .toUpperCase();

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    if (!code) {
      throw new Error(
        "Depo kodu zorunludur."
      );
    }

    if (!name) {
      throw new Error(
        "Depo adı zorunludur."
      );
    }

    try {
      await prisma.warehouse.update({
        where: {
          id: warehouseId,
        },

        data: {
          code,
          name,

          address: getOptionalText(
            formData,
            "address"
          ),

          city: getOptionalText(
            formData,
            "city"
          ),

          district: getOptionalText(
            formData,
            "district"
          ),
        },
      });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error(
          "Bu depo koduyla kayıtlı başka bir depo bulunuyor."
        );
      }

      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/warehouses");

    revalidatePath(
      `/admin/warehouses/${warehouseId}/edit`
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations`
    );

    redirect("/admin/warehouses");
  }

  return (
    <section className="p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Depo Düzenle
            </h1>

            <p className="mt-3 text-xl font-bold text-blue-900">
              {warehouse.code}
            </p>

            <p className="mt-2 text-gray-500">
              {warehouse.name} depo ve
              adres bilgilerini güncelleyin.
            </p>
          </div>

          <Link
            href="/admin/warehouses"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Depo Listesine Dön
          </Link>
        </div>

        <div className="mt-8 rounded-xl bg-blue-50 p-5 text-blue-800">
          Bu depoda şu anda{" "}
          <strong>
            {
              warehouse._count
                .locations
            }
          </strong>{" "}
          lokasyon bulunuyor.
        </div>

        <form
          action={updateWarehouse}
          className="mt-8 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Depo Kodu
            </span>

            <input
              name="code"
              defaultValue={warehouse.code}
              className="w-full rounded-xl border p-4 uppercase"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Depo Adı
            </span>

            <input
              name="name"
              defaultValue={warehouse.name}
              className="w-full rounded-xl border p-4"
              required
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
                warehouse.address ?? ""
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
              warehouse.city ?? ""
            }
            defaultDistrict={
              warehouse.district ?? ""
            }
          />

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