"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SessionService } from "@/modules/auth/services/session.service";
import {
  RoleManagementError,
  RoleService,
} from "@/modules/roles/services/role.service";

import type {
  RoleFormActionState,
  RoleFormValues,
} from "@/modules/roles/types/role.types";

const ROLES_PATH = "/admin/roles";

async function requireAdminUser() {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  return currentUser;
}

function readText(
  formData: FormData,
  fieldName: string
) {
  return String(
    formData.get(fieldName) ?? ""
  ).trim();
}

function readRoleValues(
  formData: FormData
): RoleFormValues {
  return {
    code: readText(formData, "code").toUpperCase(),
    name: readText(formData, "name"),
    description: readText(
      formData,
      "description"
    ),
    permissionIds: formData
      .getAll("permissionIds")
      .map((permissionId) =>
        String(permissionId).trim()
      )
      .filter(Boolean),
  };
}

function createResultUrl(
  type: "success" | "error",
  message: string
) {
  const params = new URLSearchParams({
    [type]: message,
  });

  return `${ROLES_PATH}?${params.toString()}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "İşlem tamamlanamadı.";
}

function createErrorState(
  error: unknown,
  values: RoleFormValues
): RoleFormActionState {
  if (error instanceof RoleManagementError) {
    return {
      success: false,
      message: error.message,
      field: error.field,
      values,
    };
  }

  console.error("Rol işlemi tamamlanamadı:", error);

  return {
    success: false,
    message:
      "Rol kaydedilemedi. Bilgileri kontrol edip yeniden deneyin.",
    field: null,
    values,
  };
}

export async function createRoleAction(
  _previousState: RoleFormActionState,
  formData: FormData
): Promise<RoleFormActionState> {
  await requireAdminUser();

  const values = readRoleValues(formData);
  let roleId = "";

  try {
    const role = await RoleService.createRole(values);
    roleId = role.id;
  } catch (error) {
    return createErrorState(error, values);
  }

  revalidatePath(ROLES_PATH);
  redirect(
    `${ROLES_PATH}/${roleId}?success=${encodeURIComponent(
      "Rol başarıyla oluşturuldu."
    )}`
  );
}

export async function updateRoleAction(
  _previousState: RoleFormActionState,
  formData: FormData
): Promise<RoleFormActionState> {
  await requireAdminUser();

  const roleId = readText(formData, "roleId");
  const values = readRoleValues(formData);

  try {
    await RoleService.updateRole(roleId, values);
  } catch (error) {
    return createErrorState(error, values);
  }

  revalidatePath(ROLES_PATH);
  revalidatePath(`${ROLES_PATH}/${roleId}`);
  redirect(
    `${ROLES_PATH}/${roleId}?success=${encodeURIComponent(
      "Rol ve yetkileri güncellendi."
    )}`
  );
}

export async function synchronizeAuthorizationCatalogAction(): Promise<void> {
  await requireAdminUser();
  let message = "";

  try {
    const result =
      await RoleService.synchronizeCatalog();

    message =
      `${result.permissionCount} yetki eşitlendi; ` +
      `${result.createdRoleCount} yeni operasyon rolü oluşturuldu.`;
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(ROLES_PATH);
  revalidatePath("/admin/users/new");
  redirect(createResultUrl("success", message));
}

export async function setRoleStatusAction(
  formData: FormData
): Promise<void> {
  await requireAdminUser();
  let message = "";

  try {
    const roleId = readText(formData, "roleId");
    const activeValue = readText(
      formData,
      "isActive"
    );

    if (
      activeValue !== "true" &&
      activeValue !== "false"
    ) {
      throw new Error("Geçersiz rol durumu.");
    }

    const isActive = activeValue === "true";
    const role = await RoleService.setRoleStatus(
      roleId,
      isActive
    );

    message = `${role.name} rolü ${
      isActive ? "aktif" : "pasif"
    } yapıldı.`;
  } catch (error) {
    redirect(
      createResultUrl(
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(ROLES_PATH);
  revalidatePath("/admin/users/new");
  redirect(createResultUrl("success", message));
}