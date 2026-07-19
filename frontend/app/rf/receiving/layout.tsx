import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFReceivingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireRfAccess(
    "RECEIVING_EXECUTE"
  );

  return children;
}