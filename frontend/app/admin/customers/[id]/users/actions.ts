"use server";

import { UserStatus, UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { PasswordService } from "@/modules/auth/services/password.service";

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9._-]{2,49}$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CustomerUserActionState = {
  success: boolean;
  message: string;
};



export async function createCustomerUserAction(
  customerId: number,
  _previousState:
    CustomerUserActionState,
  formData: FormData
): Promise<CustomerUserActionState> {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    return {
      success: false,
      message:
        "Geçerli müşteri bulunamadı.",
    };
  }

  const username = String(
    formData.get("username") ?? ""
  )
    .trim()
    .toLowerCase();

  const email =
    String(
      formData.get("email") ?? ""
    )
      .trim()
      .toLowerCase() || null;

  const password = String(
    formData.get("password") ?? ""
  );

  if (
    !USERNAME_PATTERN.test(
      username
    )
  ) {
    return {
      success: false,
      message:
        "Kullanıcı adı 3-50 karakter olmalı; küçük harf, rakam, nokta, alt çizgi veya tire içerebilir.",
    };
  }

  if (
    email &&
    !EMAIL_PATTERN.test(email)
  ) {
    return {
      success: false,
      message:
        "Geçerli bir e-posta adresi girin.",
    };
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return {
      success: false,
      message:
        "Şifre en az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.",
    };
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!customer) {
    return {
      success: false,
      message:
        "Müşteri bulunamadı.",
    };
  }

  if (!customer.isActive) {
    return {
      success: false,
      message:
        "Pasif müşteriye kullanıcı açılamaz.",
    };
  }

  const duplicate =
    await prisma.user.findFirst({
      where: {
        OR: [
          {
            username,
          },
          ...(email
            ? [
                {
                  email,
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

  if (duplicate) {
    return {
      success: false,
      message:
        "Kullanıcı adı veya e-posta başka bir hesapta kullanılıyor.",
    };
  }

  const currentUser =
    await AuthorizationService.requirePermission(
      "CUSTOMER_MANAGE"
    );

  await prisma.user.create({
    data: {
      customerId,
      username,
      email,
      passwordHash:
        await PasswordService.hash(
          password
        ),
      userType:
        UserType.CUSTOMER,
      status:
        UserStatus.ACTIVE,
      mustChangePassword: false,
      isRfUser: false,
      isAdminUser: false,
      createdById:
        currentUser.id,
    },
  });

  revalidatePath(
    "/admin/customers"
  );
  revalidatePath(
    "/admin/customers/" +
      customerId +
      "/users"
  );

  return {
    success: true,
    message:
      "Kurumsal müşteri kullanıcısı oluşturuldu.",
  };
}

export async function toggleCustomerUserStatusAction(
  customerId: number,
  userId: string,
  currentStatus: UserStatus
) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  const user =
    await prisma.user.findFirst({
      where: {
        id: userId,
        customerId,
        userType:
          UserType.CUSTOMER,
      },
      select: {
        id: true,
      },
    });

  if (!user) {
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      status:
        currentStatus ===
        UserStatus.ACTIVE
          ? UserStatus.PASSIVE
          : UserStatus.ACTIVE,
      sessionInvalidatedAt:
        new Date(),
    },
  });

  revalidatePath(
    "/admin/customers/" +
      customerId +
      "/users"
  );
}
