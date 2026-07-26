"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  CustomerImportExecutionService,
} from "@/modules/data-import/services/customer-import-execution.service";

import {
  CustomerImportPreviewService,
} from "@/modules/data-import/services/customer-import-preview.service";

export type CustomerImportActionState = {
  success: boolean;
  message: string;
  jobId: string | null;
  completed: boolean;
};

function getProfileName(
  profile: Awaited<
    ReturnType<
      typeof AuthorizationService.requirePermission
    >
  >
) {
  if (profile.employee) {
    const fullName = [
      profile.employee.firstName,
      profile.employee.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) {
      return fullName;
    }
  }

  return profile.username;
}

export async function previewCustomerImportAction(
  _previousState:
    CustomerImportActionState,

  formData:
    FormData
): Promise<CustomerImportActionState> {
  const profile =
    await AuthorizationService.requirePermission(
      "DATA_IMPORT_MANAGE"
    );

  const file =
    formData.get(
      "file"
    );

  const mode =
    String(
      formData.get(
        "mode"
      ) ??
        "CREATE_ONLY"
    );

  if (
    !(file instanceof File) ||
    file.size === 0
  ) {
    return {
      success:
        false,

      message:
        "Ön izleme için bir müşteri Excel dosyası seçin.",

      jobId:
        null,

      completed:
        false,
    };
  }

  try {
    const job =
      await CustomerImportPreviewService.createPreview({
        file,
        mode,

        createdById:
          profile.id,

        createdByName:
          getProfileName(
            profile
          ),
      });

    revalidatePath(
      "/admin/data-imports"
    );

    return {
      success:
        true,

      message:
        `${job.importNumber} numaralı müşteri ön izlemesi hazırlandı.`,

      jobId:
        job.id,

      completed:
        false,
    };
  } catch (error) {
    console.error(
      "Müşteri Excel ön izleme hatası:",
      error
    );

    return {
      success:
        false,

      message:
        error instanceof Error
          ? error.message
          : "Müşteri Excel dosyası ön izlemeye hazırlanamadı.",

      jobId:
        null,

      completed:
        false,
    };
  }
}

export async function executeCustomerImportAction(
  jobId:
    string,

  _previousState:
    CustomerImportActionState,

  _formData:
    FormData
): Promise<CustomerImportActionState> {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_MANAGE"
  );

  const normalizedJobId =
    jobId.trim();

  if (!normalizedJobId) {
    return {
      success:
        false,

      message:
        "Onaylanacak müşteri aktarımı bulunamadı.",

      jobId:
        null,

      completed:
        false,
    };
  }

  try {
    const result =
      await CustomerImportExecutionService.execute(
        normalizedJobId
      );

    revalidatePath(
      "/admin/data-imports"
    );

    revalidatePath(
      `/admin/data-imports/${normalizedJobId}`
    );

    revalidatePath(
      "/admin/customers"
    );

    return {
      success:
        true,

      message:
        `Müşteri aktarımı tamamlandı: ` +
        `${result.insertedRows} yeni, ` +
        `${result.updatedRows} güncellenen, ` +
        `${result.skippedRows} atlanan müşteri/adres satırı.`,

      jobId:
        normalizedJobId,

      completed:
        true,
    };
  } catch (error) {
    console.error(
      "Müşteri Excel aktarım hatası:",
      error
    );

    return {
      success:
        false,

      message:
        error instanceof Error
          ? error.message
          : "Müşteri aktarımı tamamlanamadı.",

      jobId:
        normalizedJobId,

      completed:
        false,
    };
  }
}