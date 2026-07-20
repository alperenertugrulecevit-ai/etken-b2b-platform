import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type BrandsLayoutProps = {
  children: React.ReactNode;
};

export default async function BrandsLayout({
  children,
}: BrandsLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "INVENTORY_VIEW",
    "INVENTORY_ADJUST",
  ]);

  return children;
}