import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminRolesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "ROLE_VIEW",
    "ROLE_MANAGE",
  ]);

  return children;
}