import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

type Props = {
  children: React.ReactNode;
};

export default async function DataImportsLayout({
  children,
}: Props) {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_VIEW"
  );

  return children;
}
