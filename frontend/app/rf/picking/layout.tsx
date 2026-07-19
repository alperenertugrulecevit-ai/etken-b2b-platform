import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function RFPickingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireRfAccess(
    "PICKING_EXECUTE"
  );

  return children;
}