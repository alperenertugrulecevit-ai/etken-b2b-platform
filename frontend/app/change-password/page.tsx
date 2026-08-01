import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import Header from "@/components/layout/Header";

type ChangePasswordPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

function getSafeReturnPath(
  value: string | undefined
): "/admin" | "/rf" | "/account" {
  if (
    value === "/rf" ||
    value === "/account"
  ) {
    return value;
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
    <>
      {returnTo === "/account" ? <Header /> : null}

      <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-blue-950 to-slate-900 p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EF4B23] text-xl font-black">
                ET
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-orange-200">
                  ETKEN Güvenlik
                </p>

                <h1 className="mt-1 text-xl font-black">
                  Şifrenizi Değiştirin
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              Merhaba{" "}
              <strong className="text-white">
                {user.username}
              </strong>
              . Hesabınızı kullanmaya
              devam etmek için güvenli bir
              şifre belirleyin.
            </p>
          </div>

          <div className="p-5 md:p-6">
            {user.mustChangePassword ? (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                Geçici şifre kullanıyorsunuz.
                Hesabınızı kullanmaya devam
                etmeden önce geçici şifrenizi
                değiştirmeniz zorunludur.
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold leading-6 text-orange-900">
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
    </>
  );
}