"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function intValue(value: FormDataEntryValue | null) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function createZone(formData: FormData) {
  await AuthorizationService.requirePermission("WAREHOUSE_MANAGE");
  const warehouseId = intValue(formData.get("warehouseId"));
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const pickSequence = Number(formData.get("pickSequence") ?? 0);

  if (!warehouseId || !code || !name) throw new Error("Depo, Zone kodu ve Zone adı zorunludur.");

  try {
    await prisma.warehouseZone.create({
      data: { warehouseId, code, name, description, pickSequence: Number.isFinite(pickSequence) ? pickSequence : 0 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Bu depoda aynı Zone kodu zaten kullanılıyor.");
    }
    throw error;
  }
  revalidatePath("/admin/zones");
}

export async function toggleZoneStatus(zoneId: number, currentStatus: boolean) {
  await AuthorizationService.requirePermission("WAREHOUSE_MANAGE");
  await prisma.warehouseZone.update({ where: { id: zoneId }, data: { isActive: !currentStatus } });
  revalidatePath("/admin/zones");
}

export async function assignLocationsToZone(zoneId: number, formData: FormData) {
  const profile = await AuthorizationService.requireAdminPortalAccess();
  await AuthorizationService.requirePermission("WAREHOUSE_MANAGE");
  const zone = await prisma.warehouseZone.findUnique({ where: { id: zoneId }, select: { id: true, warehouseId: true } });
  if (!zone) throw new Error("Zone bulunamadı.");

  const locationIds = formData.getAll("locationId").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (!locationIds.length) throw new Error("En az bir lokasyon seçmelisiniz.");

  const locations = await prisma.warehouseLocation.findMany({
    where: { id: { in: locationIds }, warehouseId: zone.warehouseId },
    select: { id: true, zoneId: true },
  });
  if (locations.length !== locationIds.length) throw new Error("Seçilen lokasyonlardan bazıları bu depoya ait değil.");

  await prisma.$transaction(async (tx) => {
    for (const location of locations) {
      if (location.zoneId === zone.id) continue;
      await tx.warehouseLocation.update({ where: { id: location.id }, data: { zoneId: zone.id } });
      await tx.warehouseLocationZoneHistory.create({
        data: { warehouseId: zone.warehouseId, locationId: location.id, oldZoneId: location.zoneId, newZoneId: zone.id, changedBy: profile.id },
      });
    }
  });

  revalidatePath("/admin/zones");
  revalidatePath(`/admin/zones/${zoneId}/locations`);
  redirect(`/admin/zones/${zoneId}/locations?updated=${locations.length}`);
}

export async function removeLocationsFromZone(zoneId: number, formData: FormData) {
  const profile = await AuthorizationService.requireAdminPortalAccess();
  await AuthorizationService.requirePermission("WAREHOUSE_MANAGE");
  const zone = await prisma.warehouseZone.findUnique({ where: { id: zoneId }, select: { id: true, warehouseId: true } });
  if (!zone) throw new Error("Zone bulunamadı.");
  const ids = formData.getAll("locationId").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const locations = await prisma.warehouseLocation.findMany({ where: { id: { in: ids }, warehouseId: zone.warehouseId, zoneId }, select: { id: true } });

  await prisma.$transaction(async (tx) => {
    for (const location of locations) {
      await tx.warehouseLocation.update({ where: { id: location.id }, data: { zoneId: null } });
      await tx.warehouseLocationZoneHistory.create({
        data: { warehouseId: zone.warehouseId, locationId: location.id, oldZoneId: zone.id, newZoneId: null, changedBy: profile.id },
      });
    }
  });
  revalidatePath("/admin/zones");
  revalidatePath(`/admin/zones/${zoneId}/locations`);
}
