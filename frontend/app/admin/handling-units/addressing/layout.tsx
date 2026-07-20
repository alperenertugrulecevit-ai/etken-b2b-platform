import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminHandlingUnitAddressingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "PUTAWAY_EXECUTE",
    "HANDLING_UNIT_MANAGE",
  ]);

  return children;
}