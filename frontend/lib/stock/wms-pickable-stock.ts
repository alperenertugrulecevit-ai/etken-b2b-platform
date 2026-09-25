import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

type DatabaseClient =
  | PrismaClient
  | Prisma.TransactionClient;

export type WmsPickableWarehouseStock = {
  warehouseId: number;
  warehouseCode: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
};

export type WmsPickableStock = {
  productId: number;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  warehouses: WmsPickableWarehouseStock[];
};

export async function getWmsPickableStock(
  db: DatabaseClient,
  {
    tenantId,
    companyId,
    productId,
  }: {
    tenantId: string;
    companyId: string;
    productId: number;
  },
): Promise<WmsPickableStock> {
  const items =
    await db.handlingUnitItem.findMany({
      where: {
        productId,
        quantity: {
          gt: 0,
        },

        handlingUnit: {
          tenantId,
          companyId,

          purpose:
            HandlingUnitPurpose.STOCK,

          status: {
            in: [
              HandlingUnitStatus.OPEN,
              HandlingUnitStatus.CLOSED,
              HandlingUnitStatus.STORED,
            ],
          },

          warehouseId: {
            not: null,
          },

          locationId: {
            not: null,
          },

          warehouse: {
            isActive: true,
            code: {
              not: "KYP001",
            },
          },

          location: {
            isActive: true,
          },

          assignedOrderId: null,
          assignedWaveId: null,
        },
      },

      select: {
        quantity: true,
        reservedStock: true,

        handlingUnit: {
          select: {
            warehouseId: true,

            warehouse: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

  const warehouseMap =
    new Map<
      number,
      WmsPickableWarehouseStock
    >();

  for (const item of items) {
    const warehouseId =
      item.handlingUnit.warehouseId;

    const warehouse =
      item.handlingUnit.warehouse;

    if (
      warehouseId === null ||
      !warehouse
    ) {
      continue;
    }

    const current =
      warehouseMap.get(
        warehouseId
      ) ?? {
        warehouseId,
        warehouseCode:
          warehouse.code,
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
      };

    current.physicalQuantity +=
      item.quantity;

    current.reservedQuantity +=
      item.reservedStock;

    current.availableQuantity +=
      Math.max(
        0,
        item.quantity -
          item.reservedStock,
      );

    warehouseMap.set(
      warehouseId,
      current
    );
  }

  const warehouses =
    Array.from(
      warehouseMap.values()
    ).sort(
      (a, b) =>
        b.availableQuantity -
          a.availableQuantity ||
        a.warehouseId -
          b.warehouseId
    );

  return {
    productId,

    physicalQuantity:
      warehouses.reduce(
        (sum, warehouse) =>
          sum +
          warehouse.physicalQuantity,
        0
      ),

    reservedQuantity:
      warehouses.reduce(
        (sum, warehouse) =>
          sum +
          warehouse.reservedQuantity,
        0
      ),

    availableQuantity:
      warehouses.reduce(
        (sum, warehouse) =>
          sum +
          warehouse.availableQuantity,
        0
      ),

    warehouses,
  };
}
