import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  OrderStatus,
  StockMovementType,
} from "@prisma/client";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  updateOrderStatus,
} from "@/app/admin/orders/[id]/actions";

const mocks = vi.hoisted(
  () => ({
    requirePermission:
      vi.fn(),
    requireActiveContext:
      vi.fn(),
    getWmsPickableStock:
      vi.fn(),
    stockMovementFindMany:
      vi.fn(),
    transaction:
      vi.fn(),
    orderFindUnique:
      vi.fn(),
    orderUpdate:
      vi.fn(),
    accountFindFirst:
      vi.fn(),
    accountCreate:
      vi.fn(),
    stockMovement:
      vi.fn(),
    revalidatePath:
      vi.fn(),
    redirect:
      vi.fn(),
  })
);

const transactionClient = {
  order: {
    findUnique:
      mocks.orderFindUnique,
    update:
      mocks.orderUpdate,
  },
  customerAccountEntry: {
    findFirst:
      mocks.accountFindFirst,
    create:
      mocks.accountCreate,
  },
  stockMovement: {
    findMany:
      mocks.stockMovementFindMany,
  },
};

vi.mock(
  "@/modules/authorization/services/authorization.service",
  () => ({
    AuthorizationService: {
      requirePermission:
        mocks.requirePermission,
    },
  })
);

vi.mock(
  "@/modules/wms-context/services/wms-context.service",
  () => ({
    WmsContextService: {
      requireActiveContext:
        mocks.requireActiveContext,
    },
  })
);

vi.mock(
  "@/lib/stock/wms-pickable-stock",
  () => ({
    getWmsPickableStock:
      mocks.getWmsPickableStock,
  })
);

vi.mock(
  "@/lib/prisma",
  () => ({
    prisma: {
      $transaction:
        mocks.transaction,
    },
  })
);

vi.mock(
  "@/lib/stock/stock-service",
  () => ({
    createStockMovementWithTransaction:
      mocks.stockMovement,
  })
);

vi.mock(
  "next/cache",
  () => ({
    revalidatePath:
      mocks.revalidatePath,
  })
);

vi.mock(
  "next/navigation",
  () => ({
    redirect:
      mocks.redirect,
  })
);

function createOrder(
  overrides: Record<
    string,
    unknown
  > = {}
) {
  return {
    id: 501,
    orderNumber:
      "B2B20260803-TEST",
    customerId: 10,
    status:
      OrderStatus.PENDING,
    stockReserved: false,
    stockDeducted: false,
    stockReservedAt: null,
    stockDeductedAt: null,
    items: [
      {
        productId: 1,
        productCode: "URN001",
        productName:
          "Test Ürünü",
        quantity: 2,
        product: {
          ownStock: true,
        },
      },
    ],
    ...overrides,
  };
}

function createStatusForm(
  status: OrderStatus
) {
  const formData =
    new FormData();

  formData.set(
    "status",
    status
  );

  formData.set(
    "statusNote",
    "Otomatik test"
  );

  return formData;
}

describe(
  "updateOrderStatus",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mocks.requirePermission.mockResolvedValue({
        id: "admin-user",
        isAdminUser: true,
      });

      mocks.requireActiveContext.mockResolvedValue({
        tenantId: "tenant-test",
        companyId: "company-test",
        warehouseId: 1,
      });

      mocks.getWmsPickableStock.mockResolvedValue({
        productId: 1,
        physicalQuantity: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
        warehouses: [
          {
            warehouseId: 1,
            warehouseCode: "DP001",
            physicalQuantity: 10,
            reservedQuantity: 0,
            availableQuantity: 10,
          },
        ],
      });

      mocks.stockMovementFindMany.mockResolvedValue([
        {
          warehouseId: 1,
          reservedChange: 2,
        },
      ]);

      mocks.transaction.mockImplementation(
        async (
          callback: (
            tx: typeof transactionClient
          ) => Promise<unknown>
        ) =>
          callback(
            transactionClient
          )
      );

      mocks.orderUpdate.mockResolvedValue({
        id: 501,
      });

      mocks.accountCreate.mockResolvedValue({
        id: 900,
      });

      mocks.stockMovement.mockResolvedValue({
        movement: {},
        balances: {},
      });
    });

    it("sipariş onaylandığında stok rezervasyonu oluşturur", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder()
      );

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.APPROVED
        )
      );

      expect(
        mocks.stockMovement
      ).toHaveBeenCalledWith(
        transactionClient,
        expect.objectContaining({
          productId: 1,
          orderId: 501,
          movementType:
            StockMovementType.RESERVATION_CREATE,
          physicalChange: 0,
          reservedChange: 2,
        })
      );

      expect(
        mocks.orderUpdate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 501,
          },
          data:
            expect.objectContaining({
              status:
                OrderStatus.APPROVED,
              stockReserved: true,
            }),
        })
      );
    });

    it("sevkiyatta fiziksel stoğu ve rezervasyonu düşürür", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          status:
            OrderStatus.PREPARING,
          stockReserved: true,
        })
      );

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.SHIPPED
        )
      );

      expect(
        mocks.stockMovement
      ).toHaveBeenCalledWith(
        transactionClient,
        expect.objectContaining({
          movementType:
            StockMovementType.SALE_SHIPMENT,
          physicalChange: -2,
          reservedChange: -2,
        })
      );

      expect(
        mocks.orderUpdate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              status:
                OrderStatus.SHIPPED,
              stockReserved: false,
              stockDeducted: true,
            }),
        })
      );
    });

    it("iptalde rezervasyonu kaldırır ve cari ters kayıt oluşturur", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          status:
            OrderStatus.APPROVED,
          stockReserved: true,
        })
      );

      mocks.accountFindFirst
        .mockResolvedValueOnce({
          id: 800,
          amount: 720,
        })
        .mockResolvedValueOnce(
          null
        );

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.CANCELLED
        )
      );

      expect(
        mocks.stockMovement
      ).toHaveBeenCalledWith(
        transactionClient,
        expect.objectContaining({
          movementType:
            StockMovementType.RESERVATION_RELEASE,
          physicalChange: 0,
          reservedChange: -2,
        })
      );

      expect(
        mocks.accountCreate
      ).toHaveBeenCalledWith({
        data:
          expect.objectContaining({
            customerId: 10,
            orderId: 501,
            direction:
              CustomerAccountEntryDirection.CREDIT,
            entryType:
              CustomerAccountEntryType.CANCELLATION,
            amount: 720,
          }),
      });

      expect(
        mocks.orderUpdate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              status:
                OrderStatus.CANCELLED,
              stockReserved: false,
            }),
        })
      );
    });

    it("mevcut iptal ters kaydını ikinci kez oluşturmaz", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          status:
            OrderStatus.APPROVED,
          stockReserved: true,
        })
      );

      mocks.accountFindFirst
        .mockResolvedValueOnce({
          id: 800,
          amount: 720,
        })
        .mockResolvedValueOnce({
          id: 801,
        });

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.CANCELLED
        )
      );

      expect(
        mocks.accountCreate
      ).not.toHaveBeenCalled();
    });

    it("aynı durum yeniden seçildiğinde stok ve cari hareket üretmez", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          status:
            OrderStatus.APPROVED,
          stockReserved: true,
        })
      );

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.APPROVED
        )
      );

      expect(
        mocks.stockMovement
      ).not.toHaveBeenCalled();

      expect(
        mocks.accountFindFirst
      ).not.toHaveBeenCalled();

      expect(
        mocks.orderUpdate
      ).not.toHaveBeenCalled();
    });

    it("tedarikçi ürünü gerçek WMS stoğu varsa rezerve eder", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          items: [
            {
              productId: 1263,
              productCode: "ETK-KRT-1279",
              productName: "Tedarikçi Ürünü",
              quantity: 3,
              product: {
                ownStock: false,
              },
            },
          ],
        })
      );

      mocks.getWmsPickableStock.mockResolvedValue({
        productId: 1263,
        physicalQuantity: 77,
        reservedQuantity: 0,
        availableQuantity: 77,
        warehouses: [
          {
            warehouseId: 1,
            warehouseCode: "DP001",
            physicalQuantity: 77,
            reservedQuantity: 0,
            availableQuantity: 77,
          },
        ],
      });

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.APPROVED
        )
      );

      expect(
        mocks.stockMovement
      ).toHaveBeenCalledWith(
        transactionClient,
        expect.objectContaining({
          productId: 1263,
          orderId: 501,
          warehouseId: 1,
          movementType:
            StockMovementType.RESERVATION_CREATE,
          physicalChange: 0,
          reservedChange: 3,
        })
      );

      expect(
        mocks.orderUpdate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              status:
                OrderStatus.APPROVED,
              stockReserved: true,
            }),
        })
      );
    });

    it("tedarikçi katalog stoğu olsa bile WMS stoğu yoksa rezervasyonu reddeder", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          items: [
            {
              productId: 1263,
              productCode: "ETK-KRT-1279",
              productName: "Tedarikçi Ürünü",
              quantity: 3,
              product: {
                ownStock: false,
              },
            },
          ],
        })
      );

      mocks.getWmsPickableStock.mockResolvedValue({
        productId: 1263,
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        warehouses: [],
      });

      await expect(
        updateOrderStatus(
          501,
          createStatusForm(
            OrderStatus.APPROVED
          )
        )
      ).rejects.toThrow(
        "WMS'de yeterli toplanabilir stok bulunmuyor"
      );

      expect(
        mocks.stockMovement
      ).not.toHaveBeenCalled();

      expect(
        mocks.orderUpdate
      ).not.toHaveBeenCalled();
    });

    it("onaylı fakat rezervasyonsuz siparişin rezervasyonunu aynı durumdan onarır", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          status:
            OrderStatus.APPROVED,
          stockReserved: false,
          items: [
            {
              productId: 1263,
              productCode: "ETK-KRT-1279",
              productName: "Tedarikçi Ürünü",
              quantity: 3,
              product: {
                ownStock: false,
              },
            },
          ],
        })
      );

      mocks.getWmsPickableStock.mockResolvedValue({
        productId: 1263,
        physicalQuantity: 77,
        reservedQuantity: 0,
        availableQuantity: 77,
        warehouses: [
          {
            warehouseId: 1,
            warehouseCode: "DP001",
            physicalQuantity: 77,
            reservedQuantity: 0,
            availableQuantity: 77,
          },
        ],
      });

      await updateOrderStatus(
        501,
        createStatusForm(
          OrderStatus.APPROVED
        )
      );

      expect(
        mocks.stockMovement
      ).toHaveBeenCalledWith(
        transactionClient,
        expect.objectContaining({
          productId: 1263,
          warehouseId: 1,
          movementType:
            StockMovementType.RESERVATION_CREATE,
          reservedChange: 3,
        })
      );

      expect(
        mocks.orderUpdate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              status:
                OrderStatus.APPROVED,
              stockReserved: true,
            }),
        })
      );
    });

    it("iptal edilmiş siparişin yeniden açılmasını reddeder", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          status:
            OrderStatus.CANCELLED,
        })
      );

      await expect(
        updateOrderStatus(
          501,
          createStatusForm(
            OrderStatus.APPROVED
          )
        )
      ).rejects.toThrow(
        "İptal edilmiş sipariş yeniden açılamaz. Yeni bir sipariş oluşturmalısınız."
      );

      expect(
        mocks.stockMovement
      ).not.toHaveBeenCalled();
    });
  }
);
