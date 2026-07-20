import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminHandlingUnitMergeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requirePermission(
    "HANDLING_UNIT_MANAGE"
  );

  return children;
}