import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFAddressingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireRfAccess(
    "PUTAWAY_EXECUTE"
  );

  return children;
}