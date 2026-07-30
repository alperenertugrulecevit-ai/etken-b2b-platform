import B2BBankAccountManager from "@/components/admin/B2BBankAccountManager";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

export const metadata = {
  title: "B2B Ödeme Ayarları | ETKEN",
};

export default async function B2BSettingsPage() {
  await AuthorizationService.requirePermission("ORDER_MANAGE");

  const accounts = await prisma.b2BBankAccount.findMany({
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
  });

  return (
    <section className="p-10">
      <div className="max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
          B2B Site Yönetimi
        </p>
        <h1 className="mt-2 text-4xl font-black">Ödeme ve Banka Hesapları</h1>
        <p className="mt-3 text-slate-600">
          Havale/EFT siparişlerinde müşteriye gösterilecek firma banka hesaplarını yönetin.
        </p>
      </div>
      <div className="mt-8 max-w-5xl">
        <B2BBankAccountManager accounts={accounts} />
      </div>
    </section>
  );
}
