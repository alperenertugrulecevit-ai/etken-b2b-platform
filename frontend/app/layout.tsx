import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETKEN | Kurumsal Ofis Tedarik Platformu",
  description:
    "Kurumsal firmalar için ofis, kırtasiye, temizlik, teknoloji, ambalaj ve endüstriyel ürün tedarik platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-slate-100 text-slate-800">
        {children}
      </body>
    </html>
  );
}