import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFTransfersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireRfAccess(
    "TRANSFER_EXECUTE"
  );

  return children;
}