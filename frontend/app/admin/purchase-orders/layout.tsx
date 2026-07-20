import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type PurchaseOrdersLayoutProps = {
  children: React.ReactNode;
};

export default async function PurchaseOrdersLayout({
  children,
}: PurchaseOrdersLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "RECEIVING_VIEW",
    "RECEIVING_EXECUTE",
  ]);

  return children;
}