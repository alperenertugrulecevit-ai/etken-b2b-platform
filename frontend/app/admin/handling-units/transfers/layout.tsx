import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminHandlingUnitTransfersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requirePermission(
    "TRANSFER_EXECUTE"
  );

  return children;
}