import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId)) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    notFound();
  }

  async function updateProduct(formData: FormData) {
    "use server";

    await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        code: String(formData.get("code")).trim(),
        barcode: String(formData.get("barcode")).trim(),
        name: String(formData.get("name")).trim(),
        brand: String(formData.get("brand")).trim(),
        category: String(formData.get("category")).trim(),
        supplier: String(formData.get("supplier")).trim(),
        price: Number(formData.get("price")),
        stock: Number(formData.get("stock")),
        vat: Number(formData.get("vat")),
        ownStock: formData.get("ownStock") === "on",
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${product.code}`);
    revalidatePath("/admin");
    revalidatePath("/admin/products");

    redirect("/admin/products");
  }

  return (
    <section className="p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              Ürün Düzenle
            </h1>

            <p className="mt-2 text-gray-500">
              {product.code} kodlu ürünün bilgilerini güncelleyin.
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
          action={updateProduct}
          className="mt-10 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Ürün Kodu
            </span>

            <input
              name="code"
              defaultValue={product.code}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Barkod
            </span>

            <input
              name="barcode"
              defaultValue={product.barcode}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Ürün Adı
            </span>

            <input
              name="name"
              defaultValue={product.name}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Marka
            </span>

            <input
              name="brand"
              defaultValue={product.brand}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Kategori
            </span>

            <input
              name="category"
              defaultValue={product.category}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Tedarikçi
            </span>

            <input
              name="supplier"
              defaultValue={product.supplier}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Satış Fiyatı
            </span>

            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.price}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Stok
            </span>

            <input
              name="stock"
              type="number"
              min="0"
              defaultValue={product.stock}
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              KDV Oranı
            </span>

            <select
              name="vat"
              defaultValue={product.vat}
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              <option value="1">%1</option>
              <option value="10">%10</option>
              <option value="20">%20</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              name="ownStock"
              type="checkbox"
              defaultChecked={product.ownStock}
            />

            Kendi depomuzda
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