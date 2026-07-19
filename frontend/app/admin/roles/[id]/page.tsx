import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import RoleForm from "@/components/admin/RoleForm";
import { SessionService } from "@/modules/auth/services/session.service";
import { RoleService } from "@/modules/roles/services/role.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string;
  }>;
};

export default async function RoleDetailPage({
  params,
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

  const [{ id }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const { permissionGroups, role } =
    await RoleService.getRoleEditorData(id);

  if (!role) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Rol ve Yetki Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {role.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                {role.code}
              </code>

              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  role.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {role.isActive ? "Aktif" : "Pasif"}
              </span>

              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">
                {role.userCount} kullanıcı
              </span>
            </div>
          </div>

          <Link
            href="/admin/roles"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Rol Listesine Dön
          </Link>
        </div>

        {query.success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
            {query.success}
          </div>
        )}

        {role.isSystemRole ? (
          <section className="mt-8 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm lg:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">
              Korumalı Sistem Rolü
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Bu rol düzenlemeye kapalıdır
            </h2>

            <p className="mt-3 max-w-3xl text-slate-600">
              Sistem yöneticisi rolünün kodu, durumu ve
              yetkileri güvenlik amacıyla bu ekrandan
              değiştirilemez. Yetki kataloğu eşitlendiğinde
              aktif sistem izinleri bu role otomatik bağlanır.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">
                  Bağlı kullanıcı
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {role.userCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">
                  Bağlı yetki
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {role.permissionIds.length}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <div className="mt-8">
            <RoleForm
              mode="edit"
              roleId={role.id}
              permissionGroups={permissionGroups}
              initialValues={{
                code: role.code,
                name: role.name,
                description:
                  role.description ?? "",
                permissionIds:
                  role.permissionIds,
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}