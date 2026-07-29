import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  CreateStockMovementInput,
  StockMovementResult,
} from "./stock-types";

import {
  calculateStockBalances,
  validateCalculatedBalances,
  validateStockChanges,
} from "./stock-utils";

type DatabaseClient =
  | PrismaClient
  | Prisma.TransactionClient;

function normalizeOptionalText(
  value: string | null | undefined
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

async function validateOrderReference({
  db,
  orderId,
}: {
  db: DatabaseClient;
  orderId: number | null;
}) {
  if (orderId === null) {
    return;
  }

  const order =
    await db.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
      },
    });

  if (!order) {
    throw new Error(
      "Stok hareketine bağlanacak satış siparişi bulunamadı."
    );
  }
}

async function validatePurchaseOrderReference({
  db,
  purchaseOrderId,
}: {
  db: DatabaseClient;
  purchaseOrderId: number | null;
}) {
  if (
    purchaseOrderId === null
  ) {
    return;
  }

  const purchaseOrder =
    await db.purchaseOrder
      .findUnique({
        where: {
          id: purchaseOrderId,
        },
        select: {
          id: true,
        },
      });

  if (!purchaseOrder) {
    throw new Error(
      "Stok hareketine bağlanacak satın alma siparişi bulunamadı."
    );
  }
}

async function resolveWarehouse({
  db,
  tenantId,
  companyId,
  warehouseId,
}: {
  db: DatabaseClient;
  tenantId: string;
  companyId: string;
  warehouseId:
    | number
    | undefined;
}) {
  if (
    warehouseId !==
      undefined &&
    (
      !Number.isInteger(
        warehouseId
      ) ||
      warehouseId <= 0
    )
  ) {
    throw new Error(
      "Geçerli bir depo kimliği gereklidir."
    );
  }

  const warehouse =
    await db.warehouse.findFirst({
      where: {
        ...(warehouseId !==
        undefined
          ? {
              id: warehouseId,
            }
          : {}),
        tenantId,
        companyId,
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        tenantId: true,
        companyId: true,
      },
    });

  if (!warehouse) {
    throw new Error(
      warehouseId === undefined
        ? "Stok sahibi şirket için aktif depo bulunamadı."
        : "Seçilen depo aktif şirkete ait değil veya kullanıma kapalı."
    );
  }

  return warehouse;
}

export async function createStockMovementWithTransaction(
  db: Prisma.TransactionClient,
  input: CreateStockMovementInput
): Promise<StockMovementResult> {
  const physicalChange =
    input.physicalChange ?? 0;

  const reservedChange =
    input.reservedChange ?? 0;

  const orderId =
    input.orderId ?? null;

  const purchaseOrderId =
    input.purchaseOrderId ??
    null;

  const changesValidation =
    validateStockChanges({
      physicalChange,
      reservedChange,
    });

  if (
    !changesValidation.success
  ) {
    throw new Error(
      changesValidation.message
    );
  }

  if (
    !Number.isInteger(
      input.productId
    ) ||
    input.productId <= 0
  ) {
    throw new Error(
      "Geçerli bir ürün kimliği gereklidir."
    );
  }

  if (
    orderId !== null &&
    (
      !Number.isInteger(
        orderId
      ) ||
      orderId <= 0
    )
  ) {
    throw new Error(
      "Geçerli bir satış siparişi kimliği gereklidir."
    );
  }

  if (
    purchaseOrderId !== null &&
    (
      !Number.isInteger(
        purchaseOrderId
      ) ||
      purchaseOrderId <= 0
    )
  ) {
    throw new Error(
      "Geçerli bir satın alma siparişi kimliği gereklidir."
    );
  }

  if (
    orderId !== null &&
    purchaseOrderId !== null
  ) {
    throw new Error(
      "Bir stok hareketi aynı anda hem satış hem satın alma siparişine bağlanamaz."
    );
  }

  const product =
    await db.product.findUnique({
      where: {
        id: input.productId,
      },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        code: true,
        name: true,
        stock: true,
        reservedStock: true,
        isActive: true,
      },
    });

  if (!product) {
    throw new Error(
      "Stok hareketi oluşturulacak ürün bulunamadı."
    );
  }

  if (!product.isActive) {
    throw new Error(
      `${product.code} - ${product.name} ürünü pasif durumda.`
    );
  }

  const tenantId =
    input.tenantId ??
    product.tenantId;

  const companyId =
    input.companyId ??
    product.companyId;

  if (
    product.tenantId !==
      tenantId ||
    product.companyId !==
      companyId
  ) {
    throw new Error(
      "Ürün aktif stok sahibi şirkete ait değil."
    );
  }

  const warehouse =
    await resolveWarehouse({
      db,
      tenantId,
      companyId,
      warehouseId:
        input.warehouseId,
    });

  await validateOrderReference({
    db,
    orderId,
  });

  await validatePurchaseOrderReference({
    db,
    purchaseOrderId,
  });

  const warehouseStock =
    await db.warehouseProductStock
      .findUnique({
        where: {
          warehouse_product_stock_unique:
            {
              warehouseId:
                warehouse.id,
              productId:
                product.id,
            },
        },
        select: {
          id: true,
          physicalStock: true,
          reservedStock: true,
        },
      });

  const warehouseBalances =
    calculateStockBalances({
      currentPhysicalStock:
        warehouseStock
          ?.physicalStock ?? 0,
      currentReservedStock:
        warehouseStock
          ?.reservedStock ?? 0,
      physicalChange,
      reservedChange,
    });

  const warehouseValidation =
    validateCalculatedBalances(
      warehouseBalances.after
    );

  if (
    !warehouseValidation.success
  ) {
    throw new Error(
      `${product.code} - ${product.name} / ${warehouse.code}: ` +
        warehouseValidation.message
    );
  }

  const aggregateBalances =
    calculateStockBalances({
      currentPhysicalStock:
        product.stock,
      currentReservedStock:
        product.reservedStock,
      physicalChange,
      reservedChange,
    });

  const aggregateValidation =
    validateCalculatedBalances(
      aggregateBalances.after
    );

  if (
    !aggregateValidation.success
  ) {
    throw new Error(
      `${product.code} - ${product.name}: ` +
        aggregateValidation.message
    );
  }

  await db.product.update({
    where: {
      id: product.id,
    },
    data: {
      stock:
        aggregateBalances.after
          .physicalStock,
      reservedStock:
        aggregateBalances.after
          .reservedStock,
    },
  });

  await db.warehouseProductStock
    .upsert({
      where: {
        warehouse_product_stock_unique:
          {
            warehouseId:
              warehouse.id,
            productId:
              product.id,
          },
      },
      update: {
        tenantId,
        companyId,
        physicalStock:
          warehouseBalances.after
            .physicalStock,
        reservedStock:
          warehouseBalances.after
            .reservedStock,
      },
      create: {
        tenantId,
        companyId,
        warehouseId:
          warehouse.id,
        productId:
          product.id,
        physicalStock:
          warehouseBalances.after
            .physicalStock,
        reservedStock:
          warehouseBalances.after
            .reservedStock,
      },
    });

  const movement =
    await db.stockMovement.create({
      data: {
        tenantId,
        companyId,
        warehouseId:
          warehouse.id,
        productId:
          product.id,
        orderId,
        purchaseOrderId,
        movementType:
          input.movementType,
        physicalChange,
        reservedChange,
        physicalBalanceAfter:
          warehouseBalances.after
            .physicalStock,
        reservedBalanceAfter:
          warehouseBalances.after
            .reservedStock,
        availableBalanceAfter:
          warehouseBalances.after
            .availableStock,
        documentNumber:
          normalizeOptionalText(
            input.documentNumber
          ),
        description:
          normalizeOptionalText(
            input.description
          ),
      },
    });

  return {
    movement,
    balances:
      warehouseBalances,
  };
}

export async function createStockMovement(
  input: CreateStockMovementInput
): Promise<StockMovementResult> {
  return prisma.$transaction(
    async (tx) =>
      createStockMovementWithTransaction(
        tx,
        input
      )
  );
}

export async function createManyStockMovements(
  inputs: CreateStockMovementInput[]
): Promise<StockMovementResult[]> {
  if (inputs.length === 0) {
    throw new Error(
      "Oluşturulacak stok hareketi bulunamadı."
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const results:
        StockMovementResult[] = [];

      for (const input of inputs) {
        results.push(
          await createStockMovementWithTransaction(
            tx,
            input
          )
        );
      }

      return results;
    }
  );
}
