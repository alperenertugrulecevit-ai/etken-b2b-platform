import { UserType } from "@prisma/client";
import { redirect } from "next/navigation";

import B2BCheckoutForm from "@/components/b2b/B2BCheckoutForm";
import Header from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

export const metadata = {
  title:
    "Sipariş Onayı | ETKEN Ofis",
};

export default async function CheckoutPage() {
  const user =
    await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !==
      UserType.CUSTOMER ||
    !user.customerId ||
    !user.customer ||
    !user.customer.isActive
  ) {
    redirect(
      "/customer-login"
    );
  }

  if (
    user.mustChangePassword
  ) {
    redirect(
      "/change-password?returnTo=%2Fcheckout"
    );
  }

  const customer =
    await prisma.customer.findFirst({
      where: {
        id: user.customerId,
        isActive: true,
      },
      select: {
        discountRate: true,
        creditLimit: true,
        paymentTermDays: true,
        addresses: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              isDefault: "desc",
            },
            {
              title: "asc",
            },
          ],
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            district: true,
            isDefault: true,
          },
        },
      },
    });

  if (!customer) {
    redirect(
      "/customer-login"
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            Güvenli Sipariş
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Sipariş Onayı
          </h1>
          <p className="mt-2 mb-8 text-slate-500">
            Teslimat ve ödeme bilgilerinizi kontrol ederek siparişinizi tamamlayın.
          </p>

          <B2BCheckoutForm
            addresses={
              customer.addresses
            }
            discountRate={
              customer.discountRate
            }
            creditLimit={
              customer.creditLimit
            }
            paymentTermDays={
              customer.paymentTermDays
            }
          />
        </div>
      </main>
    </>
  );
}
