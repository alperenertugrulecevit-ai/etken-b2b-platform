import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type ProductsLayoutProps = {
  children: React.ReactNode;
};

export default async function ProductsLayout({
  children,
}: ProductsLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "INVENTORY_VIEW",
    "INVENTORY_ADJUST",
  ]);

  return children;
}