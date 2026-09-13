"use server";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";
import { ManualSortingService } from "@/modules/manual-wave/services/manual-sorting.service";

async function context() {
  const user = await AuthorizationService.requireRfAccess("WAVE_SORTING_EXECUTE");
  const scope = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);
  return { user, scope };
}
export async function resolveProductAction(waveId: string, pickingBarcode: string, productBarcode: string) {
  const { scope } = await context();
  await ManualSortingService.validatePickingBarcode(waveId, pickingBarcode, scope);
  const result = await ManualSortingService.resolveSortingTarget(waveId, productBarcode, scope);
  return { productName: result.product.name, distributionId: result.distribution.id, targetCode: result.distribution.customerCode || result.distribution.distributionCode, priorityRank: result.priorityRank, remainingQuantity: result.remainingQuantity };
}
export async function commitSortingAction(input: { waveId: string; pickingBarcode: string; productBarcode: string; expectedDistributionId: string; thmBarcode: string; terminalId?: string; idempotencyKey: string }) {
  const { user, scope } = await context();
  await ManualSortingService.commitSortingScan({ ...input, operatorId: user.id }, scope);
  return ManualSortingService.getPickingProgress(input.waveId, scope);
}
