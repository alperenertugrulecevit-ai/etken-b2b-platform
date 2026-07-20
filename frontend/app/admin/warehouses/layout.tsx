import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminWarehousesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "WAREHOUSE_VIEW",
    "WAREHOUSE_MANAGE",
  ]);

  return children;
}