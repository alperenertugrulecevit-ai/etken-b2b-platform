"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  SupplierImportExecutionService,
} from "@/modules/data-import/services/supplier-import-execution.service";

import {
  SupplierImportPreviewService,
} from "@/modules/data-import/services/supplier-import-preview.service";

export type SupplierImportActionState = {
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

export async function previewSupplierImportAction(
  _previousState: SupplierImportActionState,
  formData: FormData
): Promise<SupplierImportActionState> {
  const profile =
    await AuthorizationService.requirePermission(
      "DATA_IMPORT_MANAGE"
    );

  const file =
    formData.get("file");

  const mode =
    String(
      formData.get("mode") ??
        "CREATE_ONLY"
    );

  if (
    !(file instanceof File) ||
    file.size === 0
  ) {
    return {
      success: false,
      message:
        "Ön izleme için bir Excel dosyası seçin.",
      jobId: null,
      completed: false,
    };
  }

  try {
    const job =
      await SupplierImportPreviewService.createPreview({
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
      success: true,
      message:
        `${job.importNumber} numaralı tedarikçi ön izlemesi hazırlandı.`,
      jobId:
        job.id,
      completed: false,
    };
  } catch (error) {
    console.error(
      "Tedarikçi Excel ön izleme hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Tedarikçi Excel dosyası ön izlemeye hazırlanamadı.",
      jobId: null,
      completed: false,
    };
  }
}

export async function executeSupplierImportAction(
  jobId: string,
  _previousState: SupplierImportActionState,
  _formData: FormData
): Promise<SupplierImportActionState> {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_MANAGE"
  );

  const normalizedJobId =
    jobId.trim();

  if (!normalizedJobId) {
    return {
      success: false,
      message:
        "Onaylanacak tedarikçi aktarımı bulunamadı.",
      jobId: null,
      completed: false,
    };
  }

  try {
    const result =
      await SupplierImportExecutionService.execute(
        normalizedJobId
      );

    revalidatePath(
      "/admin/data-imports"
    );

    revalidatePath(
      `/admin/data-imports/${normalizedJobId}`
    );

    revalidatePath(
      "/admin/suppliers"
    );

    return {
      success: true,
      message:
        `Tedarikçi aktarımı tamamlandı: ` +
        `${result.insertedRows} yeni, ` +
        `${result.updatedRows} güncellenen, ` +
        `${result.skippedRows} atlanan kayıt.`,
      jobId:
        normalizedJobId,
      completed: true,
    };
  } catch (error) {
    console.error(
      "Tedarikçi Excel aktarım hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Tedarikçi aktarımı tamamlanamadı.",
      jobId:
        normalizedJobId,
      completed: false,
    };
  }
}