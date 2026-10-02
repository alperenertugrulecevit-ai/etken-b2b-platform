import type { Metadata } from "next";

import "./globals.css";

import RouteAwareFooter from "@/components/layout/RouteAwareFooter";
import { CartProvider } from "@/context/CartContext";
import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

const siteUrl = `https://${SITE_CONFIG.domain}`;

const siteDescription =
  "Etken Ofis; ofis kırtasiye, temizlik ve hijyen, gıda ve mutfak, ambalaj ve paketleme ürünlerini online satın alabileceğiniz e-ticaret mağazasıdır.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  applicationName: SITE_CONFIG.brandName,

  title: {
    default: "Etken Ofis | Online Alışveriş",
    template: "%s | Etken Ofis",
  },

  description: siteDescription,

  keywords: [
    "Etken Ofis",
    "online alışveriş",
    "e-ticaret",
    "ofis malzemeleri",
    "ofis kırtasiye",
    "B2B tedarik",
    "B2B sipariş",
    "temizlik ürünleri",
    "hijyen ürünleri",
    "gıda ve mutfak",
    "ambalaj ürünleri",
    "iş güvenliği ürünleri",
    "kurumsal ofis malzemeleri",
  ],

  authors: [
    {
      name: SITE_CONFIG.brandName,
    },
  ],

  creator: SITE_CONFIG.brandName,
  publisher: SITE_CONFIG.brandName,

  alternates: {
    canonical: siteUrl,
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],

    apple: [
      {
        url: "/apple-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },

  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: SITE_CONFIG.brandName,

    title: "Etken Ofis | Online Alışveriş",
    description: siteDescription,

    images: [
      {
        url: "/etken-ofis-logo.png",
        alt: "Etken Ofis Online Alışveriş",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "Etken Ofis | Online Alışveriş",
    description: siteDescription,
    images: ["/etken-ofis-logo.png"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${siteUrl}/#organization`,

  name: "Etken Ofis",
  alternateName: "ETKEN OFİS",
  url: siteUrl,

  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}/icon.png`,
    contentUrl: `${siteUrl}/icon.png`,
    width: 512,
    height: 512,
  },

  image: `${siteUrl}/etken-ofis-logo.png`,
  description: siteDescription,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,

  url: siteUrl,
  name: "Etken Ofis",
  alternateName: "Etken Ofis Online Mağaza",

  publisher: {
    "@id": `${siteUrl}/#organization`,
  },

  inLanguage: "tr-TR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />

        <CartProvider>
          {children}
          <RouteAwareFooter />
        </CartProvider>
      </body>
    </html>
  );
}