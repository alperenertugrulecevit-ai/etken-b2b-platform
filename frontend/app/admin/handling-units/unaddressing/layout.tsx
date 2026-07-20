import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminHandlingUnitUnaddressingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "LOCATION_MANAGE",
    "HANDLING_UNIT_MANAGE",
  ]);

  return children;
}