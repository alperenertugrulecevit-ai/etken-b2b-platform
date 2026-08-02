import "server-only";

import {
  CustomerUserRole,
  Prisma,
  UserType,
} from "@prisma/client";
import { redirect } from "next/navigation";

import type { AuthUser } from "@/modules/auth/types/auth.types";

export function isActiveCustomerUser(
  user: AuthUser | null
): user is AuthUser & { customerId: number } {
  return Boolean(
    user &&
      user.userType === UserType.CUSTOMER &&
      user.customerId &&
      user.customer?.isActive
  );
}

export function canViewCustomerDashboard(user: AuthUser) {
  return user.customerRole === CustomerUserRole.CUSTOMER_ADMIN;
}

export function getCustomerOrderWhere(
  user: AuthUser
): Prisma.OrderWhereInput {
  const customerId = user.customerId;

  if (!customerId) {
    throw new Error("Aktif müşteri hesabı bulunamadı.");
  }

  if (user.customerRole === CustomerUserRole.CUSTOMER_ADMIN) {
    return { customerId };
  }

  if (user.customerRole === CustomerUserRole.ADDRESS_USER) {
    return {
      customerId,
      shippingAddress: {
        userAccesses: {
          some: { userId: user.id },
        },
      },
    };
  }

  return {
    customerId,
    placedByUserId: user.id,
  };
}

export function getCustomerAddressWhere(
  user: AuthUser
): Prisma.CustomerAddressWhereInput {
  const customerId = user.customerId;

  if (!customerId) {
    throw new Error("Aktif müşteri hesabı bulunamadı.");
  }


  const base: Prisma.CustomerAddressWhereInput = {
    customerId,
    isActive: true,
  };

  if (user.customerRole !== CustomerUserRole.ADDRESS_USER) {
    return base;
  }

  return {
    ...base,
    userAccesses: {
      some: { userId: user.id },
    },
  };
}

export function requireCustomerDashboardAccess(user: AuthUser) {
  if (!canViewCustomerDashboard(user)) {
    redirect("/account");
  }
}
