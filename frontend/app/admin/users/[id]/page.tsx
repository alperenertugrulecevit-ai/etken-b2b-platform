import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import UserEditForm from "@/components/admin/UserEditForm";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import { UserUpdateService } from "@/modules/users/services/user-update.service";

import {
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
} from "@/modules/users/types/user.types";

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    success?: string;
  }>;
};

export default async function EditUserPage({
  params,
  searchParams,
}: Props) {
  await AuthorizationService.requirePermission(
    "USER_MANAGE"
  );

  const [
    {
      id,
    },
    query,
  ] = await Promise.all([
    params,
    searchParams,
  ]);

  const {
    user,
    roles,
  } =
    await UserUpdateService.getEditPageData(
      id
    );

  if (!user) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Kullanıcı Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Kullanıcıyı Düzenle
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                {user.username}
              </code>

              <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold text-slate-700">
                {
                  USER_TYPE_LABELS[
                    user.userType
                  ]
                }
              </span>

              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  user.status ===
                  "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {
                  USER_STATUS_LABELS[
                    user.status
                  ]
                }
              </span>

              {user.isAdminUser && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">
                  Yönetici
                </span>
              )}

              {user.isRfUser && (
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-800">
                  RF Erişimi
                </span>
              )}
            </div>

            <p className="mt-3 max-w-3xl text-slate-600">
              Hesap, personel ve rol
              bilgilerini tek ekrandan
              güncelleyin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/users/${user.id}/sessions`}
              className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 font-bold text-blue-800 transition hover:bg-blue-100"
            >
              Oturumları Yönet
            </Link>

            <Link
              href={`/admin/users/${user.id}/password`}
              className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 font-bold text-red-700 transition hover:bg-red-100"
            >
              Şifreyi Sıfırla
            </Link>

            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Kullanıcı Listesine Dön
            </Link>
          </div>
        </div>

        {query.success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
            {query.success}
          </div>
        )}

        <div className="mt-8">
          <UserEditForm
            user={user}
            roles={roles}
          />
        </div>
      </div>
    </main>
  );
}