import Link from "next/link";

import LogoutButton from "@/components/auth/LogoutButton";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props = {
  children: React.ReactNode;
};

export default async function RFLayout({
  children,
}: Props) {
  const profile =
    await AuthorizationService.getCurrentProfile();

  const fullName = profile?.employee
    ? `${profile.employee.firstName} ${profile.employee.lastName}`
    : profile?.username ?? "";

  const canOpenAdmin = profile
    ? AuthorizationService.hasPermission(
        profile,
        "ADMIN_PORTAL_ACCESS"
      )
    : false;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-900 text-white shadow">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/rf"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-black">
              RF
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-bold">
                ETKEN RF Terminal
              </p>

              <p className="truncate text-xs text-slate-400">
                Depo Operasyon Merkezi
              </p>
            </div>
          </Link>

          {profile ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-bold text-white">
                  {fullName}
                </p>

                <p className="truncate text-xs text-slate-400">
                  @{profile.username}
                  {profile.employee?.employeeCode
                    ? ` · ${profile.employee.employeeCode}`
                    : ""}
                </p>
              </div>

              {canOpenAdmin && (
                <Link
                  href="/admin"
                  className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                >
                  Admin
                </Link>
              )}

              <LogoutButton
                redirectTo="/rf/login"
                label="Çıkış"
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-600"
              />
            </div>
          ) : (
            <Link
              href="/rf/login"
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
            >
              RF Giriş
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}