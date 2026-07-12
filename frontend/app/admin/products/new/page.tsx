import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export default async function NewProductPage() {
  const [categories, brands, suppliers] = await Promise.all([
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

  async function createProduct(formData: FormData) {
    "use server";

    const code = String(formData.get("code") ?? "")
      .trim()
      .toUpperCase();

    const barcode = String(formData.get("barcode") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const supplier = String(formData.get("supplier") ?? "").trim();
    const price = Number(formData.get("price"));
    const stock = Number(formData.get("stock"));
    const vat = Number(formData.get("vat"));
    const ownStock = formData.get("ownStock") === "on";

    await prisma.product.create({
      data: {
        code,
        barcode,
        name,
        brand,
        category,
        supplier,
        price,
        stock,
        vat,
        ownStock,
        isActive: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin");
    revalidatePath("/admin/products");

    redirect("/admin/products");
  }

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

        {categories.length === 0 && (
          <div className="mt-8 rounded-xl bg-orange-100 p-5 text-orange-800">
            Aktif kategori bulunamadı. Önce{" "}
            <Link
              href="/admin/categories"
              className="font-bold underline"
            >
              Kategori Yönetimi
            </Link>{" "}
            ekranından kategori oluşturun.
          </div>
        )}

        {brands.length === 0 && (
          <div className="mt-4 rounded-xl bg-orange-100 p-5 text-orange-800">
            Aktif marka bulunamadı. Önce{" "}
            <Link
              href="/admin/brands"
              className="font-bold underline"
            >
              Marka Yönetimi
            </Link>{" "}
            ekranından marka oluşturun.
          </div>
        )}

        {suppliers.length === 0 && (
          <div className="mt-4 rounded-xl bg-orange-100 p-5 text-orange-800">
            Aktif tedarikçi bulunamadı. Önce{" "}
            <Link
              href="/admin/suppliers"
              className="font-bold underline"
            >
              Tedarikçi Yönetimi
            </Link>{" "}
            ekranından tedarikçi oluşturun.
          </div>
        )}

        <form
          action={createProduct}
          className="mt-10 grid grid-cols-1 gap-5 rounded-2xl bg-white p-8 shadow md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold">
              Ürün Kodu
            </span>

            <input
              name="code"
              placeholder="Örneğin: ETK000006"
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
              placeholder="Barkod"
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
              placeholder="Ürün Adı"
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
              defaultValue=""
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              <option value="" disabled>
                Marka seçiniz
              </option>

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
              defaultValue=""
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              <option value="" disabled>
                Kategori seçiniz
              </option>

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
              defaultValue=""
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              <option value="" disabled>
                Tedarikçi seçiniz
              </option>

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
              placeholder="Fiyat"
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
              placeholder="Stok"
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
              defaultValue="20"
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
            Ürünü Kaydet
          </button>
        </form>
      </div>
    </section>
  );
}