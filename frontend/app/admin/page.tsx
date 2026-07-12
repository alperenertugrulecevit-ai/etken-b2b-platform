import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const productCount = await prisma.product.count();

  return (
    <section className="p-10">
      <h1 className="text-4xl font-bold">
        Yönetim Paneli
      </h1>

      <p className="text-gray-500 mt-2">
        ETKEN B2B Platform yönetim merkezi
      </p>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-10">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">
            Toplam Ürün
          </p>

          <h2 className="text-4xl font-bold text-blue-900 mt-3">
            {productCount}
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">
            Bugünkü Sipariş
          </p>

          <h2 className="text-4xl font-bold text-blue-900 mt-3">
            0
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">
            Bekleyen Sevkiyat
          </p>

          <h2 className="text-4xl font-bold text-blue-900 mt-3">
            0
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">
            Aylık Ciro
          </p>

          <h2 className="text-4xl font-bold text-blue-900 mt-3">
            0 ₺
          </h2>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-10">
        <Link
          href="/admin/products"
          className="bg-blue-900 text-white rounded-2xl p-8 font-bold text-xl hover:bg-blue-800"
        >
          📦 Ürün Yönetimi
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow">
          <h2 className="font-bold text-xl">
            🛒 Sipariş Yönetimi
          </h2>

          <p className="text-gray-500 mt-3">
            Henüz sipariş bulunmuyor.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow">
          <h2 className="font-bold text-xl">
            👥 Müşteri Yönetimi
          </h2>

          <p className="text-gray-500 mt-3">
            Müşteri modülü hazırlanıyor.
          </p>
        </div>
      </div>
    </section>
  );
}