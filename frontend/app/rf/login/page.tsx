import Link from "next/link";
import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { SessionService } from "@/modules/auth/services/session.service";

export const metadata = {
  title: "RF Giriş | ETKEN WMS",
  description:
    "ETKEN WMS RF terminal kullanıcı girişi",
};

export default async function RfLoginPage() {
  const currentUser =
    await SessionService.getCurrentUser();

  if (currentUser) {
    redirect(
      currentUser.isRfUser
        ? "/rf"
        : "/admin"
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="text-4xl font-black tracking-wide text-white">
            ETKEN
          </div>

          <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-blue-300">
            RF Terminal
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              RF Kullanıcı Girişi
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Depo operasyonuna başlamak için
              kullanıcı bilgilerinizle giriş yapın.
            </p>
          </div>

          <LoginForm isRfLogin />

          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-900 hover:underline"
            >
              Yönetim paneli girişi
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}