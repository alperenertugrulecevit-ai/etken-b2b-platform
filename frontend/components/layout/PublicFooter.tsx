import Link from "next/link";

import {
  SITE_CONFIG,
  SITE_LEGAL_PROFILE_COMPLETE,
} from "@/modules/site/constants/site.constants";

const corporateLinks = [
  {
    href: "/about",
    label: "Hakkımızda",
  },
  {
    href: "/contact",
    label: "İletişim",
  },
  {
    href: "/products",
    label: "Ürünler",
  },
  {
    href: "/customer-login",
    label: "Kurumsal Hesabım",
  },
];

const legalLinks = [
  {
    href: "/legal/kvkk",
    label: "KVKK Aydınlatma Metni",
  },
  {
    href: "/legal/privacy",
    label: "Gizlilik ve Çerez Politikası",
  },
  {
    href: "/legal/b2b-sales",
    label: "B2B Satış Koşulları",
  },
  {
    href: "/legal/delivery-returns",
    label: "Teslimat ve İade",
  },
];

export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-8 md:grid-cols-3">
        <div>
          <Link
            href="/"
            className="text-2xl font-black tracking-wide text-white"
          >
            {SITE_CONFIG.brandName}
          </Link>

          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
            İşletmeler için kurumsal ürün tedarik ve sipariş platformu.
          </p>

          {!SITE_LEGAL_PROFILE_COMPLETE ? (
            <p className="mt-5 rounded-lg border border-amber-400/40 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              Resmî şirket ve iletişim bilgileri yayın öncesinde tamamlanacaktır.
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-200">
            Kurumsal
          </h2>

          <nav className="mt-4 flex flex-col items-start gap-3">
            {corporateLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-300 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-200">
            Yasal
          </h2>

          <nav className="mt-4 flex flex-col items-start gap-3">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-300 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-slate-400 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} {SITE_CONFIG.legalName}. Tüm hakları saklıdır.
          </span>

          <span>
            {SITE_CONFIG.domain}
          </span>
        </div>
      </div>
    </footer>
  );
}
