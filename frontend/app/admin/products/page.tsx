import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { toggleProductStatus } from "./actions";

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStockClass(availableStock: number) {
  if (availableStock <= 0) {
    return "bg-red-100 text-red-700";
  }

  if (availableStock <= 20) {
    return "bg-orange-100 text-orange-700";
  }

  if (availableStock <= 100) {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-green-100 text-green-700";
}

function getStockLabel(availableStock: number) {
  if (availableStock <= 0) {
    return "Stok Yok";
  }

  if (availableStock <= 20) {
    return "Kritik";
  }

  if (availableStock <= 100) {
    return "Düşük";
  }

  return "Yeterli";
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: {
      id: "asc",
    },
  });

  const totalPhysicalStock = products.reduce(
    (total, product) => total + product.stock,
    0
  );

  const totalReservedStock = products.reduce(
    (total, product) => total + product.reservedStock,
    0
  );

  const totalAvailableStock =
    totalPhysicalStock - totalReservedStock;

  const criticalProductCount = products.filter((product) => {
    const availableStock =
      product.stock - product.reservedStock;

    return availableStock <= 20;
  }).length;

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Ürün ve Stok Yönetimi
          </h1>

          <p className="mt-2 text-gray-500">
            Ürünleri, fiziksel stokları ve sipariş
            rezervasyonlarını yönetin.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
        >
          + Yeni Ürün Ekle
        </Link>
      </div>

      {/* STOK ÖZET KARTLARI */}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Fiziksel Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {totalPhysicalStock.toLocaleString("tr-TR")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Depo ve tedarikçi stok toplamı
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Rezerve Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-600">
            {totalReservedStock.toLocaleString("tr-TR")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Onaylanan siparişlere ayrılan miktar
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kullanılabilir Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {totalAvailableStock.toLocaleString("tr-TR")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Fiziksel stok eksi rezervasyon
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kritik Ürün
          </p>

          <p className="mt-3 text-4xl font-bold text-red-600">
            {criticalProductCount.toLocaleString("tr-TR")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Kullanılabilir stoğu 20 veya altında
          </p>
        </article>
      </div>

      {/* ÜRÜN TABLOSU */}

      <div className="mt-10 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1700px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Kod
              </th>

              <th className="p-4">
                Ürün
              </th>

              <th className="p-4">
                Marka
              </th>

              <th className="p-4">
                Kategori
              </th>

              <th className="p-4">
                Tedarikçi
              </th>

              <th className="p-4">
                Fiziksel Stok
              </th>

              <th className="p-4">
                Rezerve
              </th>

              <th className="p-4">
                Kullanılabilir
              </th>

              <th className="p-4">
                Stok Durumu
              </th>

              <th className="p-4">
                Fiyat
              </th>

              <th className="p-4">
                Stok Kaynağı
              </th>

              <th className="p-4">
                Yayın Durumu
              </th>

              <th className="p-4">
                İşlemler
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => {
              const availableStock =
                product.stock - product.reservedStock;

              return (
                <tr
                  key={product.id}
                  className={`border-b hover:bg-slate-50 ${
                    !product.isActive
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <td className="whitespace-nowrap p-4 font-semibold text-blue-900">
                    {product.code}
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {product.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Barkod: {product.barcode}
                    </p>
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
                    <span className="inline-block min-w-20 rounded-full bg-blue-100 px-3 py-1 text-center font-semibold text-blue-700">
                      {product.stock.toLocaleString("tr-TR")}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block min-w-20 rounded-full px-3 py-1 text-center font-semibold ${
                        product.reservedStock > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {product.reservedStock.toLocaleString(
                        "tr-TR"
                      )}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block min-w-20 rounded-full px-3 py-1 text-center font-bold ${getStockClass(
                        availableStock
                      )}`}
                    >
                      {availableStock.toLocaleString("tr-TR")}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getStockClass(
                        availableStock
                      )}`}
                    >
                      {getStockLabel(availableStock)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap p-4 font-bold text-blue-900">
                    {formatCurrency(product.price)} ₺
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
                      {product.isActive
                        ? "Aktif"
                        : "Pasif"}
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
                  colSpan={13}
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