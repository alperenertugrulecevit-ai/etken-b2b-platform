import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleProductStatus } from "./actions";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return (
    <section className="p-10">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Ürün Yönetimi
          </h1>

          <p className="mt-2 text-gray-500">
            Aktif ve pasif ürünleri görüntüleyin ve yönetin.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
        >
          + Yeni Ürün Ekle
        </Link>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1350px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">Kod</th>
              <th className="p-4">Ürün</th>
              <th className="p-4">Marka</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Tedarikçi</th>
              <th className="p-4">Stok</th>
              <th className="p-4">Fiyat</th>
              <th className="p-4">Stok Kaynağı</th>
              <th className="p-4">Yayın Durumu</th>
              <th className="p-4">İşlemler</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => {
              const stockClass =
                product.stock <= 20
                  ? "bg-red-100 text-red-700"
                  : product.stock <= 100
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700";

              return (
                <tr
                  key={product.id}
                  className={`border-b hover:bg-slate-50 ${
                    !product.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="p-4">
                    {product.code}
                  </td>

                  <td className="p-4 font-medium">
                    {product.name}
                  </td>

                  <td className="p-4">
                    {product.brand}
                  </td>

                  <td className="p-4">
                    {product.category}
                  </td>

                  <td className="p-4">
                    <span className="inline-block rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                      {product.supplier}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${stockClass}`}
                    >
                      {product.stock}
                    </span>
                  </td>

                  <td className="p-4 font-bold text-blue-900">
                    {product.price.toFixed(2)} ₺
                  </td>

                  <td className="p-4">
                    {product.ownStock
                      ? "ETKEN Deposu"
                      : "Tedarikçi Stoğu"}
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/products/${product.code}`}
                        className="rounded-lg bg-slate-100 px-4 py-2 font-semibold hover:bg-slate-200"
                      >
                        Görüntüle
                      </Link>

                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                      >
                        ✏️ Düzenle
                      </Link>

                      <form
                        action={toggleProductStatus.bind(
                          null,
                          product.id,
                          product.isActive
                        )}
                      >
                        <button
                          type="submit"
                          className={`rounded-lg px-4 py-2 font-semibold text-white ${
                            product.isActive
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {product.isActive
                            ? "Pasif Yap"
                            : "Aktifleştir"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="p-10 text-center text-gray-500"
                >
                  Henüz ürün bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}