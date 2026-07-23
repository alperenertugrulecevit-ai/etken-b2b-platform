import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props = {
  children: React.ReactNode;
};

export default async function InventoryCountsLayout({
  children,
}: Props) {
  await AuthorizationService.requireAnyPermission(
    [
      "INVENTORY_COUNT_VIEW",
      "INVENTORY_COUNT_MANAGE",
      "INVENTORY_COUNT_APPROVE",
    ]
  );

  return children;
}