import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type CategoriesLayoutProps = {
  children: React.ReactNode;
};

export default async function CategoriesLayout({
  children,
}: CategoriesLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "INVENTORY_VIEW",
    "INVENTORY_ADJUST",
  ]);

  return children;
}