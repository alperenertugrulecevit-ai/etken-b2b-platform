import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSupplierPage({ params }: Props) {
  const { id } = await params;
  const supplierId = Number(id);

  if (!Number.isInteger(supplierId)) {
    notFound();
  }

  const supplier = await prisma.supplier.findUnique({
    where: {
      id: supplierId,
    },
  });

  if (!supplier) {
    notFound();
  }

  async function updateSupplier(formData: FormData) {
    "use server";

    await prisma.supplier.update({
      where: {
        id: supplierId,
      },
      data: {
        name: String(formData.get("name") ?? "").trim(),
        taxNumber:
          String(formData.get("taxNumber") ?? "").trim() || null,
        contactName:
          String(formData.get("contactName") ?? "").trim() || null,
        phone:
          String(formData.get("phone") ?? "").trim() || null,
        email:
          String(formData.get("email") ?? "").trim() || null,
        paymentTermDays: Number(
          formData.get("paymentTermDays") ?? 0
        ),
        discountRate: Number(
          formData.get("discountRate") ?? 0
        ),
        deliveryDays: Number(
          formData.get("deliveryDays") ?? 1
        ),
      },
    });

    revalidatePath("/admin/suppliers");
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/new");

    redirect("/admin/suppliers");
  }

  return (
    <section className="p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Tedarikçi Düzenle
            </h1>

            <p className="mt-2 text-gray-500">
              {supplier.name} firmasının bilgilerini güncelleyin.
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
              Vergi Numarası
            </span>

            <input
              name="taxNumber"
              defaultValue={supplier.taxNumber ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Yetkili Kişi
            </span>

            <input
              name="contactName"
              defaultValue={supplier.contactName ?? ""}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Telefon
            </span>

            <input
              name="phone"
              defaultValue={supplier.phone ?? ""}
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
              defaultValue={supplier.email ?? ""}
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
              defaultValue={supplier.paymentTermDays}
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
              step="0.01"
              defaultValue={supplier.discountRate}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Teslim Süresi (Gün)
            </span>

            <input
              name="deliveryDays"
              type="number"
              min="0"
              defaultValue={supplier.deliveryDays}
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