"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WarehouseTransferService } from "@/modules/inventory/services/warehouse-transfer.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim().toUpperCase();
}

export async function createRfWarehouseTransfer(formData: FormData) {
  const user = await AuthorizationService.requireRfAccess("TRANSFER_EXECUTE");
  const context = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);
  const operatorName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.username;

  const mode = textValue(formData, "mode");
  const sourceHandlingUnitBarcode = textValue(formData, "sourceHandlingUnitBarcode");
  const targetWarehouseId = Number(formData.get("targetWarehouseId"));
  const targetLocationId = Number(formData.get("targetLocationId"));
  const terminalCode = textValue(formData, "terminalCode");

  if (!sourceHandlingUnitBarcode || !Number.isInteger(targetWarehouseId) || !Number.isInteger(targetLocationId)) {
    throw new Error("Kaynak THM, hedef depo ve hedef lokasyon zorunludur.");
  }

  const [sourceUnit, targetWarehouse] = await Promise.all([
    prisma.handlingUnit.findUnique({ where: { barcode: sourceHandlingUnitBarcode }, select: { companyId: true } }),
    prisma.warehouse.findUnique({ where: { id: targetWarehouseId }, select: { companyId: true } }),
  ]);

  if (!sourceUnit || sourceUnit.companyId !== context.companyId || !targetWarehouse || targetWarehouse.companyId !== context.companyId) {
    throw new Error("Depolararası transfer yalnız aktif şirket kapsamındaki stoklar arasında yapılabilir.");
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "FULL_HU") {
      await WarehouseTransferService.transferFullHandlingUnit(tx, {
        sourceHandlingUnitBarcode,
        targetWarehouseId,
        targetLocationId,
        actor: { operatorId: user.id, operatorName, terminalCode: terminalCode || null },
      });
      return;
    }

    const productId = Number(formData.get("productId"));
    const quantity = Number(formData.get("quantity"));
    const targetHandlingUnitBarcode = textValue(formData, "targetHandlingUnitBarcode");

    if (!targetHandlingUnitBarcode || !Number.isInteger(productId)) {
      throw new Error("Ürün transferinde ürün ve hedef THM zorunludur.");
    }

    await WarehouseTransferService.transferProduct(tx, {
      sourceHandlingUnitBarcode,
      targetHandlingUnitBarcode,
      productId,
      quantity,
      targetWarehouseId,
      targetLocationId,
      actor: { operatorId: user.id, operatorName, terminalCode: terminalCode || null },
    });
  }, {
    maxWait: 10000,
    timeout: 30000,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  revalidatePath("/rf/warehouse-transfer/product");
  revalidatePath("/rf/warehouse-transfer/thm");
  revalidatePath("/admin/stock/movements");
  revalidatePath("/admin/stock/thm-movements");
}
