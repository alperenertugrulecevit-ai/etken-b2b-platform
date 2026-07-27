import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function WmsStructureLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAnyPermission([
    "WMS_COMPANY_VIEW",
    "WMS_COMPANY_MANAGE",
    "WMS_ACCESS_MANAGE",
  ]);

  return children;
}
