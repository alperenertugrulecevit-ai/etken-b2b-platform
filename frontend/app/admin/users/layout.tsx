import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminUsersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "USER_VIEW",
    "USER_MANAGE",
  ]);

  return children;
}