import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type OrdersLayoutProps = {
  children: React.ReactNode;
};

export default async function OrdersLayout({
  children,
}: OrdersLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "ORDER_VIEW",
    "ORDER_MANAGE",
  ]);

  return children;
}