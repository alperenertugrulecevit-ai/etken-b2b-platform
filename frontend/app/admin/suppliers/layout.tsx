import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type SuppliersLayoutProps = {
  children: React.ReactNode;
};

export default async function SuppliersLayout({
  children,
}: SuppliersLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "RECEIVING_VIEW",
    "RECEIVING_EXECUTE",
  ]);

  return children;
}