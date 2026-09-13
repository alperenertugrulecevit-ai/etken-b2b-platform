import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
  return children;
}
