"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PublicCompanyProfile } from "@/modules/b2b/types/company-profile.types";
import { SITE_CONFIG, SITE_LEGAL_PROFILE_COMPLETE } from "@/modules/site/constants/site.constants";

const corporateLinks = [
  { href: "/about", label: "Hakkımızda" },
  { href: "/contact", label: "İletişim" },
  { href: "/products", label: "Ürünler" },
  { href: "/customer-login", label: "Kurumsal Hesabım" },
];

const legalLinks = [
  { href: "/legal/kvkk", label: "KVKK Aydınlatma Metni" },
  { href: "/legal/privacy", label: "Gizlilik ve Çerez Politikası" },
  { href: "/legal/b2b-sales", label: "B2B Satış Koşulları" },
  { href: "/legal/delivery-returns", label: "Teslimat ve İade" },
];

const fallback: PublicCompanyProfile = {
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
  isComplete: SITE_LEGAL_PROFILE_COMPLETE,
};

function formatAddress(profile: PublicCompanyProfile) {
  return [profile.addressLine, profile.district, profile.city]
    .filter(Boolean)
    .join(" · ");
}

export default function PublicFooter() {
  const [profile, setProfile] = useState(fallback);

  useEffect(() => {
    let active = true;

    fetch("/api/public/company-profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: PublicCompanyProfile) => {
        if (active) setProfile(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const address = formatAddress(profile);

  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="text-2xl font-black tracking-wide text-white">
            {profile.brandName}
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            İşletmeler için kurumsal ürün tedarik ve sipariş platformu.
          </p>

          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {address ? <p>{address}</p> : null}
            {profile.phone ? <p><a href={"tel:" + profile.phone} className="hover:text-white">{profile.phone}</a></p> : null}
            {profile.email ? <p><a href={"mailto:" + profile.email} className="hover:text-white">{profile.email}</a></p> : null}
          </div>

          {!profile.isComplete ? (
            <p className="mt-5 max-w-md rounded-lg border border-amber-400/40 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              Resmî şirket ve iletişim bilgileri yayın öncesinde tamamlanacaktır.
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300">Kurumsal</h2>
          <nav className="mt-4 flex flex-col items-start gap-3">
            {corporateLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-slate-300 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300">Yasal</h2>
          <nav className="mt-4 flex flex-col items-start gap-3">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-slate-300 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-slate-400 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {profile.legalName}. Tüm hakları saklıdır.</span>
          <span>{profile.website ?? SITE_CONFIG.domain}</span>
        </div>
      </div>
    </footer>
  );
}
