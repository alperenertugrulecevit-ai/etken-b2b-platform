import {
  B2BPaymentMethod,
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerUserRole,
  OrderSource,
  OrderStatus,
  UserStatus,
  UserType,
} from "@prisma/client";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  AuthUser,
} from "@/modules/auth/types/auth.types";
import {
  B2BCheckoutError,
  B2BCheckoutService,
  type B2BCheckoutInput,
} from "@/modules/b2b/services/b2b-checkout.service";

const mocks = vi.hoisted(
  () => ({
    customerFindFirst:
      vi.fn(),
    addressFindFirst:
      vi.fn(),
    productFindMany:
      vi.fn(),
    orderCreate:
      vi.fn(),
    accountSummary:
      vi.fn(),
    dueDate:
      vi.fn(),
    addressWhere:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/prisma",
  () => ({
    prisma: {
      customer: {
        findFirst:
          mocks.customerFindFirst,
      },
      customerAddress: {
        findFirst:
          mocks.addressFindFirst,
      },
      product: {
        findMany:
          mocks.productFindMany,
      },
      order: {
        create:
          mocks.orderCreate,
      },
    },
  })
);

vi.mock(
  "@/modules/b2b/services/customer-account.service",
  () => ({
    getCustomerAccountSummary:
      mocks.accountSummary,
    getCustomerDueDate:
      mocks.dueDate,
  })
);

vi.mock(
  "@/modules/b2b/services/customer-user-access.service",
  () => ({
    getCustomerAddressWhere:
      mocks.addressWhere,
  })
);

function createUser(
  overrides: Partial<AuthUser> = {}
): AuthUser {
  return {
    id: "customer-user-1",
    employeeId: null,
    customerId: 10,
    username: "satinalma",
    email:
      "satinalma@example.com",
    fullName:
      "Satın Alma Yetkilisi",
    customerRole:
      CustomerUserRole.CUSTOMER_ADMIN,
    userType:
      UserType.CUSTOMER,
    status:
      UserStatus.ACTIVE,
    mustChangePassword: false,
    isRfUser: false,
    isAdminUser: false,
    employee: null,
    customer: {
      id: 10,
      customerCode: "MUS001",
      companyName:
        "Örnek Kurumsal Müşteri",
      contactName: null,
      isActive: true,
    },
    roles: [],
    permissions: [],
    ...overrides,
  };
}

function createInput(
  overrides: Partial<B2BCheckoutInput> = {}
): B2BCheckoutInput {
  return {
    shippingAddressId: 100,
    paymentMethod:
      "BANK_TRANSFER",
    requestedDate: null,
    customerNote: null,
    items: [
      {
        productId: 1,
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

function setDatabaseFixtures({
  price = 600,
  vat = 20,
  stock = 100,
  reservedStock = 10,
  discountRate = 10,
  creditLimit = 5000,
}: {
  price?: number;
  vat?: number;
  stock?: number;
  reservedStock?: number;
  discountRate?: number;
  creditLimit?: number;
} = {}) {
  mocks.customerFindFirst.mockResolvedValue({
    id: 10,
    paymentTermDays: 30,
    discountRate,
    creditLimit,
  });

  mocks.addressFindFirst.mockResolvedValue({
    id: 100,
  });

  mocks.productFindMany.mockResolvedValue([
    {
      id: 1,
      code: "URN001",
      name: "Test Ürünü",
      price,
      vat,
      stock,
      reservedStock,
    },
  ]);
}

describe(
  "B2BCheckoutService",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mocks.addressWhere.mockReturnValue({
        customerId: 10,
        isActive: true,
      });

      mocks.accountSummary.mockResolvedValue({
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      });

      mocks.dueDate.mockReturnValue(
        new Date(
          "2026-09-02T10:00:00.000Z"
        )
      );

      mocks.orderCreate.mockResolvedValue({
        id: 501,
        orderNumber:
          "B2B20260803-TEST",
      });
    });

    it("aktif müşteri kullanıcısı olmayan hesabı reddeder", async () => {
      await expect(
        B2BCheckoutService.createOrder(
          createUser({
            userType:
              UserType.OFFICE,
          }),
          createInput()
        )
      ).rejects.toThrow(
        "Sipariş vermek için aktif bir kurumsal müşteri hesabıyla giriş yapmalısınız."
      );
    });

    it("boş sepeti reddeder", async () => {
      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput({
            items: [],
          })
        )
      ).rejects.toBeInstanceOf(
        B2BCheckoutError
      );

      expect(
        mocks.customerFindFirst
      ).not.toHaveBeenCalled();
    });

    it("tekrarlı ürün satırını reddeder", async () => {
      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput({
            items: [
              {
                productId: 1,
                quantity: 1,
              },
              {
                productId: 1,
                quantity: 2,
              },
            ],
          })
        )
      ).rejects.toThrow(
        "Sepette geçersiz veya tekrarlı ürün satırı bulunuyor."
      );
    });

    it("geçersiz teslimat tarihini reddeder", async () => {
      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput({
            requestedDate:
              "03.08.2026",
          })
        )
      ).rejects.toThrow(
        "Talep edilen teslim tarihi geçerli değil."
      );
    });

    it("müşterinin yetkili olmadığı teslimat adresini reddeder", async () => {
      setDatabaseFixtures();
      mocks.addressFindFirst.mockResolvedValue(
        null
      );

      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput()
        )
      ).rejects.toThrow(
        "Teslimat adresi müşteriye ait değil veya pasif durumda."
      );
    });

    it("kullanılabilir stoktan fazla miktarı reddeder", async () => {
      setDatabaseFixtures({
        stock: 20,
        reservedStock: 15,
      });

      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput({
            items: [
              {
                productId: 1,
                quantity: 6,
              },
            ],
          })
        )
      ).rejects.toThrow(
        "Test Ürünü için kullanılabilir stok 5 adettir. Sepet miktarını güncelleyin."
      );
    });

    it("KDV hariç 500 TL altındaki siparişi reddeder", async () => {
      setDatabaseFixtures({
        price: 499.99,
        discountRate: 0,
      });

      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput()
        )
      ).rejects.toThrow(
        "Minimum sipariş tutarı KDV hariç 500 TL'dir."
      );

      expect(
        mocks.orderCreate
      ).not.toHaveBeenCalled();
    });

    it("cari bakiye kredi limitini aşıyorsa siparişi reddeder", async () => {
      setDatabaseFixtures({
        price: 900,
        discountRate: 0,
        creditLimit: 1500,
      });

      mocks.accountSummary.mockResolvedValue({
        totalDebit: 1000,
        totalCredit: 0,
        balance: 1000,
      });

      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput({
            paymentMethod:
              "CURRENT_ACCOUNT",
          })
        )
      ).rejects.toThrow(
        "Mevcut cari bakiye ile birlikte sipariş toplamı tanımlı kredi limitini aşıyor."
      );
    });

    it("fiyat, iskonto ve KDV tutarlarını hesaplayarak sipariş oluşturur", async () => {
      setDatabaseFixtures({
        price: 600,
        vat: 20,
        discountRate: 10,
      });

      await expect(
        B2BCheckoutService.createOrder(
          createUser(),
          createInput({
            customerNote:
              "Kapıya teslim",
          })
        )
      ).resolves.toEqual({
        orderId: 501,
        orderNumber:
          "B2B20260803-TEST",
      });

      expect(
        mocks.orderCreate
      ).toHaveBeenCalledTimes(1);

      const createArgument =
        mocks.orderCreate.mock
          .calls[0][0];

      expect(
        createArgument.data
      ).toMatchObject({
        customerId: 10,
        shippingAddressId: 100,
        status:
          OrderStatus.PENDING,
        source:
          OrderSource.B2B,
        paymentMethod:
          B2BPaymentMethod.BANK_TRANSFER,
        placedByUserId:
          "customer-user-1",
        placedByUsername:
          "satinalma",
        paymentTermDays: 30,
        discountRate: 10,
        subtotal: 600,
        discountAmount: 60,
        vatAmount: 108,
        totalAmount: 648,
        customerNote:
          "Kapıya teslim",
        accountEntries: {
          create: {
            customerId: 10,
            direction:
              CustomerAccountEntryDirection.DEBIT,
            entryType:
              CustomerAccountEntryType.ORDER,
            amount: 648,
            description:
              "B2B sipariş borç kaydı",
            dueDate:
              new Date(
                "2026-09-02T10:00:00.000Z"
              ),
            createdByUserId:
              "customer-user-1",
            createdByUsername:
              "satinalma",
          },
        },
        items: {
          create: [
            {
              productId: 1,
              productCode:
                "URN001",
              productName:
                "Test Ürünü",
              quantity: 1,
              unitPrice: 600,
              vatRate: 20,
              lineNet: 600,
              vatAmount: 120,
              lineTotal: 720,
            },
          ],
        },
      });
    });
  }
);
