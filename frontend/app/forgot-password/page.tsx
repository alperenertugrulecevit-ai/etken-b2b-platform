import type {
  Metadata,
} from "next";
import Link from "next/link";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description:
    "Etken kurumsal müşteri hesabı şifre sıfırlama talebi.",
};

export default function ForgotPasswordPage() {
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
            Kurumsal Müşteri Portalı
          </p>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Şifremi Unuttum
        </h1>

        <p className="mb-7 mt-2 text-sm leading-6 text-slate-500">
          Kullanıcı adınızı veya hesabınıza kayıtlı e-posta adresini
          girin. Güvenlik nedeniyle hesabın sistemde bulunup
          bulunmadığı açıklanmaz.
        </p>

        <ForgotPasswordForm />

        <div className="mt-7 border-t border-slate-200 pt-6 text-center">
          <Link
            href="/customer-login"
            className="text-sm font-semibold text-blue-900 hover:underline"
          >
            Kurumsal girişe dön
          </Link>
        </div>
      </section>
    </main>
  );
}
