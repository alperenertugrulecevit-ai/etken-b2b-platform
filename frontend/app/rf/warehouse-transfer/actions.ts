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

export type RfWarehouseTransferState = {
  success: boolean;
  message: string;
};

function fullLocationCode(location: {
  code: string;
  section: string;
  level: string;
  bin: string;
}) {
  return [location.code, location.section, location.level, location.bin]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

export async function createRfWarehouseTransfer(
  _previousState: RfWarehouseTransferState,
  formData: FormData,
) {
  const user = await AuthorizationService.requireRfAccess("TRANSFER_EXECUTE");
  const context = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);
  const operatorName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.username;

  const mode = textValue(formData, "mode");
  const sourceWarehouseId = Number(formData.get("sourceWarehouseId"));
  const sourceHandlingUnitBarcode = textValue(formData, "sourceHandlingUnitBarcode");
  const productBarcode = textValue(formData, "productBarcode");
  const targetWarehouseId = Number(formData.get("targetWarehouseId"));
  const targetLocationBarcode = textValue(formData, "targetLocationBarcode");
  const terminalCode = textValue(formData, "terminalCode");

  if (
    !Number.isInteger(sourceWarehouseId) ||
    sourceWarehouseId <= 0 ||
    !sourceHandlingUnitBarcode ||
    !Number.isInteger(targetWarehouseId) ||
    targetWarehouseId <= 0 ||
    !targetLocationBarcode
  ) {
    return {
      success: false,
      message: "Kaynak depo, kaynak THM, hedef depo ve hedef lokasyon zorunludur.",
    };
  }

  const [sourceUnit, sourceWarehouse, targetWarehouse, targetLocations] =
    await Promise.all([
      prisma.handlingUnit.findUnique({
        where: { barcode: sourceHandlingUnitBarcode },
        select: { companyId: true, warehouseId: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: sourceWarehouseId },
        select: { companyId: true, isActive: true, code: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: targetWarehouseId },
        select: { companyId: true, isActive: true, code: true },
      }),
      prisma.warehouseLocation.findMany({
        where: {
          warehouseId: targetWarehouseId,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          section: true,
          level: true,
          bin: true,
        },
      }),
    ]);

  if (
    !sourceWarehouse ||
    !sourceWarehouse.isActive ||
    sourceWarehouse.companyId !== context.companyId
  ) {
    return { success: false, message: "Seçilen kaynak depo geçerli veya aktif değil." };
  }

  if (
    !sourceUnit ||
    sourceUnit.companyId !== context.companyId ||
    sourceUnit.warehouseId !== sourceWarehouseId
  ) {
    return {
      success: false,
      message: "Okutulan kaynak THM seçilen kaynak depoda bulunamadı.",
    };
  }

  if (
    !targetWarehouse ||
    !targetWarehouse.isActive ||
    targetWarehouse.companyId !== context.companyId
  ) {
    return { success: false, message: "Seçilen hedef depo geçerli veya aktif değil." };
  }

  const targetLocation = targetLocations.find(
    (location) => fullLocationCode(location) === targetLocationBarcode,
  );

  if (!targetLocation) {
    return {
      success: false,
      message: "Okutulan hedef lokasyon seçilen hedef depoda bulunamadı.",
    };
  }

  const targetLocationId = targetLocation.id;

  try {
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

    const quantity = Number(formData.get("quantity"));
    const targetHandlingUnitBarcode = textValue(formData, "targetHandlingUnitBarcode");

    if (!productBarcode || !targetHandlingUnitBarcode) {
      throw new Error("Ürün barkodu ve hedef THM barkodu zorunludur.");
    }

    const product = await tx.product.findFirst({
      where: {
        tenantId: context.tenantId,
        companyId: context.companyId,
        isActive: true,
        OR: [
          { barcode: productBarcode },
          { code: productBarcode },
          { productBarcodes: { some: { barcode: productBarcode } } },
        ],
      },
      select: { id: true },
    });

    if (!product) {
      throw new Error("Okutulan ürün barkodu bulunamadı.");
    }

    const productId = product.id;

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
  } catch (error) {
    console.error("RF depolararası transfer hatası:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        success: false,
        message: "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen tekrar deneyin.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Depolararası transfer sırasında beklenmeyen bir hata oluştu.",
    };
  }

  revalidatePath("/rf/warehouse-transfer/product");
  revalidatePath("/rf/warehouse-transfer/thm");
  revalidatePath("/admin/stock/movements");
  revalidatePath("/admin/stock/thm-movements");

  return {
    success: true,
    message:
      mode === "FULL_HU"
        ? "THM depolararası transferi başarıyla tamamlandı."
        : "Ürün depolararası transferi başarıyla tamamlandı.",
  };
}
