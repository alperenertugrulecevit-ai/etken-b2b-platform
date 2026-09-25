"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WarehouseTransferService } from "@/modules/inventory/services/warehouse-transfer.service";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim().toUpperCase();
}

export async function createWarehouseTransfer(formData: FormData) {
  const user = await AuthorizationService.requireAdminAccess();
  const operatorName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.username;
  const mode = text(formData, "mode");
  const sourceHandlingUnitBarcode = text(formData, "sourceHandlingUnitBarcode");
  const targetWarehouseId = Number(formData.get("targetWarehouseId"));
  const targetLocationId = Number(formData.get("targetLocationId"));

  if (!sourceHandlingUnitBarcode || !Number.isInteger(targetWarehouseId) || !Number.isInteger(targetLocationId))
    throw new Error("Kaynak THM, hedef depo ve hedef lokasyon zorunludur.");

  await prisma.$transaction(async (tx) => {
    if (mode === "FULL_HU") {
      await WarehouseTransferService.transferFullHandlingUnit(tx, {
        sourceHandlingUnitBarcode, targetWarehouseId, targetLocationId,
        actor: { operatorId: user.id, operatorName },
      });
      return;
    }
    const productId = Number(formData.get("productId"));
    const quantity = Number(formData.get("quantity"));
    const targetHandlingUnitBarcode = text(formData, "targetHandlingUnitBarcode");
    if (!targetHandlingUnitBarcode || !Number.isInteger(productId))
      throw new Error("Ürün bazlı transferde ürün ve hedef THM zorunludur.");
    await WarehouseTransferService.transferProduct(tx, {
      sourceHandlingUnitBarcode, targetHandlingUnitBarcode, productId, quantity,
      targetWarehouseId, targetLocationId,
      actor: { operatorId: user.id, operatorName },
    });
  }, {
    maxWait: 10000, timeout: 30000,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  revalidatePath("/admin/stock/warehouse-transfer");
  revalidatePath("/admin/stock/movements");
  revalidatePath("/admin/stock/thm-movements");
}
