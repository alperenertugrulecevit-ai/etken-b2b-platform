import type {
  StockMovement,
  StockMovementType,
} from "@prisma/client";

export type CreateStockMovementInput = {
  productId: number;

  orderId?: number | null;

  purchaseOrderId?: number | null;

  movementType: StockMovementType;

  physicalChange?: number;

  reservedChange?: number;

  documentNumber?: string | null;

  description?: string | null;
};

export type StockBalances = {
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
};

export type CalculatedStockBalances = {
  before: StockBalances;
  after: StockBalances;
};

export type StockMovementResult = {
  movement: StockMovement;
  balances: CalculatedStockBalances;
};

export type StockValidationResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };