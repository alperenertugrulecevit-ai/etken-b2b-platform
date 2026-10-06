import { getCities, getDistrictsOfEachCity } from "turkey-neighbourhoods";
import { CustomerType, UserType } from "@prisma/client";
import { redirect } from "next/navigation";

import B2BCheckoutForm from "@/components/b2b/B2BCheckoutForm";
import EcommerceCheckoutForm from "@/components/ecommerce/EcommerceCheckoutForm";
import Header from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";
import { getCustomerAddressWhere } from "@/modules/b2b/services/customer-user-access.service";

export const metadata = {
  title: "Güvenli Ödeme | ETKEN Ofis",
};

export default async function CheckoutPage() {
  const user = await SessionService.getCurrentUser();

  const isCorporateCustomer =
    user?.userType === UserType.CUSTOMER &&
    Boolean(user.customerId) &&
    Boolean(user.customer?.isActive);

  if (isCorporateCustomer && user?.mustChangePassword) {
    redirect("/change-password?returnTo=%2Fcheckout");
  }

  if (isCorporateCustomer && user?.customerId) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: user.customerId,
        isActive: true,
        customerType: CustomerType.CORPORATE,
      },
      select: {
        discountRate: true,
        creditLimit: true,
        paymentTermDays: true,
        addresses: {
          where: getCustomerAddressWhere(user),
          orderBy: [{ isDefault: "desc" }, { title: "asc" }],
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

    if (customer) {
      return (
        <>
          <Header />
          <main className="min-h-screen bg-slate-100">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Kurumsal Sipariş</p>
              <h1 className="mt-2 text-4xl font-black text-slate-900">Sipariş Onayı</h1>
              <p className="mb-8 mt-2 text-slate-500">
                Kurumsal siparişlerde minimum sepet tutarı KDV hariç 1.000 TL’dir.
              </p>
              <B2BCheckoutForm
                addresses={customer.addresses}
                discountRate={customer.discountRate}
                creditLimit={customer.creditLimit}
                paymentTermDays={customer.paymentTermDays}
              />
            </div>
          </main>
        </>
      );
    }
  }

  const individualCustomer =
    user?.userType === UserType.CUSTOMER &&
    user.customerId &&
    user.customer?.isActive &&
    user.customer.customerType === CustomerType.INDIVIDUAL
      ? await prisma.customer.findUnique({
          where: { id: user.customerId },
          select: {
            contactName: true,
            phone: true,
            email: true,
            addresses: {
              where: { isActive: true },
              orderBy: [{ isDefault: "desc" }, { title: "asc" }],
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
                district: true,
                postalCode: true,
                isDefault: true,
              },
            },
          },
        })
      : null;

  const cities = getCities();
  const districtsByCityCode = getDistrictsOfEachCity();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-sm font-black uppercase tracking-wide text-[#EF4B23]">Güvenli Alışveriş</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Siparişini Tamamla</h1>
          <p className="mb-8 mt-2 text-slate-500">
            Üye olmadan teslimat ve fatura bilgilerinizi girerek sipariş oluşturabilirsiniz.
          </p>
          <EcommerceCheckoutForm cities={cities} districtsByCityCode={districtsByCityCode} memberProfile={individualCustomer} />
        </div>
      </main>
    </>
  );
}
