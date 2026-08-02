import "server-only";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import type { PublicCompanyProfile } from "@/modules/b2b/types/company-profile.types";
import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

export async function getPublicCompanyProfile(): Promise<PublicCompanyProfile> {
  const profile = await prisma.b2BCompanyProfile.findFirst({
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
  });

  const result = {
    brandName: profile?.brandName || SITE_CONFIG.brandName,
    legalName: profile?.legalName || SITE_CONFIG.legalName,
    taxOffice: profile?.taxOffice ?? SITE_CONFIG.taxOffice,
    taxNumber: profile?.taxNumber ?? SITE_CONFIG.taxNumber,
    mersisNumber: profile?.mersisNumber ?? SITE_CONFIG.mersisNumber,
    tradeRegistryNumber:
      profile?.tradeRegistryNumber ?? SITE_CONFIG.tradeRegistryNumber,
    authorizedPerson: profile?.authorizedPerson ?? null,
    phone: profile?.phone ?? SITE_CONFIG.phone,
    supportEmail: profile?.supportEmail ?? null,
    email: profile?.email ?? SITE_CONFIG.email,
    kepAddress: profile?.kepAddress ?? SITE_CONFIG.kepAddress,
    website: profile?.website ?? "https://" + SITE_CONFIG.domain,
    addressLine: profile?.addressLine ?? SITE_CONFIG.address,
    city: profile?.city ?? null,
    district: profile?.district ?? null,
    postalCode: profile?.postalCode ?? null,
    country: profile?.country || "Türkiye",
    workingHours: profile?.workingHours ?? null,
    logoUrl: profile?.logoUrl ?? "/etken-ofis-logo.png",
  };

  return {
    ...result,
    isComplete: Boolean(
      result.legalName &&
        result.addressLine &&
        result.taxOffice &&
        result.taxNumber &&
        result.email,
    ),
  };
}
