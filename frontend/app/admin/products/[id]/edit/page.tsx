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

  const [product, categories, brands, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: {
        id: productId,
      },
    }),

    prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.brand.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.supplier.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  async function updateProduct(formData: FormData) {
    "use server";

    const oldCode = product!.code;

    const newCode = String(formData.get("code") ?? "")
      .trim()
      .toUpperCase();

    await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        code: newCode,
        barcode: String(formData.get("barcode") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        brand: String(formData.get("brand") ?? "").trim(),
        category: String(formData.get("category") ?? "").trim(),
        supplier: String(formData.get("supplier") ?? "").trim(),
        price: Number(formData.get("price")),
        stock: Number(formData.get("stock")),
        vat: Number(formData.get("vat")),
        ownStock: formData.get("ownStock") === "on",
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${oldCode}`);
    revalidatePath(`/products/${newCode}`);
    revalidatePath("/admin");
    revalidatePath("/admin/products");

    redirect("/admin/products");
  }

  const currentCategoryExists = categories.some(
    (category) => category.name === product.category
  );

  const currentBrandExists = brands.some(
    (brand) => brand.name === product.brand
  );

  const currentSupplierExists = suppliers.some(
    (supplier) => supplier.name === product.supplier
  );

  const formReady =
    categories.length > 0 &&
    brands.length > 0 &&
    suppliers.length > 0;

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

        {!currentBrandExists && (
          <div className="mt-8 rounded-xl bg-orange-100 p-5 text-orange-800">
            Bu ürünün mevcut markası aktif marka listesinde bulunmuyor:
            <strong> {product.brand}</strong>. Yeni bir aktif marka seçerek
            ürünü güncelleyin.
          </div>
        )}

        {!currentCategoryExists && (
          <div className="mt-4 rounded-xl bg-orange-100 p-5 text-orange-800">
            Bu ürünün mevcut kategorisi aktif kategori listesinde bulunmuyor:
            <strong> {product.category}</strong>. Yeni bir aktif kategori
            seçerek ürünü güncelleyin.
          </div>
        )}

        {!currentSupplierExists && (
          <div className="mt-4 rounded-xl bg-orange-100 p-5 text-orange-800">
            Bu ürünün mevcut tedarikçisi aktif tedarikçi listesinde bulunmuyor:
            <strong> {product.supplier}</strong>. Yeni bir aktif tedarikçi
            seçerek ürünü güncelleyin.
          </div>
        )}

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
              className="w-full rounded-xl border p-4 uppercase"
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

            <select
              name="brand"
              defaultValue={
                currentBrandExists ? product.brand : ""
              }
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              {!currentBrandExists && (
                <option value="" disabled>
                  Yeni marka seçiniz
                </option>
              )}

              {brands.map((brand) => (
                <option
                  key={brand.id}
                  value={brand.name}
                >
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Kategori
            </span>

            <select
              name="category"
              defaultValue={
                currentCategoryExists ? product.category : ""
              }
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              {!currentCategoryExists && (
                <option value="" disabled>
                  Yeni kategori seçiniz
                </option>
              )}

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.name}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Tedarikçi
            </span>

            <select
              name="supplier"
              defaultValue={
                currentSupplierExists ? product.supplier : ""
              }
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              {!currentSupplierExists && (
                <option value="" disabled>
                  Yeni tedarikçi seçiniz
                </option>
              )}

              {suppliers.map((supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.name}
                >
                  {supplier.name}
                </option>
              ))}
            </select>
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
              defaultValue={String(product.vat)}
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
            disabled={!formReady}
            className={`rounded-xl py-4 font-bold md:col-span-2 ${
              formReady
                ? "bg-blue-900 text-white hover:bg-blue-800"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Değişiklikleri Kaydet
          </button>
        </form>
      </div>
    </section>
  );
}