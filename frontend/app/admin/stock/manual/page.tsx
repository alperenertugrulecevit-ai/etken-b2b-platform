import Link from "next/link";

import { prisma } from "@/lib/prisma";
import ManualStockForm from "@/components/admin/ManualStockForm";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

export default async function ManualStockPage() {
  const products =
    await prisma.product.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          name: "asc",
        },
        {
          code: "asc",
        },
      ],

      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        reservedStock: true,
      },
    });

  const totalPhysicalStock =
    products.reduce(
      (total, product) =>
        total + product.stock,
      0
    );

  const totalReservedStock =
    products.reduce(
      (total, product) =>
        total +
        product.reservedStock,
      0
    );

  const totalAvailableStock =
    totalPhysicalStock -
    totalReservedStock;

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Manuel Stok İşlemi
          </h1>

          <p className="mt-2 text-gray-500">
            Mal kabul, manuel giriş/çıkış,
            sayım farkı ve satış iadesi
            işlemlerini kaydedin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/products"
            className="rounded-xl border border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
          >
            Ürün ve Stok Yönetimi
          </Link>

          <Link
            href="/admin"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Fiziksel Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {formatNumber(
              totalPhysicalStock
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Rezerve Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-600">
            {formatNumber(
              totalReservedStock
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Kullanılabilir Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            {formatNumber(
              totalAvailableStock
            )}
          </p>
        </article>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[620px_1fr]">
        <ManualStockForm
          products={products}
        />

        <div className="space-y-6">
          <article className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">
              İşlem Kuralları
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-green-50 p-5">
                <p className="font-bold text-green-700">
                  Stok Girişleri
                </p>

                <p className="mt-2 text-sm leading-6 text-green-900">
                  Mal kabul, manuel giriş,
                  sayım fazlası, satış iadesi
                  ve açılış stoğu fiziksel
                  stoğu artırır.
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-5">
                <p className="font-bold text-red-700">
                  Stok Çıkışları
                </p>

                <p className="mt-2 text-sm leading-6 text-red-900">
                  Manuel çıkış ve sayım eksiği
                  fiziksel stoğu azaltır.
                  Kullanılabilir stoktan fazla
                  çıkış yapılamaz.
                </p>
              </div>

              <div className="rounded-xl bg-orange-50 p-5">
                <p className="font-bold text-orange-700">
                  Rezerve Stok Koruması
                </p>

                <p className="mt-2 text-sm leading-6 text-orange-900">
                  Onaylı siparişlere ayrılmış
                  miktarlar manuel çıkış ile
                  tüketilemez.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">
              Sonraki Adım
            </h2>

            <p className="mt-4 leading-7 text-gray-600">
              Bir sonraki sprintte tüm ürünlerin
              stok hareketlerini tek ekranda
              tarih, ürün, belge ve hareket tipine
              göre filtreleyebileceğimiz Stok
              Hareketleri Raporu oluşturacağız.
            </p>
          </article>
        </div>
      </div>

      {products.length === 0 && (
        <div className="mt-8 rounded-xl bg-orange-100 p-5 text-orange-800">
          Aktif ürün bulunmadığı için manuel
          stok işlemi yapılamıyor.
        </div>
      )}
    </section>
  );
}