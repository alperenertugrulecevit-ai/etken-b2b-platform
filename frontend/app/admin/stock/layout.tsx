import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminStockLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "INVENTORY_VIEW",
    "INVENTORY_ADJUST",
  ]);

  return children;
}