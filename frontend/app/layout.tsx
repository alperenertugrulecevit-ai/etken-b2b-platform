import type {
  Metadata,
} from "next";

import "./globals.css";

import RouteAwareFooter from "@/components/layout/RouteAwareFooter";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://www.etkenofis.com",
  ),
  title: {
    default:
      "Etken | Kurumsal Tedarik Platformu",
    template: "%s | Etken",
  },
  description:
    "İşletmeler için kurumsal ürün tedarik ve sipariş platformu.",
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
