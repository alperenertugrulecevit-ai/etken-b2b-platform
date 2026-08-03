import {
  CustomerUserRole,
  UserStatus,
  UserType,
} from "@prisma/client";
import {
  redirect,
} from "next/navigation";
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
  canViewCustomerDashboard,
  getCustomerAddressWhere,
  getCustomerOrderWhere,
  isActiveCustomerUser,
  requireCustomerDashboardAccess,
} from "@/modules/b2b/services/customer-user-access.service";

vi.mock(
  "next/navigation",
  () => ({
    redirect: vi.fn(),
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

describe(
  "customer-user-access.service",
  () => {
    beforeEach(() => {
      vi.mocked(
        redirect
      ).mockClear();
    });

    it("aktif kurumsal kullanıcıyı kabul eder", () => {
      expect(
        isActiveCustomerUser(
          createUser()
        )
      ).toBe(true);
    });

    it("pasif müşteri hesabını reddeder", () => {
      const user = createUser({
        customer: {
          id: 10,
          customerCode: "MUS001",
          companyName:
            "Örnek Kurumsal Müşteri",
          contactName: null,
          isActive: false,
        },
      });

      expect(
        isActiveCustomerUser(user)
      ).toBe(false);
    });

    it("yalnızca müşteri yetkilisine dashboard erişimi verir", () => {
      expect(
        canViewCustomerDashboard(
          createUser()
        )
      ).toBe(true);

      expect(
        canViewCustomerDashboard(
          createUser({
            customerRole:
              CustomerUserRole.BUYER,
          })
        )
      ).toBe(false);
    });

    it("müşteri yetkilisine şirketin tüm sipariş kapsamını verir", () => {
      expect(
        getCustomerOrderWhere(
          createUser()
        )
      ).toEqual({
        customerId: 10,
      });
    });

    it("satın almacıyı yalnızca kendi siparişleriyle sınırlar", () => {
      expect(
        getCustomerOrderWhere(
          createUser({
            customerRole:
              CustomerUserRole.BUYER,
          })
        )
      ).toEqual({
        customerId: 10,
        placedByUserId:
          "customer-user-1",
      });
    });

    it("adres kullanıcısını yetkili adres siparişleriyle sınırlar", () => {
      expect(
        getCustomerOrderWhere(
          createUser({
            customerRole:
              CustomerUserRole.ADDRESS_USER,
          })
        )
      ).toEqual({
        customerId: 10,
        shippingAddress: {
          userAccesses: {
            some: {
              userId:
                "customer-user-1",
            },
          },
        },
      });
    });

    it("adres kullanıcısına yalnızca aktif ve atanmış adresleri verir", () => {
      expect(
        getCustomerAddressWhere(
          createUser({
            customerRole:
              CustomerUserRole.ADDRESS_USER,
          })
        )
      ).toEqual({
        customerId: 10,
        isActive: true,
        userAccesses: {
          some: {
            userId:
              "customer-user-1",
          },
        },
      });
    });

    it("müşteri bağlantısı olmayan kullanıcı için sorgu üretmez", () => {
      expect(() =>
        getCustomerOrderWhere(
          createUser({
            customerId: null,
          })
        )
      ).toThrow(
        "Aktif müşteri hesabı bulunamadı."
      );
    });

    it("yetkisiz kullanıcıyı hesap ana sayfasına yönlendirir", () => {
      requireCustomerDashboardAccess(
        createUser({
          customerRole:
            CustomerUserRole.BUYER,
        })
      );

      expect(
        redirect
      ).toHaveBeenCalledWith(
        "/account"
      );
    });
  }
);
