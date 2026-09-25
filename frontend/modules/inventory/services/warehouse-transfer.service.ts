import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  Prisma,
  StockMovementType,
  WarehouseTransferType,
  WmsOperationType,
} from "@prisma/client";

const LOST_WAREHOUSE_CODE = "KYP001";
const LOST_LOCATION_CODE = "KY-01-01-01";

type Tx = Prisma.TransactionClient;

type Actor = {
  operatorId?: string | null;
  operatorName?: string | null;
  terminalCode?: string | null;
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

function transferNo(prefix = "TRF") {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${prefix}-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function warehouseBalance(tx: Tx, warehouseId: number, productId: number) {
  const row = await tx.warehouseProductStock.findUnique({
    where: { warehouse_product_stock_unique: { warehouseId, productId } },
    select: { physicalStock: true, reservedStock: true },
  });
  return {
    physical: row?.physicalStock ?? 0,
    reserved: row?.reservedStock ?? 0,
  };
}

async function moveWarehouseStock(
  tx: Tx,
  args: {
    productId: number;
    quantity: number;
    sourceWarehouseId: number;
    targetWarehouseId: number;
    tenantId: string;
    companyId: string;
  },
) {
  const { productId, quantity, sourceWarehouseId, targetWarehouseId, tenantId, companyId } = args;
  const source = await warehouseBalance(tx, sourceWarehouseId, productId);
  if (source.physical < quantity) throw new Error("Kaynak depo fiziksel stoğu transfer miktarından az.");

  await tx.warehouseProductStock.update({
    where: { warehouse_product_stock_unique: { warehouseId: sourceWarehouseId, productId } },
    data: { physicalStock: { decrement: quantity } },
  });
  await tx.warehouseProductStock.upsert({
    where: { warehouse_product_stock_unique: { warehouseId: targetWarehouseId, productId } },
    update: { physicalStock: { increment: quantity } },
    create: { tenantId, companyId, warehouseId: targetWarehouseId, productId, physicalStock: quantity, reservedStock: 0 },
  });
}

async function moveLocationStock(
  tx: Tx,
  args: { productId: number; quantity: number; sourceLocationId: number; targetLocationId: number },
) {
  const source = await tx.warehouseLocationStock.findUnique({
    where: { location_product_unique: { locationId: args.sourceLocationId, productId: args.productId } },
  });
  if (!source || source.quantity < args.quantity) throw new Error("Kaynak lokasyon stoğu transfer miktarından az.");
  if (source.reservedStock > source.quantity - args.quantity) throw new Error("Transfer sonrası kaynak lokasyonda rezervasyon karşılanamıyor.");

  await tx.warehouseLocationStock.update({
    where: { location_product_unique: { locationId: args.sourceLocationId, productId: args.productId } },
    data: { quantity: { decrement: args.quantity } },
  });
  await tx.warehouseLocationStock.upsert({
    where: { location_product_unique: { locationId: args.targetLocationId, productId: args.productId } },
    update: { quantity: { increment: args.quantity } },
    create: { locationId: args.targetLocationId, productId: args.productId, quantity: args.quantity, reservedStock: 0 },
  });
}

async function writeStockPair(
  tx: Tx,
  args: {
    productId: number; quantity: number; documentNumber: string;
    sourceWarehouseId: number; targetWarehouseId: number;
    tenantId: string; companyId: string; description: string;
    lost?: boolean;
  },
) {
  const source = await warehouseBalance(tx, args.sourceWarehouseId, args.productId);
  const target = await warehouseBalance(tx, args.targetWarehouseId, args.productId);
  await tx.stockMovement.createMany({
    data: [
      {
        tenantId: args.tenantId, companyId: args.companyId, warehouseId: args.sourceWarehouseId,
        productId: args.productId,
        movementType: args.lost ? StockMovementType.LOST_STOCK_OUT : StockMovementType.TRANSFER_OUT,
        physicalChange: -args.quantity, reservedChange: 0,
        physicalBalanceAfter: source.physical, reservedBalanceAfter: source.reserved,
        availableBalanceAfter: Math.max(0, source.physical - source.reserved),
        documentNumber: args.documentNumber, description: args.description,
      },
      {
        tenantId: args.tenantId, companyId: args.companyId, warehouseId: args.targetWarehouseId,
        productId: args.productId,
        movementType: args.lost ? StockMovementType.LOST_STOCK_IN : StockMovementType.TRANSFER_IN,
        physicalChange: args.quantity, reservedChange: 0,
        physicalBalanceAfter: target.physical, reservedBalanceAfter: target.reserved,
        availableBalanceAfter: Math.max(0, target.physical - target.reserved),
        documentNumber: args.documentNumber, description: args.description,
      },
    ],
  });
}

async function loadTransferContext(tx: Tx, sourceBarcode: string, targetWarehouseId: number, targetLocationId: number) {
  const [source, targetWarehouse, targetLocation] = await Promise.all([
    tx.handlingUnit.findUnique({
      where: { barcode: sourceBarcode.trim().toUpperCase() },
      include: { warehouse: true, location: true, items: { include: { product: true } } },
    }),
    tx.warehouse.findUnique({ where: { id: targetWarehouseId } }),
    tx.warehouseLocation.findUnique({ where: { id: targetLocationId } }),
  ]);
  if (!source || !source.warehouse || !source.location || !source.warehouseId || !source.locationId)
    throw new Error("Kaynak THM aktif bir depo/lokasyona adresli değil.");
  if (!source.warehouse.isActive || !source.location.isActive) throw new Error("Kaynak depo veya lokasyon pasif.");
  if (!targetWarehouse?.isActive) throw new Error("Hedef depo bulunamadı veya pasif.");
  if (!targetLocation?.isActive || targetLocation.warehouseId !== targetWarehouse.id)
    throw new Error("Hedef lokasyon seçilen depoya ait değil veya pasif.");
  if (source.warehouseId === targetWarehouse.id) throw new Error("Depolar arası transferde kaynak ve hedef depo aynı olamaz.");
  return {
    source: { ...source, warehouse: source.warehouse, location: source.location, warehouseId: source.warehouseId, locationId: source.locationId },
    targetWarehouse,
    targetLocation,
  } as const;
}

export class WarehouseTransferService {
  static async transferProduct(
    tx: Tx,
    input: {
      sourceHandlingUnitBarcode: string;
      targetHandlingUnitBarcode: string;
      productId: number;
      quantity: number;
      targetWarehouseId: number;
      targetLocationId: number;
      actor?: Actor;
    },
  ) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Transfer miktarı pozitif tam sayı olmalıdır.");
    const { source, targetWarehouse, targetLocation } = await loadTransferContext(
      tx, input.sourceHandlingUnitBarcode, input.targetWarehouseId, input.targetLocationId,
    );
    const target = await tx.handlingUnit.findUnique({
      where: { barcode: input.targetHandlingUnitBarcode.trim().toUpperCase() },
      include: { warehouse: true, location: true },
    });
    if (!target || target.warehouseId !== targetWarehouse.id || target.locationId !== targetLocation.id)
      throw new Error("Hedef THM seçilen hedef depo/lokasyonda değil.");
    if (target.purpose !== HandlingUnitPurpose.STOCK) throw new Error("Hedef THM normal stok THM'si olmalıdır.");

    const item = source.items.find((x) => x.productId === input.productId);
    if (!item) throw new Error("Ürün kaynak THM içinde bulunamadı.");
    const available = item.quantity - item.reservedStock;
    if (input.quantity > available) throw new Error(`Transfer miktarı kullanılabilir stoktan fazla. Kullanılabilir: ${available}.`);

    const doc = transferNo();
    const sourceLoc = fullLocationCode(source.location);
    const targetLoc = fullLocationCode(targetLocation);

    await moveWarehouseStock(tx, {
      productId: item.productId, quantity: input.quantity,
      sourceWarehouseId: source.warehouseId!, targetWarehouseId: targetWarehouse.id,
      tenantId: source.tenantId, companyId: source.companyId,
    });
    await moveLocationStock(tx, {
      productId: item.productId, quantity: input.quantity,
      sourceLocationId: source.locationId!, targetLocationId: targetLocation.id,
    });

    const sourceAfter = item.quantity - input.quantity;
    if (sourceAfter === 0 && item.reservedStock === 0) {
      await tx.handlingUnitItem.delete({ where: { id: item.id } });
    } else {
      await tx.handlingUnitItem.update({ where: { id: item.id }, data: { quantity: sourceAfter } });
    }
    await tx.handlingUnitItem.upsert({
      where: { handling_unit_product_unique: { handlingUnitId: target.id, productId: item.productId } },
      update: { quantity: { increment: input.quantity } },
      create: { handlingUnitId: target.id, productId: item.productId, quantity: input.quantity, reservedStock: 0 },
    });

    const transfer = await tx.warehouseTransfer.create({
      data: {
        transferNumber: doc, transferType: WarehouseTransferType.PRODUCT,
        tenantId: source.tenantId, companyId: source.companyId,
        sourceWarehouseId: source.warehouseId!, sourceWarehouseCode: source.warehouse.code,
        targetWarehouseId: targetWarehouse.id, targetWarehouseCode: targetWarehouse.code,
        sourceHandlingUnitId: source.id, sourceHandlingUnitBarcode: source.barcode,
        targetHandlingUnitId: target.id, targetHandlingUnitBarcode: target.barcode,
        operatorId: input.actor?.operatorId, operatorName: input.actor?.operatorName,
        terminalCode: input.actor?.terminalCode, completedAt: new Date(),
        lines: { create: {
          productId: item.productId, productCode: item.product.code, productName: item.product.name,
          quantity: input.quantity, sourceLocationId: source.locationId, sourceLocationCode: sourceLoc,
          sourceHandlingUnitId: source.id, sourceHandlingUnitBarcode: source.barcode,
          targetLocationId: targetLocation.id, targetLocationCode: targetLoc,
          targetHandlingUnitId: target.id, targetHandlingUnitBarcode: target.barcode,
        }},
      },
    });

    await writeStockPair(tx, {
      productId: item.productId, quantity: input.quantity, documentNumber: doc,
      sourceWarehouseId: source.warehouseId!, targetWarehouseId: targetWarehouse.id,
      tenantId: source.tenantId, companyId: source.companyId,
      description: `${source.warehouse.code} → ${targetWarehouse.code} ürün bazlı transfer.`,
    });
    await tx.wmsOperationLog.create({
      data: {
        operationType: WmsOperationType.WAREHOUSE_TRANSFER, module: "WAREHOUSE_TRANSFER",
        entityType: "WAREHOUSE_TRANSFER", barcode: doc,
        sourceBarcode: source.barcode, targetBarcode: target.barcode,
        productId: item.productId, productCode: item.product.code, productName: item.product.name,
        quantity: input.quantity, warehouseId: source.warehouseId, warehouseCode: source.warehouse.code,
        sourceLocationId: source.locationId, sourceLocationCode: sourceLoc,
        targetLocationId: targetLocation.id, targetLocationCode: targetLoc,
        operatorId: input.actor?.operatorId, operatorName: input.actor?.operatorName,
        terminalCode: input.actor?.terminalCode,
        description: `Ürün bazlı depolar arası transfer: ${source.warehouse.code} → ${targetWarehouse.code}.`,
        metadata: { transferNumber: doc, transferType: "PRODUCT", targetWarehouseId: targetWarehouse.id, targetWarehouseCode: targetWarehouse.code },
      },
    });
    return transfer;
  }

  static async transferFullHandlingUnit(
    tx: Tx,
    input: { sourceHandlingUnitBarcode: string; targetWarehouseId: number; targetLocationId: number; actor?: Actor },
  ) {
    const { source, targetWarehouse, targetLocation } = await loadTransferContext(
      tx, input.sourceHandlingUnitBarcode, input.targetWarehouseId, input.targetLocationId,
    );
    if (source.items.length === 0) throw new Error("Kaynak THM boş.");
    if (source.items.some((item) => item.reservedStock > 0))
      throw new Error("Bu THM üzerinde aktif rezervasyon bulunmaktadır. Komple THM transferi yapılamaz.");

    const doc = transferNo();
    const sourceLoc = fullLocationCode(source.location);
    const targetLoc = fullLocationCode(targetLocation);

    for (const item of source.items) {
      await moveWarehouseStock(tx, {
        productId: item.productId, quantity: item.quantity,
        sourceWarehouseId: source.warehouseId!, targetWarehouseId: targetWarehouse.id,
        tenantId: source.tenantId, companyId: source.companyId,
      });
      await moveLocationStock(tx, {
        productId: item.productId, quantity: item.quantity,
        sourceLocationId: source.locationId!, targetLocationId: targetLocation.id,
      });
      await writeStockPair(tx, {
        productId: item.productId, quantity: item.quantity, documentNumber: doc,
        sourceWarehouseId: source.warehouseId!, targetWarehouseId: targetWarehouse.id,
        tenantId: source.tenantId, companyId: source.companyId,
        description: `${source.barcode} komple THM transferi: ${source.warehouse.code} → ${targetWarehouse.code}.`,
      });
    }

    await tx.handlingUnit.update({
      where: { id: source.id },
      data: { warehouseId: targetWarehouse.id, locationId: targetLocation.id, status: HandlingUnitStatus.STORED },
    });

    const transfer = await tx.warehouseTransfer.create({
      data: {
        transferNumber: doc, transferType: WarehouseTransferType.FULL_HU,
        tenantId: source.tenantId, companyId: source.companyId,
        sourceWarehouseId: source.warehouseId!, sourceWarehouseCode: source.warehouse.code,
        targetWarehouseId: targetWarehouse.id, targetWarehouseCode: targetWarehouse.code,
        sourceHandlingUnitId: source.id, sourceHandlingUnitBarcode: source.barcode,
        targetHandlingUnitId: source.id, targetHandlingUnitBarcode: source.barcode,
        operatorId: input.actor?.operatorId, operatorName: input.actor?.operatorName,
        terminalCode: input.actor?.terminalCode, completedAt: new Date(),
        lines: { create: source.items.map((item) => ({
          productId: item.productId, productCode: item.product.code, productName: item.product.name,
          quantity: item.quantity, sourceLocationId: source.locationId, sourceLocationCode: sourceLoc,
          sourceHandlingUnitId: source.id, sourceHandlingUnitBarcode: source.barcode,
          targetLocationId: targetLocation.id, targetLocationCode: targetLoc,
          targetHandlingUnitId: source.id, targetHandlingUnitBarcode: source.barcode,
        })) },
      },
    });

    await tx.wmsOperationLog.create({
      data: {
        operationType: WmsOperationType.WAREHOUSE_TRANSFER, module: "WAREHOUSE_TRANSFER",
        entityType: "HANDLING_UNIT", entityId: source.id, barcode: source.barcode,
        sourceBarcode: source.barcode, targetBarcode: source.barcode,
        quantity: source.items.reduce((n, item) => n + item.quantity, 0),
        warehouseId: source.warehouseId, warehouseCode: source.warehouse.code,
        sourceLocationId: source.locationId, sourceLocationCode: sourceLoc,
        targetLocationId: targetLocation.id, targetLocationCode: targetLoc,
        operatorId: input.actor?.operatorId, operatorName: input.actor?.operatorName,
        terminalCode: input.actor?.terminalCode,
        description: `Komple THM depolar arası transfer: ${source.warehouse.code} → ${targetWarehouse.code}.`,
        metadata: { transferNumber: doc, transferType: "FULL_HU", targetWarehouseId: targetWarehouse.id, targetWarehouseCode: targetWarehouse.code },
      },
    });
    return transfer;
  }

  static async markProductLost(
    tx: Tx,
    input: {
      sourceHandlingUnitBarcode: string;
      productId: number;
      orderId?: number | null;
      orderItemId?: number | null;
      actor?: Actor;
    },
  ) {
    const lostWarehouse = await tx.warehouse.findUnique({ where: { code: LOST_WAREHOUSE_CODE } });
    if (!lostWarehouse?.isActive) throw new Error(`${LOST_WAREHOUSE_CODE} kayıp deposu bulunamadı veya pasif.`);
    const locations = await tx.warehouseLocation.findMany({
      where: { warehouseId: lostWarehouse.id, isActive: true },
    });
    const lostLocation = locations.find((x) => fullLocationCode(x) === LOST_LOCATION_CODE);
    if (!lostLocation) throw new Error(`${LOST_LOCATION_CODE} kayıp lokasyonu bulunamadı veya pasif.`);

    const source = await tx.handlingUnit.findUnique({
      where: { barcode: input.sourceHandlingUnitBarcode.trim().toUpperCase() },
      include: { warehouse: true, location: true, items: { include: { product: true } } },
    });
    if (!source?.warehouse || !source.location || !source.warehouseId || !source.locationId)
      throw new Error("Kaynak THM depo/lokasyona adresli değil.");
    if (source.warehouse.code === LOST_WAREHOUSE_CODE) throw new Error("Ürün zaten kayıp depoda.");
    const item = source.items.find((x) => x.productId === input.productId);
    if (!item || item.quantity <= 0) throw new Error("Kayıp işaretlenecek ürün kaynak THM içinde yok.");

    // İş kuralı: sipariş miktarı değil, bu THM'deki ilgili SKU'nun TÜM fiziksel miktarı kayıp olur.
    const quantity = item.quantity;
    const doc = transferNo("KYP");
    const sourceLoc = fullLocationCode(source.location);

    // Kayıp ürün fiziksel toplamdan silinmez; KYP001'e yeniden sınıflandırılır.
    await moveWarehouseStock(tx, {
      productId: item.productId, quantity,
      sourceWarehouseId: source.warehouseId, targetWarehouseId: lostWarehouse.id,
      tenantId: source.tenantId, companyId: source.companyId,
    });

    // Kayıp olayında bu SKU'nun kaynak rezervasyonu serbest bırakılır.
    const reservedToRelease = item.reservedStock;
    if (reservedToRelease > 0) {
      await tx.warehouseProductStock.update({
        where: { warehouse_product_stock_unique: { warehouseId: source.warehouseId, productId: item.productId } },
        data: { reservedStock: { decrement: reservedToRelease } },
      });
      await tx.warehouseLocationStock.update({
        where: { location_product_unique: { locationId: source.locationId, productId: item.productId } },
        data: { reservedStock: { decrement: reservedToRelease } },
      });
    }

    await moveLocationStock(tx, {
      productId: item.productId, quantity,
      sourceLocationId: source.locationId, targetLocationId: lostLocation.id,
    });
    await tx.handlingUnitItem.delete({ where: { id: item.id } });

    const lostHuBarcode = `KYP-${item.product.code}`;
    const lostHu = await tx.handlingUnit.upsert({
      where: { barcode: lostHuBarcode },
      update: { warehouseId: lostWarehouse.id, locationId: lostLocation.id, status: HandlingUnitStatus.STORED },
      create: {
        tenantId: source.tenantId, companyId: source.companyId, barcode: lostHuBarcode,
        unitType: source.unitType, purpose: HandlingUnitPurpose.STOCK, status: HandlingUnitStatus.STORED,
        warehouseId: lostWarehouse.id, locationId: lostLocation.id,
      },
    });
    await tx.handlingUnitItem.upsert({
      where: { handling_unit_product_unique: { handlingUnitId: lostHu.id, productId: item.productId } },
      update: { quantity: { increment: quantity } },
      create: { handlingUnitId: lostHu.id, productId: item.productId, quantity, reservedStock: 0 },
    });

    const sourceRemaining = await tx.handlingUnitItem.count({ where: { handlingUnitId: source.id, quantity: { gt: 0 } } });
    if (sourceRemaining === 0) {
      await tx.handlingUnit.update({ where: { id: source.id }, data: { status: HandlingUnitStatus.EMPTY } });
    }

    await writeStockPair(tx, {
      productId: item.productId, quantity, documentNumber: doc,
      sourceWarehouseId: source.warehouseId, targetWarehouseId: lostWarehouse.id,
      tenantId: source.tenantId, companyId: source.companyId,
      description: `${item.product.code} kayıp stok kaydı.`, lost: true,
    });

    const record = await tx.lostStockRecord.create({
      data: {
        tenantId: source.tenantId, companyId: source.companyId,
        productId: item.productId, productCode: item.product.code, productName: item.product.name, quantity,
        sourceWarehouseId: source.warehouseId, sourceWarehouseCode: source.warehouse.code,
        sourceLocationId: source.locationId, sourceLocationCode: sourceLoc,
        sourceHandlingUnitId: source.id, sourceHandlingUnitBarcode: source.barcode,
        lostWarehouseId: lostWarehouse.id, lostWarehouseCode: lostWarehouse.code,
        lostLocationId: lostLocation.id, lostLocationCode: LOST_LOCATION_CODE,
        lostHandlingUnitId: lostHu.id, lostHandlingUnitBarcode: lostHu.barcode,
        orderId: input.orderId, orderItemId: input.orderItemId,
        operatorId: input.actor?.operatorId, operatorName: input.actor?.operatorName,
        terminalCode: input.actor?.terminalCode, stockMovementDocumentNo: doc,
      },
    });

    await tx.wmsOperationLog.create({
      data: {
        operationType: WmsOperationType.LOST_STOCK, module: "RF_PICKING",
        entityType: "LOST_STOCK_RECORD", barcode: doc,
        sourceBarcode: source.barcode, targetBarcode: lostHu.barcode,
        orderId: input.orderId, productId: item.productId, productCode: item.product.code,
        productName: item.product.name, quantity, warehouseId: source.warehouseId,
        warehouseCode: source.warehouse.code, sourceLocationId: source.locationId,
        sourceLocationCode: sourceLoc, targetLocationId: lostLocation.id,
        targetLocationCode: LOST_LOCATION_CODE, operatorId: input.actor?.operatorId,
        operatorName: input.actor?.operatorName, terminalCode: input.actor?.terminalCode,
        description: `${item.product.code} ürününün kaynak THM'deki ${quantity} adetlik tüm stoğu kayıp depoya alındı.`,
        metadata: {
          lostStockRecordId: record.id, documentNumber: doc, lostWarehouseCode: LOST_WAREHOUSE_CODE,
          sourceHandlingUnitId: source.id, lostHandlingUnitId: lostHu.id, releasedReservedQuantity: reservedToRelease,
        },
      },
    });
    return { record, quantity, lostHandlingUnitBarcode: lostHu.barcode };
  }
}
