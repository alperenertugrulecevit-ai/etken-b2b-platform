import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function NewProductPage() {
  async function createProduct(formData: FormData) {
    "use server";

    await prisma.product.create({
      data: {
        code: String(formData.get("code")),
        barcode: String(formData.get("barcode")),
        name: String(formData.get("name")),
        brand: String(formData.get("brand")),
        category: String(formData.get("category")),
        supplier: String(formData.get("supplier")),
        price: Number(formData.get("price")),
        stock: Number(formData.get("stock")),
        vat: Number(formData.get("vat")),
        ownStock: formData.get("ownStock") === "on",
      },
    });

    redirect("/admin/products");
  }

  return (
    <section className="p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Yeni Ürün Ekle
            </h1>

            <p className="mt-2 text-gray-500">
              Yeni ürün bilgilerini eksiksiz doldurun.
            </p>
          </div>

          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Ürün Listesine Dön
          </Link>
        </div>

        <form
          action={createProduct}
          className="mt-10 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <input
            name="code"
            placeholder="Ürün Kodu"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="barcode"
            placeholder="Barkod"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="name"
            placeholder="Ürün Adı"
            className="rounded-xl border p-4 md:col-span-2"
            required
          />

          <input
            name="brand"
            placeholder="Marka"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="category"
            placeholder="Kategori"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="supplier"
            placeholder="Tedarikçi"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Fiyat"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="stock"
            type="number"
            min="0"
            placeholder="Stok"
            className="rounded-xl border p-4"
            required
          />

          <input
            name="vat"
            type="number"
            min="0"
            placeholder="KDV"
            className="rounded-xl border p-4"
            defaultValue="20"
            required
          />

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              name="ownStock"
              type="checkbox"
            />
            Kendi depomuzda
          </label>

          <button
            type="submit"
            className="rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800 md:col-span-2"
          >
            Ürünü Kaydet
          </button>
        </form>
      </div>
    </section>
  );
}