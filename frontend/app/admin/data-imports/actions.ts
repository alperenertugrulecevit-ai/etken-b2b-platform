"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  ProductImportExecutionService,
} from "@/modules/data-import/services/product-import-execution.service";

import {
  ProductImportPreviewService,
} from "@/modules/data-import/services/product-import-preview.service";

export type ProductImportActionState = {
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
    return [
      profile.employee.firstName,
      profile.employee.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return profile.username;
}

export async function previewProductImportAction(
  _previousState:
    ProductImportActionState,
  formData: FormData
): Promise<ProductImportActionState> {
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
      await ProductImportPreviewService
        .createPreview({
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
        `${job.importNumber} numaralı ön izleme hazırlandı.`,

      jobId:
        job.id,

      completed: false,
    };
  } catch (error) {
    console.error(
      "Ürün Excel ön izleme hatası:",
      error
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Excel dosyası ön izlemeye hazırlanamadı.",

      jobId: null,

      completed: false,
    };
  }
}

export async function executeProductImportAction(
  jobId: string,

  _previousState:
    ProductImportActionState,

  _formData: FormData
): Promise<ProductImportActionState> {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_MANAGE"
  );

  try {
    const result =
      await ProductImportExecutionService
        .execute(
          jobId
        );

    revalidatePath(
      "/admin/data-imports"
    );

    revalidatePath(
      `/admin/data-imports/${jobId}`
    );

    revalidatePath(
      "/admin/products"
    );

    return {
      success: true,

      message:
        `Aktarım tamamlandı: ${result.insertedRows} yeni, ${result.updatedRows} güncellenen, ${result.skippedRows} atlanan ürün.`,

      jobId,

      completed: true,
    };
  } catch (error) {
    console.error(
      "Ürün Excel aktarım hatası:",
      error
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Ürün aktarımı tamamlanamadı.",

      jobId,

      completed: false,
    };
  }
}
