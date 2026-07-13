import type {
  CalculatedStockBalances,
  StockBalances,
  StockValidationResult,
} from "./stock-types";

export function calculateAvailableStock(
  physicalStock: number,
  reservedStock: number
) {
  return physicalStock - reservedStock;
}

export function createStockBalances(
  physicalStock: number,
  reservedStock: number
): StockBalances {
  return {
    physicalStock,
    reservedStock,

    availableStock: calculateAvailableStock(
      physicalStock,
      reservedStock
    ),
  };
}

export function calculateStockBalances({
  currentPhysicalStock,
  currentReservedStock,
  physicalChange,
  reservedChange,
}: {
  currentPhysicalStock: number;
  currentReservedStock: number;
  physicalChange: number;
  reservedChange: number;
}): CalculatedStockBalances {
  const before = createStockBalances(
    currentPhysicalStock,
    currentReservedStock
  );

  const afterPhysicalStock =
    currentPhysicalStock + physicalChange;

  const afterReservedStock =
    currentReservedStock + reservedChange;

  const after = createStockBalances(
    afterPhysicalStock,
    afterReservedStock
  );

  return {
    before,
    after,
  };
}

export function validateStockChanges({
  physicalChange,
  reservedChange,
}: {
  physicalChange: number;
  reservedChange: number;
}): StockValidationResult {
  if (!Number.isInteger(physicalChange)) {
    return {
      success: false,
      message:
        "Fiziksel stok değişimi tam sayı olmalıdır.",
    };
  }

  if (!Number.isInteger(reservedChange)) {
    return {
      success: false,
      message:
        "Rezerve stok değişimi tam sayı olmalıdır.",
    };
  }

  if (
    physicalChange === 0 &&
    reservedChange === 0
  ) {
    return {
      success: false,
      message:
        "Stok hareketinde en az bir değişim bulunmalıdır.",
    };
  }

  return {
    success: true,
  };
}

export function validateCalculatedBalances({
  physicalStock,
  reservedStock,
  availableStock,
}: StockBalances): StockValidationResult {
  if (physicalStock < 0) {
    return {
      success: false,
      message:
        "İşlem sonucunda fiziksel stok eksiye düşemez.",
    };
  }

  if (reservedStock < 0) {
    return {
      success: false,
      message:
        "İşlem sonucunda rezerve stok eksiye düşemez.",
    };
  }

  if (reservedStock > physicalStock) {
    return {
      success: false,
      message:
        "Rezerve stok fiziksel stoktan fazla olamaz.",
    };
  }

  if (availableStock < 0) {
    return {
      success: false,
      message:
        "İşlem sonucunda kullanılabilir stok eksiye düşemez.",
    };
  }

  return {
    success: true,
  };
}