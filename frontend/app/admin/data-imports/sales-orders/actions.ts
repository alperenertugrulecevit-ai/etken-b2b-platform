"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  SalesOrderImportExecutionService,
} from "@/modules/data-import/services/sales-order-import-execution.service";

import {
  SalesOrderImportPreviewService,
} from "@/modules/data-import/services/sales-order-import-preview.service";

export type SalesOrderImportActionState = {
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

export async function previewSalesOrderImportAction(
  _previousState:
    SalesOrderImportActionState,

  formData:
    FormData
): Promise<SalesOrderImportActionState> {
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
        "Ön izleme için bir sevk siparişi Excel dosyası seçin.",

      jobId:
        null,

      completed:
        false,
    };
  }

  try {
    const job =
      await SalesOrderImportPreviewService.createPreview({
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
        `${job.importNumber} numaralı sevk siparişi ön izlemesi hazırlandı.`,

      jobId:
        job.id,

      completed:
        false,
    };
  } catch (error) {
    console.error(
      "Sevk siparişi Excel ön izleme hatası:",
      error
    );

    return {
      success:
        false,

      message:
        error instanceof Error
          ? error.message
          : "Sevk siparişi Excel dosyası ön izlemeye hazırlanamadı.",

      jobId:
        null,

      completed:
        false,
    };
  }
}

export async function executeSalesOrderImportAction(
  jobId:
    string,

  _previousState:
    SalesOrderImportActionState,

  _formData:
    FormData
): Promise<SalesOrderImportActionState> {
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
        "Onaylanacak sevk siparişi aktarımı bulunamadı.",

      jobId:
        null,

      completed:
        false,
    };
  }

  try {
    const result =
      await SalesOrderImportExecutionService.execute(
        normalizedJobId
      );

    revalidatePath(
      "/admin/data-imports"
    );

    revalidatePath(
      `/admin/data-imports/${normalizedJobId}`
    );

    revalidatePath(
      "/admin/orders"
    );

    return {
      success:
        true,

      message:
        `Sevk siparişi aktarımı tamamlandı: ` +
        `${result.insertedRows} yeni, ` +
        `${result.updatedRows} güncellenen, ` +
        `${result.skippedRows} atlanan sipariş/satır kaydı.`,

      jobId:
        normalizedJobId,

      completed:
        true,
    };
  } catch (error) {
    console.error(
      "Sevk siparişi Excel aktarım hatası:",
      error
    );

    return {
      success:
        false,

      message:
        error instanceof Error
          ? error.message
          : "Sevk siparişi aktarımı tamamlanamadı.",

      jobId:
        normalizedJobId,

      completed:
        false,
    };
  }
}