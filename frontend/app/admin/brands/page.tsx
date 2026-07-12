import { prisma } from "@/lib/prisma";
import {
  createBrand,
  toggleBrandStatus,
} from "./actions";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <section className="p-10">
      <div>
        <h1 className="text-4xl font-bold">
          Marka Yönetimi
        </h1>

        <p className="mt-2 text-gray-500">
          Ürün markalarını oluşturun ve yönetin.
        </p>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[380px_1fr]">
        <form
          action={createBrand}
          className="h-fit rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-bold">
            Yeni Marka
          </h2>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold">
              Marka Adı
            </span>

            <input
              name="name"
              placeholder="Örneğin: Navigator"
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800"
          >
            Markayı Kaydet
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">Marka</th>
                <th className="p-4">Bağlantı Adı</th>
                <th className="p-4">Durum</th>
                <th className="p-4">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {brands.map((brand) => (
                <tr
                  key={brand.id}
                  className={`border-b hover:bg-slate-50 ${
                    !brand.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="p-4 font-semibold">
                    {brand.name}
                  </td>

                  <td className="p-4 text-gray-500">
                    {brand.slug}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        brand.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {brand.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>

                  <td className="p-4">
                    <form
                      action={toggleBrandStatus.bind(
                        null,
                        brand.id,
                        brand.isActive
                      )}
                    >
                      <button
                        type="submit"
                        className={`rounded-lg px-4 py-2 font-semibold text-white ${
                          brand.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {brand.isActive
                          ? "Pasif Yap"
                          : "Aktifleştir"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {brands.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-10 text-center text-gray-500"
                  >
                    Henüz marka oluşturulmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}