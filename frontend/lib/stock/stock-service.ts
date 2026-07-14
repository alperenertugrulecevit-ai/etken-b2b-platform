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
  const normalizedValue = value?.trim();

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

  const order = await db.order.findUnique({
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
  if (purchaseOrderId === null) {
    return;
  }

  const purchaseOrder =
    await db.purchaseOrder.findUnique({
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
    input.purchaseOrderId ?? null;

  const changesValidation =
    validateStockChanges({
      physicalChange,
      reservedChange,
    });

  if (!changesValidation.success) {
    throw new Error(
      changesValidation.message
    );
  }

  if (
    !Number.isInteger(input.productId) ||
    input.productId <= 0
  ) {
    throw new Error(
      "Geçerli bir ürün kimliği gereklidir."
    );
  }

  if (
    orderId !== null &&
    (
      !Number.isInteger(orderId) ||
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
      !Number.isInteger(purchaseOrderId) ||
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
        code: true,
        name: true,
        stock: true,
        reservedStock: true,
      },
    });

  if (!product) {
    throw new Error(
      "Stok hareketi oluşturulacak ürün bulunamadı."
    );
  }

  await validateOrderReference({
    db,
    orderId,
  });

  await validatePurchaseOrderReference({
    db,
    purchaseOrderId,
  });

  const balances =
    calculateStockBalances({
      currentPhysicalStock:
        product.stock,

      currentReservedStock:
        product.reservedStock,

      physicalChange,
      reservedChange,
    });

  const balancesValidation =
    validateCalculatedBalances(
      balances.after
    );

  if (!balancesValidation.success) {
    throw new Error(
      `${product.code} - ${product.name}: ` +
        balancesValidation.message
    );
  }

  await db.product.update({
    where: {
      id: product.id,
    },

    data: {
      stock:
        balances.after.physicalStock,

      reservedStock:
        balances.after.reservedStock,
    },
  });

  const movement =
    await db.stockMovement.create({
      data: {
        productId:
          product.id,

        orderId,

        purchaseOrderId,

        movementType:
          input.movementType,

        physicalChange,

        reservedChange,

        physicalBalanceAfter:
          balances.after.physicalStock,

        reservedBalanceAfter:
          balances.after.reservedStock,

        availableBalanceAfter:
          balances.after.availableStock,

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
    balances,
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