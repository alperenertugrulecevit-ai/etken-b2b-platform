import Link from "next/link";
import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";

import CustomerLoginForm from "@/components/auth/CustomerLoginForm";
import { SessionService } from "@/modules/auth/services/session.service";

export const metadata = {
  title:
    "Kurumsal Giriş | ETKEN Ofis",
  description:
    "ETKEN Ofis kurumsal müşteri hesabı girişi",
};

export default async function CustomerLoginPage() {
  const user =
    await SessionService.getCurrentUser();

  if (
    user?.userType ===
      UserType.CUSTOMER &&
    user.customer?.isActive
  ) {
    redirect("/account");
  }

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
          Kurumsal Giriş
        </h1>
        <p className="mt-2 mb-7 text-sm leading-6 text-slate-500">
          Fiyatlarınızı görmek, sepetinizi yönetmek ve sipariş vermek için hesabınıza giriş yapın.
        </p>

        <CustomerLoginForm />

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
