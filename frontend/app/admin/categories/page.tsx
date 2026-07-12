import { prisma } from "@/lib/prisma";
import {
  createCategory,
  toggleCategoryStatus,
} from "./actions";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <section className="p-10">
      <div>
        <h1 className="text-4xl font-bold">
          Kategori Yönetimi
        </h1>

        <p className="mt-2 text-gray-500">
          Ürün kategorilerini oluşturun ve yönetin.
        </p>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[380px_1fr]">
        <form
          action={createCategory}
          className="h-fit rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-bold">
            Yeni Kategori
          </h2>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold">
              Kategori Adı
            </span>

            <input
              name="name"
              placeholder="Örneğin: Ofis Kırtasiye"
              className="w-full rounded-xl border p-4"
              required
            />
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800"
          >
            Kategoriyi Kaydet
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">Kategori</th>
                <th className="p-4">Bağlantı Adı</th>
                <th className="p-4">Durum</th>
                <th className="p-4">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className={`border-b ${
                    !category.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="p-4 font-semibold">
                    {category.name}
                  </td>

                  <td className="p-4 text-gray-500">
                    {category.slug}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        category.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {category.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>

                  <td className="p-4">
                    <form
                      action={toggleCategoryStatus.bind(
                        null,
                        category.id,
                        category.isActive
                      )}
                    >
                      <button
                        type="submit"
                        className={`rounded-lg px-4 py-2 font-semibold text-white ${
                          category.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {category.isActive
                          ? "Pasif Yap"
                          : "Aktifleştir"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-10 text-center text-gray-500"
                  >
                    Henüz kategori oluşturulmadı.
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