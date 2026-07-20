import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminManualStockLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST"
  );

  return children;
}