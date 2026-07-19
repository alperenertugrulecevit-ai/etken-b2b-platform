import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFPalletUnlinkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireRfAccess(
    "HANDLING_UNIT_MANAGE"
  );

  return children;
}