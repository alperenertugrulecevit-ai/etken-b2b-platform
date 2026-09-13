"use server";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";
import { ManualSortingService } from "@/modules/manual-wave/services/manual-sorting.service";
async function managed() { const user = await AuthorizationService.requirePermission("THM_MANAGE"); return { user, scope: await WmsContextService.requireActiveContext(user.id, user.isAdminUser) }; }
export async function undoAction(transactionId: string, reason: string, idempotencyKey: string) { const { user, scope } = await managed(); return ManualSortingService.undoSortingTransaction({ transactionId, reason, idempotencyKey, actorId: user.id }, scope); }
export async function mergeAction(waveId: string, sourceBarcode: string, targetBarcode: string, reason: string, idempotencyKey: string) { const { user, scope } = await managed(); return ManualSortingService.mergeThm({ waveId, sourceBarcode, targetBarcode, reason, idempotencyKey, actorId: user.id }, scope); }
