import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type WmsDashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function WmsDashboardLayout({
  children,
}: WmsDashboardLayoutProps) {
  await AuthorizationService.requirePermission(
    "DASHBOARD_VIEW"
  );

  return children;
}