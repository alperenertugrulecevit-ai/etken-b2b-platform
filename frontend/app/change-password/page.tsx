import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

type ChangePasswordPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

function getSafeReturnPath(
  value: string | undefined
): "/admin" | "/rf" {
  if (value === "/rf") {
    return "/rf";
  }

  return "/admin";
}

export default async function ChangePasswordPage({
  searchParams,
}: ChangePasswordPageProps) {
  const currentProfile =
    await AuthorizationService.requireAuthenticated();

  const [
    query,
    user,
  ] = await Promise.all([
    searchParams,

    prisma.user.findUnique({
      where: {
        id: currentProfile.id,
      },

      select: {
        id: true,
        username: true,
        mustChangePassword: true,
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const returnTo =
    getSafeReturnPath(
      query.returnTo
    );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-blue-950 to-slate-900 p-7 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black">
                ET
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                  ETKEN Güvenlik
                </p>

                <h1 className="mt-1 text-2xl font-black">
                  Şifrenizi Değiştirin
                </h1>
              </div>
            </div>

            <p className="mt-5 leading-7 text-slate-300">
              Merhaba{" "}
              <strong className="text-white">
                {user.username}
              </strong>
              . Hesabınızı kullanmaya
              devam etmek için güvenli bir
              şifre belirleyin.
            </p>
          </div>

          <div className="p-6 md:p-8">
            {user.mustChangePassword ? (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                Geçici şifre kullanıyorsunuz.
                Yönetim paneline veya RF
                terminaline geçmeden önce
                şifrenizi değiştirmeniz
                zorunludur.
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900">
                Güvenliğiniz için mevcut
                şifrenizi doğrulayarak yeni
                bir şifre belirleyebilirsiniz.
              </div>
            )}

            <ChangePasswordForm
              returnTo={returnTo}
            />
          </div>
        </div>
      </div>
    </main>
  );
}