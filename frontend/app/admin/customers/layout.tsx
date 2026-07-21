import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type CustomersLayoutProps = {
  children: React.ReactNode;
};

export default async function CustomersLayout({
  children,
}: CustomersLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "CUSTOMER_VIEW",
    "CUSTOMER_MANAGE",
  ]);

  return children;
}