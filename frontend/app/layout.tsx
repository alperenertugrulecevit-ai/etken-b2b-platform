import type { Metadata } from "next";

import "./globals.css";

import RouteAwareFooter from "@/components/layout/RouteAwareFooter";
import { CartProvider } from "@/context/CartContext";
import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

const siteUrl = "https://" + SITE_CONFIG.domain;
const siteDescription =
  "İşletmeler için kurumsal ürün tedarik ve sipariş platformu.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_CONFIG.brandName,
  title: {
    default: "Etken | Kurumsal Tedarik Platformu",
    template: "%s | Etken",
  },
  description: siteDescription,
  keywords: [
    "kurumsal tedarik",
    "ofis malzemeleri",
    "B2B sipariş",
    "temizlik ürünleri",
    "iş güvenliği ürünleri",
  ],
  authors: [
    {
      name: SITE_CONFIG.brandName,
    },
  ],
  creator: SITE_CONFIG.brandName,
  publisher: SITE_CONFIG.brandName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: SITE_CONFIG.brandName,
    title: "Etken | Kurumsal Tedarik Platformu",
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: "Etken | Kurumsal Tedarik Platformu",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <CartProvider>
          {children}
          <RouteAwareFooter />
        </CartProvider>
      </body>
    </html>
  );
}
