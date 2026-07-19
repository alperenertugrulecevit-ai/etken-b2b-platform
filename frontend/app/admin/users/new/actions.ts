"use server";

import {
  UserType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SessionService } from "@/modules/auth/services/session.service";
import {
  UserCreationError,
  UserCreationService,
} from "@/modules/users/services/user-creation.service";

import type {
  CreateUserActionState,
  CreateUserFormValues,
} from "@/modules/users/types/create-user.types";

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
  return formData.get(fieldName) === "on";
}

function parseUserType(value: string) {
  if (
    Object.values(UserType).includes(
      value as UserType
    )
  ) {
    return value as UserType;
  }

  return UserType.WAREHOUSE;
}

export async function createUserAction(
  _previousState: CreateUserActionState,
  formData: FormData
): Promise<CreateUserActionState> {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  const roleIds = formData
    .getAll("roleIds")
    .map((roleId) => String(roleId).trim())
    .filter(Boolean);

  const values: CreateUserFormValues = {
    employeeCode: readText(
      formData,
      "employeeCode"
    ).toUpperCase(),
    firstName: readText(formData, "firstName"),
    lastName: readText(formData, "lastName"),
    email: readText(formData, "email"),
    phone: readText(formData, "phone"),
    department: readText(
      formData,
      "department"
    ),
    title: readText(formData, "title"),
    shiftCode: readText(formData, "shiftCode"),
    username: readText(
      formData,
      "username"
    ).toLowerCase(),
    userType: parseUserType(
      readText(formData, "userType")
    ),
    isRfUser: readBoolean(
      formData,
      "isRfUser"
    ),
    isAdminUser: readBoolean(
      formData,
      "isAdminUser"
    ),
    roleIds,
  };

  try {
    const result =
      await UserCreationService.createUser(
        {
          ...values,
          temporaryPassword: readText(
            formData,
            "temporaryPassword"
          ),
        },
        currentUser.id
      );

    revalidatePath("/admin/users");

    return {
      success: true,
      message:
        "Kullanıcı ve personel kaydı başarıyla oluşturuldu.",
      field: null,
      result,
      values: null,
    };
  } catch (error) {
    if (error instanceof UserCreationError) {
      return {
        success: false,
        message: error.message,
        field: error.field,
        result: null,
        values,
      };
    }

    console.error(
      "Kullanıcı oluşturulamadı:",
      error
    );

    return {
      success: false,
      message:
        "Kullanıcı oluşturulamadı. Lütfen bilgileri kontrol edip yeniden deneyin.",
      field: null,
      result: null,
      values,
    };
  }
}