import Link from "next/link";
import { redirect } from "next/navigation";

import UserCreateForm from "@/components/admin/UserCreateForm";
import { SessionService } from "@/modules/auth/services/session.service";
import { UserCreationService } from "@/modules/users/services/user-creation.service";

export default async function NewUserPage() {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  const roles =
    await UserCreationService.listAssignableRoles();

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Kullanıcı Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Yeni Kullanıcı Oluştur
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Personel kaydını, giriş hesabını, RF erişimini
              ve rolleri tek işlemde oluşturun.
            </p>
          </div>

          <Link
            href="/admin/users"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Kullanıcı Listesine Dön
          </Link>
        </div>

        <div className="mt-8">
          <UserCreateForm roles={roles} />
        </div>
      </div>
    </main>
  );
}