import B2BBankAccountManager from "@/components/admin/B2BBankAccountManager";
import B2BCompanyProfileForm from "@/components/admin/B2BCompanyProfileForm";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

export const metadata = {
  title: "B2B Site Ayarları | ETKEN",
};

export default async function B2BSettingsPage() {
  await AuthorizationService.requirePermission("ORDER_MANAGE");

  const [profile, accounts] = await Promise.all([
    prisma.b2BCompanyProfile.findFirst({
      where: {
        tenantId: B2B_CONSTANTS.TENANT_ID,
        companyId: B2B_CONSTANTS.COMPANY_ID,
      },
      select: {
        brandName: true,
        legalName: true,
        taxOffice: true,
        taxNumber: true,
        mersisNumber: true,
        tradeRegistryNumber: true,
        authorizedPerson: true,
        phone: true,
        supportEmail: true,
        email: true,
        kepAddress: true,
        website: true,
        addressLine: true,
        city: true,
        district: true,
        postalCode: true,
        country: true,
        workingHours: true,
        logoUrl: true,
      },
    }),
    prisma.b2BBankAccount.findMany({
      where: {
        tenantId: B2B_CONSTANTS.TENANT_ID,
        companyId: B2B_CONSTANTS.COMPANY_ID,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        bankName: true,
        branchName: true,
        accountHolder: true,
        iban: true,
        currency: true,
        isActive: true,
        sortOrder: true,
      },
    }),
  ]);

  const profileForm = profile ?? {
    brandName: SITE_CONFIG.brandName,
    legalName: SITE_CONFIG.legalName,
    taxOffice: SITE_CONFIG.taxOffice,
    taxNumber: SITE_CONFIG.taxNumber,
    mersisNumber: SITE_CONFIG.mersisNumber,
    tradeRegistryNumber: SITE_CONFIG.tradeRegistryNumber,
    authorizedPerson: null,
    phone: SITE_CONFIG.phone,
    supportEmail: null,
    email: SITE_CONFIG.email,
    kepAddress: SITE_CONFIG.kepAddress,
    website: "https://" + SITE_CONFIG.domain,
    addressLine: SITE_CONFIG.address,
    city: null,
    district: null,
    postalCode: null,
    country: "Türkiye",
    workingHours: null,
    logoUrl: "/etken-ofis-logo.png",
  };

  return (
    <section className="p-5 sm:p-7 lg:p-10">
      <div className="max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-wide text-orange-600">
          B2B Site Yönetimi
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
          Şirket ve Ödeme Ayarları
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          ETKEN şirket profilini, iletişim bilgilerini ve müşterilere gösterilecek banka hesaplarını yönetin.
        </p>
      </div>

      <div className="mt-8 grid max-w-6xl gap-8">
        <B2BCompanyProfileForm profile={profileForm} />

        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-black text-slate-900">Ödeme ve Banka Hesapları</h2>
            <p className="mt-1 text-sm text-slate-500">
              Havale/EFT siparişlerinde müşteriye gösterilecek banka hesaplarını yönetin.
            </p>
          </div>
          <B2BBankAccountManager accounts={accounts} />
        </section>
      </div>
    </section>
  );
}
