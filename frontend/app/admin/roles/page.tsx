import Link from "next/link";
import { redirect } from "next/navigation";

import {
  setRoleStatusAction,
  synchronizeAuthorizationCatalogAction,
} from "@/app/admin/roles/actions";
import { SessionService } from "@/modules/auth/services/session.service";
import { RoleService } from "@/modules/roles/services/role.service";

type Props = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminRolesPage({
  searchParams,
}: Props) {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  const [query, pageData] = await Promise.all([
    searchParams,
    RoleService.getRolePageData(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Yetki ve Erişim
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Rol ve Yetki Yönetimi
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              WMS görev rollerini oluşturun, yetkileri
              bağlayın ve kullanıcı atamalarını kontrol edin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <form
              action={
                synchronizeAuthorizationCatalogAction
              }
            >
              <button
                type="submit"
                className="rounded-xl border border-blue-300 bg-white px-5 py-3 font-bold text-blue-700 hover:bg-blue-50"
              >
                Yetki Kataloğunu Eşitle
              </button>
            </form>

            <Link
              href="/admin/roles/new"
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
            >
              + Yeni Rol
            </Link>
          </div>
        </div>

        {query.success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
            {query.success}
          </div>
        )}

        {query.error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
            {query.error}
          </div>
        )}

        {!pageData.catalogIsComplete && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-bold">
              Yetki kataloğu henüz tamamlanmadı.
            </p>
            <p className="mt-1 text-sm">
              Üstteki “Yetki Kataloğunu Eşitle” düğmesine
              bir kez basın. Sistem izinleri ve hazır WMS
              operasyon rolleri güvenli biçimde oluşturulur.
            </p>
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Toplam rol
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {pageData.roles.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">
              Aktif rol
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-950">
              {pageData.activeRoleCount}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-700">
              Aktif yetki
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-950">
              {pageData.permissionCount}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <p className="text-sm font-semibold text-violet-700">
              Rol ataması
            </p>
            <p className="mt-2 text-3xl font-bold text-violet-950">
              {pageData.assignedUserCount}
            </p>
          </div>
        </section>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-4">Rol</th>
                <th className="px-4 py-4">Açıklama</th>
                <th className="px-4 py-4">Durum</th>
                <th className="px-4 py-4">Kullanıcı</th>
                <th className="px-4 py-4">Yetki</th>
                <th className="px-4 py-4">Güncelleme</th>
                <th className="px-5 py-4 text-right">
                  İşlemler
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pageData.roles.map((role) => (
                <tr
                  key={role.id}
                  className="align-top hover:bg-slate-50"
                >
                  <td className="px-5 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">
                        {role.name}
                      </p>

                      {role.isSystemRole && (
                        <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-800">
                          Sistem
                        </span>
                      )}
                    </div>

                    <code className="mt-2 block text-xs font-bold text-blue-700">
                      {role.code}
                    </code>
                  </td>

                  <td className="max-w-md px-4 py-5 text-sm text-slate-600">
                    {role.description ||
                      "Açıklama tanımlanmamış."}
                  </td>

                  <td className="px-4 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                        role.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {role.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>

                  <td className="px-4 py-5">
                    <p className="text-2xl font-bold text-slate-900">
                      {role.userCount}
                    </p>
                    <p className="text-xs text-slate-500">
                      atama
                    </p>
                  </td>

                  <td className="px-4 py-5">
                    <p className="text-2xl font-bold text-slate-900">
                      {role.permissionCount}
                    </p>
                    <p className="text-xs text-slate-500">
                      yetki
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-600">
                    {formatDate(role.updatedAt)}
                  </td>

                  <td className="px-5 py-5">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/roles/${role.id}`}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-800 hover:bg-blue-200"
                      >
                        {role.isSystemRole
                          ? "Görüntüle"
                          : "Düzenle"}
                      </Link>

                      {!role.isSystemRole && (
                        <form
                          action={setRoleStatusAction}
                        >
                          <input
                            type="hidden"
                            name="roleId"
                            value={role.id}
                          />
                          <input
                            type="hidden"
                            name="isActive"
                            value={String(
                              !role.isActive
                            )}
                          />
                          <button
                            type="submit"
                            className={`rounded-lg px-3 py-2 text-sm font-bold ${
                              role.isActive
                                ? "bg-red-100 text-red-800 hover:bg-red-200"
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            }`}
                          >
                            {role.isActive
                              ? "Pasif Yap"
                              : "Aktifleştir"}
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {pageData.roles.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    Henüz rol kaydı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}