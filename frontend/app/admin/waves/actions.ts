"use server";

import {
  OrderStatus,
  WavePriority,
  WaveStatus,
  WaveType,
  WmsOperationType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  assignUserToWave,
  changeWaveStatus,
  createWave,
} from "@/lib/wms/wave-service";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WaveDistributionService } from "@/modules/fulfillment/services/wave-distribution.service";
import { ZonePickingService } from "@/lib/wms/zone-picking-service";

function optionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function orderIds(formData: FormData) {
  return String(formData.get("orderIds") ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export async function createWaveAction(formData: FormData) {
  const currentUser = await AuthorizationService.requirePermission("WAVE_MANAGE");

  const typeValue = String(formData.get("type") ?? "");
  const priorityValue = String(formData.get("priority") ?? "");
  const type = Object.values(WaveType).includes(typeValue as WaveType)
    ? (typeValue as WaveType)
    : WaveType.MIXED;
  const priority = Object.values(WavePriority).includes(priorityValue as WavePriority)
    ? (priorityValue as WavePriority)
    : WavePriority.NORMAL;

  const plannedStartAt = optionalDate(formData.get("plannedStartAt"));
  const plannedFinishAt = optionalDate(formData.get("plannedFinishAt"));
  if (plannedStartAt && plannedFinishAt && plannedFinishAt < plannedStartAt) {
    throw new Error("Planlanan bitiş tarihi başlangıç tarihinden önce olamaz.");
  }

  const selectedOrderIds = Array.from(new Set(orderIds(formData)));
  const warehouseId = Number(formData.get("warehouseId"));
  const groupedFlow = selectedOrderIds.length > 0;

  const displayName = currentUser.employee
    ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
    : currentUser.username;

  if (groupedFlow) {
    if (selectedOrderIds.length < 2) throw new Error("Wave toplama için en az 2 sipariş seçilmelidir.");
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) throw new Error("Wave deposu seçilmelidir.");

    const [warehouse, orders] = await Promise.all([
      prisma.warehouse.findFirst({
        where: { id: warehouseId, isActive: true, code: { not: "KYP001" } },
        select: { id: true, code: true },
      }),
      prisma.order.findMany({
        where: { id: { in: selectedOrderIds } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          fulfillmentWarehouseId: true,
          customer: { select: { customerCode: true, companyName: true } },
          items: { select: { quantity: true } },
          waveOrders: {
            where: {
              wave: {
                status: { in: [WaveStatus.DRAFT, WaveStatus.READY, WaveStatus.RELEASED, WaveStatus.IN_PROGRESS, WaveStatus.PAUSED] },
              },
            },
            select: { id: true },
          },
          pickingAssignment: { select: { id: true } },
        },
      }),
    ]);

    if (!warehouse) throw new Error("Seçilen depo aktif değil.");
    if (orders.length !== selectedOrderIds.length) throw new Error("Seçilen siparişlerden biri bulunamadı.");

    for (const order of orders) {
      if (order.status !== OrderStatus.APPROVED) throw new Error(`${order.orderNumber} artık Onaylandı durumunda değil.`);
      if (order.waveOrders.length || order.pickingAssignment) throw new Error(`${order.orderNumber} için toplama daha önce başlatılmış.`);
      if (order.fulfillmentWarehouseId && order.fulfillmentWarehouseId !== warehouse.id) {
        throw new Error(`${order.orderNumber} farklı bir depoya atanmış.`);
      }
    }

    const wave = await createWave({
      name: optionalText(formData.get("name")),
      type,
      priority,
      plannedStartAt,
      plannedFinishAt,
      notes: optionalText(formData.get("notes")),
      createdBy: displayName,
      warehouseId: warehouse.id,
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        customerCode: order.customer.customerCode,
        customerName: order.customer.companyName,
        lineCount: order.items.length,
        plannedQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    });

    try {
      await prisma.order.updateMany({
        where: { id: { in: selectedOrderIds } },
        data: { fulfillmentWarehouseId: warehouse.id },
      });

      await ZonePickingService.buildTasksForOrders(prisma, { orderIds: selectedOrderIds, warehouseId: warehouse.id, waveId: wave.id });

      await WaveDistributionService.createOrRefreshPlan(wave.id, {
        userId: currentUser.id,
        displayName,
      });

      await changeWaveStatus(wave.id, WaveStatus.READY, displayName);
      await changeWaveStatus(wave.id, WaveStatus.RELEASED, displayName);

      await prisma.order.updateMany({
        where: { id: { in: selectedOrderIds }, status: OrderStatus.APPROVED },
        data: { status: OrderStatus.PREPARING },
      });
    } catch (error) {
      await prisma.wave.delete({ where: { id: wave.id } }).catch(() => undefined);
      throw error;
    }

    revalidatePath("/admin/order-grouping");
    revalidatePath("/admin/waves");
    revalidatePath("/rf/wave-picking");
    redirect(`/admin/waves/${wave.id}?success=${encodeURIComponent("Wave oluşturuldu; Zone görevleri RF görev havuzuna gönderildi.")}`);
  }

  const wave = await createWave({
    name: optionalText(formData.get("name")),
    type,
    priority,
    plannedStartAt,
    plannedFinishAt,
    notes: optionalText(formData.get("notes")),
    createdBy: optionalText(formData.get("createdBy")) ?? displayName,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/waves");
  redirect(`/admin/waves?created=${wave.id}`);
}
