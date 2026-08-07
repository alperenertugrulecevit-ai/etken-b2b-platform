import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import LogoutButton from "@/components/auth/LogoutButton";

import AdminSidebar from "@/components/layout/AdminSidebar";
import WmsContextSelector from "@/components/layout/WmsContextSelector";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile =
    await AuthorizationService.requireAdminPortalAccess();

  const wmsContextData =
    await WmsContextService.getSelectorData(
      profile.id,
      profile.isAdminUser,
    );

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
      "/change-password?returnTo=%2Fadmin",
    );
  }

  const fullName =
    profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

  const roleSummary =
    profile.roleCodes.length > 0
      ? profile.roleCodes.join(", ")
      : profile.isAdminUser
        ? "Sistem Yöneticisi"
        : "Rol atanmamış";

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          {/* MOBİL / TABLET KOMPAKT ÜST ALAN */}
          <div className="lg:hidden">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800">
                  {profile.username
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight text-slate-950">
                    {fullName}
                  </p>

                  <p className="truncate text-[11px] leading-tight text-slate-500">
                    @{profile.username} ·{" "}
                    {roleSummary}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {profile.isAdminUser && (
                    <span className="hidden rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-800 min-[420px]:inline-flex">
                      Yönetici
                    </span>
                  )}

                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                  >
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </summary>

              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Aktif Kullanıcı
                  </p>

                  <p className="text-sm font-bold text-slate-900">
                    {fullName}
                  </p>

                  <p className="text-xs text-slate-500">
                    @{profile.username} ·{" "}
                    {roleSummary}
                  </p>
                </div>

                <div className="mb-3 min-w-0">
                  <WmsContextSelector
                    activeContext={
                      wmsContextData.activeContext
                    }
                    companies={
                      wmsContextData.companies
                    }
                    variant="admin"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {profile.isAdminUser && (
                    <span className="rounded-full bg-violet-100 px-3 py-2 text-[11px] font-bold text-violet-800">
                      Yönetici
                    </span>
                  )}

                  {profile.isRfUser && (
                    <span className="rounded-full bg-cyan-100 px-3 py-2 text-[11px] font-bold text-cyan-800">
                      RF Erişimi
                    </span>
                  )}

                  <Link
                    href="/change-password?returnTo=%2Fadmin"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Şifremi Değiştir
                  </Link>

                  <LogoutButton
                    redirectTo="/login"
                    label="Çıkış Yap"
                  />
                </div>
              </div>
            </details>
          </div>

          {/* MASAÜSTÜ - MEVCUT GÖRÜNÜM */}
          <div className="hidden px-4 py-3 sm:px-5 lg:block lg:px-10">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-800 sm:h-11 sm:w-11 sm:text-base">
                  {profile.username
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
                    Aktif Kullanıcı
                  </p>

                  <p className="truncate text-sm font-bold text-slate-950 sm:text-base">
                    {fullName}
                  </p>

                  <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                    @{profile.username} ·{" "}
                    {roleSummary}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3 xl:items-end">
                <div className="w-full min-w-0 xl:w-auto">
                  <WmsContextSelector
                    activeContext={
                      wmsContextData.activeContext
                    }
                    companies={
                      wmsContextData.companies
                    }
                    variant="admin"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {profile.isAdminUser && (
                    <span className="rounded-full bg-violet-100 px-3 py-2 text-[11px] font-bold text-violet-800 sm:text-xs">
                      Yönetici
                    </span>
                  )}

                  {profile.isRfUser && (
                    <span className="rounded-full bg-cyan-100 px-3 py-2 text-[11px] font-bold text-cyan-800 sm:text-xs">
                      RF Erişimi
                    </span>
                  )}

                  <Link
                    href="/change-password?returnTo=%2Fadmin"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm"
                  >
                    Şifremi Değiştir
                  </Link>

                  <LogoutButton
                    redirectTo="/login"
                    label="Çıkış Yap"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}