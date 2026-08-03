import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateAvailableStock,
  calculateStockBalances,
  createStockBalances,
  validateCalculatedBalances,
  validateStockChanges,
} from "@/lib/stock/stock-utils";

describe("stock-utils", () => {
  it("kullanılabilir stoğu fiziksel stoktan rezervasyonu düşerek hesaplar", () => {
    expect(
      calculateAvailableStock(
        100,
        35
      )
    ).toBe(65);
  });

  it("stok bakiyelerini tek bir nesnede oluşturur", () => {
    expect(
      createStockBalances(
        80,
        20
      )
    ).toEqual({
      physicalStock: 80,
      reservedStock: 20,
      availableStock: 60,
    });
  });

  it("rezervasyon oluşturulduğunda önceki ve sonraki bakiyeleri hesaplar", () => {
    expect(
      calculateStockBalances({
        currentPhysicalStock: 50,
        currentReservedStock: 10,
        physicalChange: 0,
        reservedChange: 15,
      })
    ).toEqual({
      before: {
        physicalStock: 50,
        reservedStock: 10,
        availableStock: 40,
      },
      after: {
        physicalStock: 50,
        reservedStock: 25,
        availableStock: 25,
      },
    });
  });

  it("sevkiyatta fiziksel ve rezerve stoğu birlikte düşürür", () => {
    expect(
      calculateStockBalances({
        currentPhysicalStock: 50,
        currentReservedStock: 15,
        physicalChange: -15,
        reservedChange: -15,
      }).after
    ).toEqual({
      physicalStock: 35,
      reservedStock: 0,
      availableStock: 35,
    });
  });

  it("tam sayı olmayan stok değişimini reddeder", () => {
    expect(
      validateStockChanges({
        physicalChange: 1.5,
        reservedChange: 0,
      })
    ).toEqual({
      success: false,
      message:
        "Fiziksel stok değişimi tam sayı olmalıdır.",
    });
  });

  it("etkisiz stok hareketini reddeder", () => {
    expect(
      validateStockChanges({
        physicalChange: 0,
        reservedChange: 0,
      })
    ).toEqual({
      success: false,
      message:
        "Stok hareketinde en az bir değişim bulunmalıdır.",
    });
  });

  it("rezerve stok fiziksel stoktan büyükse işlemi reddeder", () => {
    expect(
      validateCalculatedBalances({
        physicalStock: 10,
        reservedStock: 11,
        availableStock: -1,
      })
    ).toEqual({
      success: false,
      message:
        "Rezerve stok fiziksel stoktan fazla olamaz.",
    });
  });

  it("geçerli stok bakiyesini kabul eder", () => {
    expect(
      validateCalculatedBalances({
        physicalStock: 40,
        reservedStock: 12,
        availableStock: 28,
      })
    ).toEqual({
      success: true,
    });
  });
});
