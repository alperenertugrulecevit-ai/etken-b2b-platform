import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import UserPasswordResetForm from "@/components/admin/UserPasswordResetForm";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type UserPasswordPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getStatusLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    ACTIVE: "Aktif",
    PASSIVE: "Pasif",
    LOCKED: "Kilitli",
    SUSPENDED: "Askıya Alındı",
  };

  return labels[status] ?? status;
}

export default async function UserPasswordPage({
  params,
}: UserPasswordPageProps) {
  await AuthorizationService.requirePermission(
    "USER_MANAGE"
  );

  const {
    id,
  } = await params;

  const userId = id.trim();

  if (!userId) {
    notFound();
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        username: true,
        status: true,
        mustChangePassword: true,
      },
    });

  if (!user) {
    notFound();
  }

  return (
    <section className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">
              Güvenlik İşlemi
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Kullanıcı Şifresini Sıfırla
            </h1>

            <p className="mt-2 text-slate-600">
              {user.username} kullanıcısı
              için yeni bir geçici şifre
              belirleyin.
            </p>
          </div>

          <Link
            href={`/admin/users/${user.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Kullanıcıya Dön
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kullanıcı Adı
            </p>

            <p className="mt-2 font-black text-slate-900">
              {user.username}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kullanıcı Durumu
            </p>

            <p className="mt-2 font-black text-slate-900">
              {getStatusLabel(
                user.status
              )}
            </p>
          </div>
        </div>

        {user.mustChangePassword && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            Bu kullanıcı bir sonraki
            girişinde şifresini değiştirmek
            zorunda.
          </div>
        )}

        <div className="mt-6">
          <UserPasswordResetForm
            userId={user.id}
            username={user.username}
          />
        </div>
      </div>
    </section>
  );
}