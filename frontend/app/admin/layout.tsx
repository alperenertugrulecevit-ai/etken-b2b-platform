import {
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import LogoutButton from "@/components/auth/LogoutButton";

import AdminSidebar from "@/components/layout/AdminSidebar";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile =
    await AuthorizationService.requireAdminPortalAccess();

  const userAccount =
    await prisma.user.findUnique({
      where: {
        id: profile.id,
      },

      select: {
        id: true,
        mustChangePassword: true,
      },
    });

  if (!userAccount) {
    redirect("/login");
  }

  if (
    userAccount.mustChangePassword
  ) {
    redirect(
      "/change-password?returnTo=%2Fadmin"
    );
  }

  const fullName =
    profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

  const roleSummary =
    profile.roleCodes.length > 0
      ? profile.roleCodes.join(
          ", "
        )
      : profile.isAdminUser
        ? "Sistem Yöneticisi"
        : "Rol atanmamış";

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-6 py-3 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">
                {profile.username
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Aktif Kullanıcı
                </p>

                <p className="truncate font-bold text-slate-950">
                  {fullName}
                </p>

                <p className="truncate text-xs text-slate-500">
                  @{profile.username} ·{" "}
                  {roleSummary}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {profile.isAdminUser && (
                <span className="rounded-full bg-violet-100 px-3 py-2 text-xs font-bold text-violet-800">
                  Yönetici
                </span>
              )}

              {profile.isRfUser && (
                <span className="rounded-full bg-cyan-100 px-3 py-2 text-xs font-bold text-cyan-800">
                  RF Erişimi
                </span>
              )}

              <LogoutButton
                redirectTo="/login"
                label="Çıkış Yap"
              />
            </div>
          </div>
        </header>

        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}