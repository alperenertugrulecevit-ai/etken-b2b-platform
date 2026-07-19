import Link from "next/link";
import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { SessionService } from "@/modules/auth/services/session.service";

export const metadata = {
  title: "Giriş Yap | ETKEN WMS",
  description:
    "ETKEN WMS yönetim paneli kullanıcı girişi",
};

export default async function LoginPage() {
  const currentUser =
    await SessionService.getCurrentUser();

  if (currentUser) {
    redirect(
      currentUser.isRfUser &&
        !currentUser.isAdminUser
        ? "/rf"
        : "/admin"
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-4xl font-black tracking-wide text-blue-900"
          >
            ETKEN
          </Link>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Depo Yönetim Sistemi
          </p>
        </div>

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">
              Yönetim Paneli Girişi
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Yönetim paneline erişmek için
              kullanıcı adı ve şifrenizi girin.
            </p>
          </div>

          <LoginForm />

          <div className="mt-7 border-t border-slate-200 pt-6 text-center">
            <Link
              href="/rf/login"
              className="text-sm font-semibold text-blue-900 hover:underline"
            >
              RF terminal kullanıcısı mısınız?
            </Link>
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-blue-900"
          >
            ← ETKEN ana sayfasına dön
          </Link>
        </div>
      </div>
    </main>
  );
}