import Link from "next/link";
import { redirect } from "next/navigation";

import RoleForm from "@/components/admin/RoleForm";
import { SessionService } from "@/modules/auth/services/session.service";
import { RoleService } from "@/modules/roles/services/role.service";

export default async function NewRolePage() {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  const { permissionGroups } =
    await RoleService.getRoleEditorData();

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Rol ve Yetki Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Yeni Rol Oluştur
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Görev rolünü tanımlayın ve ihtiyaç duyduğu
              WMS yetkilerini seçin.
            </p>
          </div>

          <Link
            href="/admin/roles"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Rol Listesine Dön
          </Link>
        </div>

        <div className="mt-8">
          <RoleForm
            mode="create"
            permissionGroups={permissionGroups}
            initialValues={{
              code: "",
              name: "",
              description: "",
              permissionIds: [],
            }}
          />
        </div>
      </div>
    </main>
  );
}