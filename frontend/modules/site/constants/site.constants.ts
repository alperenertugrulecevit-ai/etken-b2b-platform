export type SiteConfig = {
  brandName: string;
  legalName: string;
  domain: string;
  address: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  mersisNumber: string | null;
  tradeRegistryNumber: string | null;
  phone: string | null;
  email: string | null;
  kepAddress: string | null;
};

/*
 * Resmî şirket ve iletişim bilgileri kesinleştiğinde yalnızca
 * bu dosyayı güncelleyin. Yasal sayfalar ve footer aynı
 * bilgileri merkezi olarak kullanır.
 */
export const SITE_CONFIG: SiteConfig = {
  brandName: "Etken",
  legalName: "Etken",
  domain: "www.etkenofis.com",
  address: null,
  taxOffice: null,
  taxNumber: null,
  mersisNumber: null,
  tradeRegistryNumber: null,
  phone: null,
  email: null,
  kepAddress: null,
};

export const SITE_LEGAL_PROFILE_COMPLETE =
  Boolean(
    SITE_CONFIG.legalName &&
      SITE_CONFIG.address &&
      SITE_CONFIG.taxOffice &&
      SITE_CONFIG.taxNumber &&
      SITE_CONFIG.email,
  );
