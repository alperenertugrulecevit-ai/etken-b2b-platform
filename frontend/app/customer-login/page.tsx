import Link from "next/link";
import {
  redirect,
} from "next/navigation";
import {
  UserType,
} from "@prisma/client";

import CustomerLoginForm from "@/components/auth/CustomerLoginForm";
import {
  SessionService,
} from "@/modules/auth/services/session.service";

export const metadata = {
  title:
    "Müşteri Girişi | ETKEN Ofis",
  description:
    "ETKEN Ofis bireysel ve kurumsal müşteri hesabı girişi",
};

type CustomerLoginPageProps = {
  searchParams: Promise<{
    passwordChanged?: string;
    passwordReset?: string;
  }>;
};

export default async function CustomerLoginPage({
  searchParams,
}: CustomerLoginPageProps) {
  const [
    user,
    query,
  ] = await Promise.all([
    SessionService.getCurrentUser(),
    searchParams,
  ]);

if (
  user?.userType ===
    UserType.CUSTOMER &&
  user.customer?.isActive
) {
  redirect("/");
}

  const successMessage =
    query.passwordReset ===
    "true"
      ? "Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz."
      : query.passwordChanged ===
          "true"
        ? "Şifreniz değiştirildi. Yeni şifrenizle yeniden giriş yapın."
        : "";

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
            Müşteri Hesabı
          </p>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Giriş Yap
        </h1>

        <p className="mb-7 mt-2 text-sm leading-6 text-slate-500">
          Fiyatlarınızı görmek, sepetinizi yönetmek ve sipariş vermek
          için hesabınıza giriş yapın.
        </p>

        <CustomerLoginForm
          successMessage={
            successMessage
          }
        />

        <div className="mt-6 rounded-xl bg-orange-50 p-4 text-center text-sm text-slate-700">
          Bireysel hesabınız yok mu? <Link href="/register" className="font-black text-[#EF4B23]">Üye Ol</Link>
        </div>

        <div className="mt-7 border-t border-slate-200 pt-6 text-center">
          <Link
            href="/products"
            className="text-sm font-semibold text-blue-900 hover:underline"
          >
            Ürünleri incelemeye devam et
          </Link>
        </div>
      </section>
    </main>
  );
}
