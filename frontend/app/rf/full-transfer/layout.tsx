import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFFullTransferLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireRfAccess(
    "TRANSFER_EXECUTE"
  );

  return children;
}