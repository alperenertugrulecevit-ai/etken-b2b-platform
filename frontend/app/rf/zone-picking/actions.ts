"use server";

import { ZonePickTaskStatus, WavePriority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const priorityRank: Record<WavePriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export async function claimZoneTask(formData: FormData) {
  const user = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const zoneId = Number(formData.get("zoneId"));
  if (!Number.isInteger(zoneId) || zoneId <= 0) throw new Error("Zone seçilemedi.");

  const active = await prisma.zonePickTask.findFirst({
    where: { claimedByUserId: user.id, status: { in: [ZonePickTaskStatus.CLAIMED, ZonePickTaskStatus.IN_PROGRESS] } },
    select: { id: true },
  });
  if (active) redirect(`/rf/picking?zoneTaskId=${encodeURIComponent(active.id)}`);

  const candidates = await prisma.zonePickTask.findMany({
    where: { zoneId, status: ZonePickTaskStatus.OPEN, claimedByUserId: null },
    select: {
      id: true,
      createdAt: true,
      order: { select: { requestedDate: true } },
      wave: { select: { priority: true, plannedFinishAt: true } },
    },
  });

  candidates.sort((a,b) => {
    const ap = a.wave ? priorityRank[a.wave.priority] : priorityRank.NORMAL;
    const bp = b.wave ? priorityRank[b.wave.priority] : priorityRank.NORMAL;
    if (ap !== bp) return ap-bp;
    const ad = a.order.requestedDate?.getTime() ?? a.wave?.plannedFinishAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bd = b.order.requestedDate?.getTime() ?? b.wave?.plannedFinishAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad-bd;
    return a.createdAt.getTime()-b.createdAt.getTime();
  });

  for (const task of candidates) {
    const result = await prisma.zonePickTask.updateMany({
      where: { id: task.id, status: ZonePickTaskStatus.OPEN, claimedByUserId: null },
      data: { status: ZonePickTaskStatus.CLAIMED, claimedByUserId: user.id, claimedAt: new Date() },
    });
    if (result.count === 1) {
      revalidatePath("/rf/zone-picking");
      redirect(`/rf/picking?zoneTaskId=${encodeURIComponent(task.id)}`);
    }
  }
  throw new Error("Bu Zone'da şu anda alınabilir görev kalmadı.");
}

export async function releaseZoneTask(formData: FormData) {
  const user = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const taskId = String(formData.get("taskId") ?? "");
  const result = await prisma.zonePickTask.updateMany({
    where: { id: taskId, claimedByUserId: user.id, status: ZonePickTaskStatus.CLAIMED, pickedQuantity: 0 },
    data: { status: ZonePickTaskStatus.OPEN, claimedByUserId: null, claimedAt: null, startedAt: null },
  });
  if (result.count !== 1) throw new Error("Toplaması başlamış görev personel tarafından bırakılamaz.");
  revalidatePath("/rf/zone-picking");
}


export async function claimZoneTaskById(formData: FormData) {
  const user = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("Toplama görevi seçilemedi.");

  const active = await prisma.zonePickTask.findFirst({
    where: { claimedByUserId: user.id, status: { in: [ZonePickTaskStatus.CLAIMED, ZonePickTaskStatus.IN_PROGRESS] } },
    select: { id: true },
  });
  if (active && active.id !== taskId) {
    throw new Error("Önce üzerinizdeki aktif toplama görevini tamamlayın veya bırakın.");
  }
  if (active?.id === taskId) redirect(`/rf/picking?zoneTaskId=${encodeURIComponent(taskId)}`);

  const result = await prisma.zonePickTask.updateMany({
    where: { id: taskId, status: ZonePickTaskStatus.OPEN, claimedByUserId: null },
    data: { status: ZonePickTaskStatus.CLAIMED, claimedByUserId: user.id, claimedAt: new Date() },
  });
  if (result.count !== 1) throw new Error("Seçilen sipariş görevi artık alınabilir durumda değil.");

  revalidatePath("/rf/picking");
  revalidatePath("/rf/zone-picking");
  redirect(`/rf/picking?zoneTaskId=${encodeURIComponent(taskId)}`);
}
