"use server";

import { OrderType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { OrderGroupingService } from "@/lib/wms/order-grouping-service";

function idsFrom(formData: FormData) {
  return formData
    .getAll("orderId")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function errorUrl(message: string) {
  return `/admin/order-grouping?error=${encodeURIComponent(message)}`;
}

export async function startDirectPickingAction(formData: FormData) {
  const user = await AuthorizationService.requirePermission("WAVE_MANAGE");
  const orderIds = idsFrom(formData);
  const warehouseId = Number(formData.get("warehouseId"));

  if (!Number.isInteger(warehouseId) || warehouseId <= 0) redirect(errorUrl("Toplama deposunu seçmelisiniz."));

  const displayName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.username;

  let result: Awaited<ReturnType<typeof OrderGroupingService.startDirectPicking>>;
  try {
    result = await OrderGroupingService.startDirectPicking({
      orderIds,
      warehouseId,
      assignedById: user.id,
      assignedByName: displayName,
    });
  } catch (error) {
    redirect(errorUrl(error instanceof Error ? error.message : "Toplama başlatılamadı."));
  }

  revalidatePath("/admin/order-grouping");
  revalidatePath("/rf/picking");
  redirect(`/admin/order-grouping?success=${encodeURIComponent(`${result.count} sipariş ${result.zoneCount} Zone içinde ${result.taskCount} göreve bölündü ve RF görev havuzuna gönderildi.`)}`);
}

export async function prepareWavePickingAction(formData: FormData) {
  await AuthorizationService.requirePermission("WAVE_MANAGE");
  const orderIds = idsFrom(formData);
  const warehouseId = Number(formData.get("warehouseId"));

  if (orderIds.length < 2) redirect(errorUrl("Wave toplama için en az 2 sipariş seçmelisiniz."));
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) redirect(errorUrl("Wave deposunu seçmelisiniz."));

  const params = new URLSearchParams({
    orderIds: orderIds.join(","),
    warehouseId: String(warehouseId),
    source: "order-grouping",
  });
  redirect(`/admin/waves/new?${params.toString()}`);
}
