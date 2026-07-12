import "./globals.css";
import { CartProvider } from "@/context/CartContext";

export const metadata = {
  title: "ETKEN B2B",
  description: "ETKEN B2B Platform",
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
        </CartProvider>
      </body>
    </html>
  );
}