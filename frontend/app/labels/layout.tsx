import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type LabelsLayoutProps = {
  children: React.ReactNode;
};

export default async function LabelsLayout({
  children,
}: LabelsLayoutProps) {
  await AuthorizationService.requirePermission(
    "LABEL_PRINT"
  );

  return children;
}