"use server";

import { ZonePickTaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export async function claimZoneTask(formData: FormData) {
  const user = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) throw new Error("Görev seçilmedi.");

  const result = await prisma.zonePickTask.updateMany({
    where: { id: taskId, status: ZonePickTaskStatus.OPEN, claimedByUserId: null },
    data: { status: ZonePickTaskStatus.CLAIMED, claimedByUserId: user.id, claimedAt: new Date() },
  });
  if (result.count !== 1) throw new Error("Bu görev başka bir personel tarafından alınmış.");

  revalidatePath("/rf/zone-picking");
  redirect(`/rf/picking?zoneTaskId=${encodeURIComponent(taskId)}`);
}

export async function releaseZoneTask(formData: FormData) {
  const user = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const taskId = String(formData.get("taskId") ?? "");
  await prisma.zonePickTask.updateMany({
    where: { id: taskId, claimedByUserId: user.id, status: { in: [ZonePickTaskStatus.CLAIMED, ZonePickTaskStatus.IN_PROGRESS] } },
    data: { status: ZonePickTaskStatus.OPEN, claimedByUserId: null, claimedAt: null, startedAt: null },
  });
  revalidatePath("/rf/zone-picking");
}
