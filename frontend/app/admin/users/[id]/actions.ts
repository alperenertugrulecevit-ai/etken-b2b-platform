"use server";

import {
  UserStatus,
  UserType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import {
  UserUpdateError,
  UserUpdateService,
} from "@/modules/users/services/user-update.service";

import type {
  UpdateUserActionState,
  UpdateUserFormValues,
} from "@/modules/users/types/update-user.types";

function readText(
  formData: FormData,
  fieldName: string
) {
  return String(
    formData.get(fieldName) ?? ""
  ).trim();
}

function readBoolean(
  formData: FormData,
  fieldName: string
) {
  return (
    formData.get(fieldName) ===
    "on"
  );
}

function parseUserType(
  value: string
) {
  if (
    Object.values(
      UserType
    ).includes(
      value as UserType
    )
  ) {
    return value as UserType;
  }

  return UserType.WAREHOUSE;
}

function parseUserStatus(
  value: string
) {
  if (
    Object.values(
      UserStatus
    ).includes(
      value as UserStatus
    )
  ) {
    return value as UserStatus;
  }

  return UserStatus.ACTIVE;
}

function readValues(
  formData: FormData
): UpdateUserFormValues {
  return {
    employeeCode:
      readText(
        formData,
        "employeeCode"
      ).toUpperCase(),

    firstName:
      readText(
        formData,
        "firstName"
      ),

    lastName:
      readText(
        formData,
        "lastName"
      ),

    email:
      readText(
        formData,
        "email"
      ),

    phone:
      readText(
        formData,
        "phone"
      ),

    department:
      readText(
        formData,
        "department"
      ),

    title:
      readText(
        formData,
        "title"
      ),

    shiftCode:
      readText(
        formData,
        "shiftCode"
      ),

    username:
      readText(
        formData,
        "username"
      ).toLowerCase(),

    userType:
      parseUserType(
        readText(
          formData,
          "userType"
        )
      ),

    status:
      parseUserStatus(
        readText(
          formData,
          "status"
        )
      ),

    isRfUser:
      readBoolean(
        formData,
        "isRfUser"
      ),

    isAdminUser:
      readBoolean(
        formData,
        "isAdminUser"
      ),

    roleIds:
      formData
        .getAll("roleIds")
        .map(
          (roleId) =>
            String(
              roleId
            ).trim()
        )
        .filter(Boolean),
  };
}

export async function updateUserAction(
  _previousState: UpdateUserActionState,
  formData: FormData
): Promise<UpdateUserActionState> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "USER_MANAGE"
    );

  const userId =
    readText(
      formData,
      "userId"
    );

  const values =
    readValues(formData);

  if (!userId) {
    return {
      success: false,
      message:
        "Güncellenecek kullanıcı bilgisi eksik.",
      field: null,
      values,
    };
  }

  try {
    await UserUpdateService.updateUser(
      userId,
      values,
      currentUser.id
    );
  } catch (error) {
    if (
      error instanceof
      UserUpdateError
    ) {
      return {
        success: false,
        message:
          error.message,
        field:
          error.field,
        values,
      };
    }

    console.error(
      "Kullanıcı güncellenemedi:",
      error
    );

    return {
      success: false,
      message:
        "Kullanıcı güncellenemedi. Bilgileri kontrol edip yeniden deneyin.",
      field: null,
      values,
    };
  }

  revalidatePath(
    "/admin/users"
  );

  revalidatePath(
    `/admin/users/${userId}`
  );

  redirect(
    `/admin/users/${userId}?success=${encodeURIComponent(
      "Kullanıcı bilgileri başarıyla güncellendi."
    )}`
  );
}