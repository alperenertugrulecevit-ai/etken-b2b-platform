import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminHandlingUnitsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "HANDLING_UNIT_VIEW",
    "HANDLING_UNIT_MANAGE",
  ]);

  return children;
}