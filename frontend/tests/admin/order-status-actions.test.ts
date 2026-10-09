import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
  OrderSource,
  B2BPaymentMethod,
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
  confirmEcommerceBankTransferPayment,
  updateOrderStatus,
  updateOrderStatusControlled,
  undoOrderCancellation,
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
    statusHistoryCreate:
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
    cancellationRequest:
      vi.fn(),
    cancellationRefund:
      vi.fn(),
    cancellationUndo:
      vi.fn(),
    notificationSend:
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
  orderStatusHistory: {
    create: mocks.statusHistoryCreate,
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
      order: {
        findUnique:
          mocks.orderFindUnique,
      },
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
  "@/modules/orders/services/order-cancellation.service",
  () => ({
    OrderCancellationService: {
      request: mocks.cancellationRequest,
      completeRefund: mocks.cancellationRefund,
      undoRequest: mocks.cancellationUndo,
    },
  })
);

vi.mock(
  "@/modules/ecommerce/services/ecommerce-notification.service",
  () => ({
    EcommerceNotificationService: {
      send: mocks.notificationSend,
    },
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
    fulfillmentWarehouseId: null,
    waveOrders: [],
    zonePickTasks: [],
    pickingAssignment: null,
    fulfillment: null,
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
      mocks.statusHistoryCreate.mockResolvedValue({
        id: 901,
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

    it.each([OrderStatus.APPROVED, OrderStatus.PREPARING, OrderStatus.PICKING, OrderStatus.PACKING, OrderStatus.READY_TO_SHIP])(
      "e-ticaret rezervasyonunu %s geçişinde ikinci kez oluşturmaz",
      async (status) => {
        mocks.orderFindUnique.mockResolvedValue(
          createOrder({
            source: OrderSource.ECOMMERCE,
            status: OrderStatus.PENDING,
            stockReserved: true,
          })
        );
        await updateOrderStatus(501, createStatusForm(status));
        expect(mocks.stockMovement).not.toHaveBeenCalled();
        expect(mocks.getWmsPickableStock).not.toHaveBeenCalled();
        expect(mocks.orderUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status }),
          })
        );
      }
    );

    it("iptal edilmiş e-ticaret siparişini rezervasyon bayrağı olsa bile açmaz", async () => {
      mocks.orderFindUnique.mockResolvedValue(createOrder({
        source: OrderSource.ECOMMERCE, status: OrderStatus.CANCELLED, stockReserved: true,
      }));
      await expect(updateOrderStatus(501, createStatusForm(OrderStatus.APPROVED)))
        .rejects.toThrow("İptal edilmiş sipariş yeniden açılamaz");
      expect(mocks.orderUpdate).not.toHaveBeenCalled();
    });

    it("aynı e-ticaret durumunu tekrar seçince geçmiş kaydı oluşturmaz", async () => {
      mocks.orderFindUnique.mockResolvedValue(createOrder({
        source: OrderSource.ECOMMERCE, status: OrderStatus.APPROVED, stockReserved: true,
      }));
      await updateOrderStatus(501, createStatusForm(OrderStatus.APPROVED));
      expect(mocks.orderUpdate).not.toHaveBeenCalled();
      expect(mocks.stockMovement).not.toHaveBeenCalled();
    });

    it("e-ticaret siparişinde başlangıç durumuna dönüş global rezervasyonu WMS üzerinden bırakmaz", async () => {
      mocks.orderFindUnique.mockResolvedValue(createOrder({
        source: OrderSource.ECOMMERCE,
        status: OrderStatus.APPROVED,
        stockReserved: true,
      }));
      await expect(updateOrderStatus(501, createStatusForm(OrderStatus.PENDING)))
        .rejects.toThrow("İptal sürecini kullanın");
      expect(mocks.stockMovement).not.toHaveBeenCalled();
      expect(mocks.orderUpdate).not.toHaveBeenCalled();
    });

    it("e-ticaret siparişinde manuel sevk durumunu engeller", async () => {
      mocks.orderFindUnique.mockResolvedValue(
        createOrder({
          source: OrderSource.ECOMMERCE,
          status: OrderStatus.READY_TO_SHIP,
          stockReserved: true,
        })
      );

      await expect(
        updateOrderStatus(
          501,
          createStatusForm(OrderStatus.SHIPPED)
        )
      ).rejects.toThrow(
        "RF Sevkiyat akışından"
      );

      expect(mocks.stockMovement).not.toHaveBeenCalled();
      expect(mocks.orderUpdate).not.toHaveBeenCalled();
    });

    it("iptal talebini kontrollü iptal servisine yönlendirir", async () => {
      mocks.cancellationRequest.mockResolvedValue({orderNumber:"B2B20260803-TEST",stockReturnRequired:false,physicalQuantity:0});
      mocks.orderFindUnique.mockResolvedValue({
        source:OrderSource.B2B,
        orderNumber:"B2B20260803-TEST",
        ecommerceEmail:null,
      });
      await updateOrderStatus(501, createStatusForm(OrderStatus.CANCELLED));
      expect(mocks.cancellationRequest).toHaveBeenCalledWith(expect.objectContaining({
        orderId:501,
        reason:"Otomatik test",
        actor:expect.objectContaining({userId:"admin-user"}),
      }));
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("kontrollü action iptal hatasını UI state olarak döndürür", async () => {
      mocks.cancellationRequest.mockRejectedValue(
        new Error("Sipariş sevk edilmiş. İptal yerine İade Giriş süreci kullanılmalıdır.")
      );

      const result = await updateOrderStatusControlled(
        501,
        { error: null },
        createStatusForm(OrderStatus.CANCELLED)
      );

      expect(result).toEqual({
        error: "Sipariş sevk edilmiş. İptal yerine İade Giriş süreci kullanılmalıdır.",
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("kontrollü action bilinmeyen hatayı güvenli mesajla döndürür", async () => {
      mocks.cancellationRequest.mockRejectedValue("beklenmeyen hata");

      const result = await updateOrderStatusControlled(
        501,
        { error: null },
        createStatusForm(OrderStatus.CANCELLED)
      );

      expect(result).toEqual({
        error: "Sipariş durumu güncellenemedi.",
      });
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


describe("confirmEcommerceBankTransferPayment", () => {
  function paymentForm(reference = "BANK-REF-123") {
    const formData = new FormData();
    formData.set("paymentReference", reference);
    return formData;
  }

  function ecommerceOrder(overrides: Record<string, unknown> = {}) {
    return {
      id: 700,
      orderNumber: "WEB20261003-TEST",
      customerId: 70,
      source: OrderSource.ECOMMERCE,
      status: OrderStatus.PENDING,
      paymentMethod: B2BPaymentMethod.BANK_TRANSFER,
      paymentStatus: "PENDING",
      paymentProvider: "BANK_TRANSFER",
      paymentReference: null,
      totalAmount: 1250.5,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      id: "finance-user",
      username: "finance",
      employee: { firstName: "Finans", lastName: "Operatörü" },
    });
    mocks.transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient)
    );
    mocks.orderUpdate.mockResolvedValue({ id: 700 });
    mocks.accountCreate.mockResolvedValue({ id: 902 });
    mocks.statusHistoryCreate.mockResolvedValue({ id: 903 });
    mocks.accountFindFirst.mockResolvedValue(null);
  });

  it("havale ödemesini cari tahsilat ve PAID olarak kaydeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(ecommerceOrder());

    await confirmEcommerceBankTransferPayment(700, paymentForm());

    expect(mocks.accountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 70,
        orderId: 700,
        direction: CustomerAccountEntryDirection.CREDIT,
        entryType: CustomerAccountEntryType.PAYMENT,
        paymentMethod: CustomerAccountPaymentMethod.BANK_TRANSFER,
        amount: 1250.5,
        referenceNo: "BANK-REF-123",
      }),
    });
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: 700 },
      data: {
        paymentStatus: "PAID",
        paymentProvider: "BANK_TRANSFER",
        paymentReference: "BANK-REF-123",
      },
    });
    expect(mocks.statusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 700,
        status: OrderStatus.PENDING,
        note: "Havale / EFT ödemeniz onaylandı.",
        visibleToCustomer: true,
      }),
    });
  });

  it("banka referansı olmadan ödeme onayını reddeder", async () => {
    await expect(confirmEcommerceBankTransferPayment(700, paymentForm("")))
      .rejects.toThrow("Banka işlem / dekont referansı zorunludur.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("e-ticaret olmayan siparişi reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(ecommerceOrder({ source: OrderSource.B2B }));
    await expect(confirmEcommerceBankTransferPayment(700, paymentForm()))
      .rejects.toThrow("yalnızca e-ticaret siparişleri");
  });

  it("havale olmayan ödeme yöntemini reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(ecommerceOrder({ paymentMethod: B2BPaymentMethod.CURRENT_ACCOUNT }));
    await expect(confirmEcommerceBankTransferPayment(700, paymentForm()))
      .rejects.toThrow("Havale / EFT ödeme yönteminde değil");
  });

  it("iptal edilmiş siparişin ödemesini reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(ecommerceOrder({ status: OrderStatus.CANCELLED }));
    await expect(confirmEcommerceBankTransferPayment(700, paymentForm()))
      .rejects.toThrow("İptal edilmiş sipariş");
  });

  it("PAID siparişte ikinci ödeme onayını reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(ecommerceOrder({ paymentStatus: "PAID" }));
    await expect(confirmEcommerceBankTransferPayment(700, paymentForm()))
      .rejects.toThrow("daha önce onaylanmış");
  });

  it("mevcut cari ödeme hareketi varsa ikinci tahsilatı reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(ecommerceOrder());
    mocks.accountFindFirst.mockResolvedValue({ id: 999 });
    await expect(confirmEcommerceBankTransferPayment(700, paymentForm()))
      .rejects.toThrow("daha önce ödeme cari hareketi");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });
});


describe("undoOrderCancellation",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({id:"admin-user",username:"admin",employee:{firstName:"Yönetim",lastName:"Operatörü"}});
    mocks.cancellationUndo.mockResolvedValue({orderNumber:"SIP20261005-720782"});
  });

  it("stok geri alma bekleyen siparişin iptal geri alma servisini çağırır",async()=>{
    const formData=new FormData();
    formData.set("undoCancellationReason","Operasyon sorunu giderildi.");
    await undoOrderCancellation(782,formData);
    expect(mocks.cancellationUndo).toHaveBeenCalledWith({
      orderId:782,reason:"Operasyon sorunu giderildi.",actor:{userId:"admin-user",displayName:"Yönetim Operatörü"},
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rf/shipment-dispatch");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/orders/782?cancellationUndone=1");
  });

  it("açıklama boşsa güvenli varsayılan nedeni kullanır",async()=>{
    const formData=new FormData();
    formData.set("undoCancellationReason","   ");
    await undoOrderCancellation(782,formData);
    expect(mocks.cancellationUndo).toHaveBeenCalledWith(expect.objectContaining({
      orderId:782,reason:"Sorun giderildi; sipariş yeniden sevke açıldı.",
    }));
  });
});
