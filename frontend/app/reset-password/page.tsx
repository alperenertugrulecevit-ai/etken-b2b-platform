import type {
  Metadata,
} from "next";
import Link from "next/link";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Yeni Şifre Belirle",
  referrer: "no-referrer",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const query =
    await searchParams;
  const token =
    query.token?.trim() ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <Link
            href="/"
            className="text-4xl font-black tracking-wide text-blue-900"
          >
            ETKEN
          </Link>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Hesap Güvenliği
          </p>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Yeni Şifre Belirle
        </h1>

        <p className="mb-7 mt-2 text-sm leading-6 text-slate-500">
          Yeni şifrenizi belirlediğinizde açık oturumlarınız güvenlik
          amacıyla kapatılacaktır.
        </p>

        {token ? (
          <ResetPasswordForm
            token={token}
          />
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
            Şifre sıfırlama bağlantısı eksik veya geçersiz.
          </div>
        )}

        <div className="mt-7 border-t border-slate-200 pt-6 text-center">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-blue-900 hover:underline"
          >
            Yeni bağlantı iste
          </Link>
        </div>
      </section>
    </main>
  );
}
