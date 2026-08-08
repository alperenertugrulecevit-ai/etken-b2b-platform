import {
  prisma,
} from "@/lib/prisma";

import {
  createMainCategory,
  createSubCategory,
  toggleCategoryStatus,
} from "./actions";

export default async function AdminCategoriesPage() {
  const mainCategories =
    await prisma.category.findMany({
      where: {
        parentId:
          null,
      },

      orderBy: {
        name:
          "asc",
      },

      include: {
        children: {
          orderBy: {
            name:
              "asc",
          },

          include: {
            _count: {
              select: {
                products:
                  true,
              },
            },
          },
        },

        _count: {
          select: {
            children:
              true,

            products:
              true,
          },
        },
      },
    });

  const totalSubCategories =
    mainCategories.reduce(
      (
        total,
        category,
      ) =>
        total +
        category
          .children
          .length,
      0,
    );

  const totalProducts =
    mainCategories.reduce(
      (
        total,
        category,
      ) =>
        total +
        category.children.reduce(
          (
            childTotal,
            child,
          ) =>
            childTotal +
            child._count
              .products,
          0,
        ),
      0,
    );

  return (
    <section className="p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
          Kategori Yönetimi
        </h1>

        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Ana kategori ve alt
          kategori yapısını
          yönetin.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm font-semibold text-slate-500">
            Ana Kategori
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {
              mainCategories.length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm font-semibold text-slate-500">
            Alt Kategori
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {
              totalSubCategories
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm font-semibold text-slate-500">
            Kategorilere Bağlı
            Ürün
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {
              totalProducts
            }
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form
          action={
            createMainCategory
          }
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-black text-slate-900">
            Yeni Ana Kategori
          </h2>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">
              Ana Kategori Adı
            </span>

            <input
              name="name"
              placeholder="Örneğin: Teknoloji ve Hırdavat"
              className="w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-blue-700"
              required
            />
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800"
          >
            Ana Kategoriyi
            Kaydet
          </button>
        </form>

        <form
          action={
            createSubCategory
          }
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-black text-slate-900">
            Yeni Alt Kategori
          </h2>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">
              Ana Kategori
            </span>

            <select
              name="parentId"
              className="w-full rounded-xl border border-slate-300 bg-white p-4"
              required
              defaultValue=""
            >
              <option
                value=""
                disabled
              >
                Ana kategori
                seçin
              </option>

              {mainCategories.map(
                (
                  category,
                ) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">
              Alt Kategori Adı
            </span>

            <input
              name="name"
              placeholder="Örneğin: USB Bellek"
              className="w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-blue-700"
              required
            />
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-slate-900 py-4 font-bold text-white hover:bg-slate-800"
          >
            Alt Kategoriyi
            Kaydet
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-5">
        {mainCategories.map(
          (
            mainCategory,
          ) => (
            <div
              key={
                mainCategory.id
              }
              className="overflow-hidden rounded-2xl bg-white shadow"
            >
              <div className="flex flex-col gap-4 bg-blue-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black">
                      {
                        mainCategory.name
                      }
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        mainCategory.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {mainCategory.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-blue-100">
                    {
                      mainCategory
                        .children
                        .length
                    }{" "}
                    alt kategori
                  </p>
                </div>

                <form
                  action={toggleCategoryStatus.bind(
                    null,
                    mainCategory.id,
                    mainCategory.isActive,
                  )}
                >
                  <button
                    type="submit"
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${
                      mainCategory.isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {mainCategory.isActive
                      ? "Ana Kategoriyi Pasif Yap"
                      : "Ana Kategoriyi Aktifleştir"}
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-100 text-sm text-slate-600">
                    <tr>
                      <th className="p-4">
                        Alt Kategori
                      </th>

                      <th className="p-4">
                        Slug
                      </th>

                      <th className="p-4 text-center">
                        Ürün
                      </th>

                      <th className="p-4">
                        Durum
                      </th>

                      <th className="p-4">
                        İşlem
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {mainCategory.children.map(
                      (
                        child,
                      ) => (
                        <tr
                          key={
                            child.id
                          }
                          className={`border-t border-slate-100 ${
                            !child.isActive
                              ? "opacity-60"
                              : ""
                          }`}
                        >
                          <td className="p-4 font-semibold text-slate-900">
                            {
                              child.name
                            }
                          </td>

                          <td className="p-4 text-sm text-slate-500">
                            {
                              child.slug
                            }
                          </td>

                          <td className="p-4 text-center font-bold">
                            {
                              child
                                ._count
                                .products
                            }
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                child.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {child.isActive
                                ? "Aktif"
                                : "Pasif"}
                            </span>
                          </td>

                          <td className="p-4">
                            <form
                              action={toggleCategoryStatus.bind(
                                null,
                                child.id,
                                child.isActive,
                              )}
                            >
                              <button
                                type="submit"
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                                  child.isActive
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-green-600 hover:bg-green-700"
                                }`}
                              >
                                {child.isActive
                                  ? "Pasif Yap"
                                  : "Aktifleştir"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ),
                    )}

                    {mainCategory
                      .children
                      .length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={
                            5
                          }
                          className="p-8 text-center text-slate-500"
                        >
                          Bu ana kategori
                          altında henüz alt
                          kategori yok.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        )}

        {mainCategories.length ===
        0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow">
            Henüz ana kategori
            oluşturulmadı.
          </div>
        ) : null}
      </div>
    </section>
  );
}