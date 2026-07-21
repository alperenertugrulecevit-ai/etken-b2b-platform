import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type AdminDashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminDashboardLayout({
  children,
}: AdminDashboardLayoutProps) {
  await AuthorizationService.requirePermission(
    "DASHBOARD_VIEW"
  );

  return children;
}