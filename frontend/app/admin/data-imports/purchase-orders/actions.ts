"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  PurchaseOrderImportExecutionService,
} from "@/modules/data-import/services/purchase-order-import-execution.service";

import {
  PurchaseOrderImportPreviewService,
} from "@/modules/data-import/services/purchase-order-import-preview.service";

export type PurchaseOrderImportActionState = {
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

export async function previewPurchaseOrderImportAction(
  _previousState:
    PurchaseOrderImportActionState,

  formData:
    FormData
): Promise<PurchaseOrderImportActionState> {
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
        "Ön izleme için bir satın alma siparişi Excel dosyası seçin.",

      jobId:
        null,

      completed:
        false,
    };
  }

  try {
    const job =
      await PurchaseOrderImportPreviewService.createPreview({
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
        `${job.importNumber} numaralı satın alma siparişi ön izlemesi hazırlandı.`,

      jobId:
        job.id,

      completed:
        false,
    };
  } catch (error) {
    console.error(
      "Satın alma siparişi Excel ön izleme hatası:",
      error
    );

    return {
      success:
        false,

      message:
        error instanceof Error
          ? error.message
          : "Satın alma siparişi Excel dosyası ön izlemeye hazırlanamadı.",

      jobId:
        null,

      completed:
        false,
    };
  }
}

export async function executePurchaseOrderImportAction(
  jobId:
    string,

  _previousState:
    PurchaseOrderImportActionState,

  _formData:
    FormData
): Promise<PurchaseOrderImportActionState> {
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
        "Onaylanacak satın alma siparişi aktarımı bulunamadı.",

      jobId:
        null,

      completed:
        false,
    };
  }

  try {
    const result =
      await PurchaseOrderImportExecutionService.execute(
        normalizedJobId
      );

    revalidatePath(
      "/admin/data-imports"
    );

    revalidatePath(
      `/admin/data-imports/${normalizedJobId}`
    );

    revalidatePath(
      "/admin/purchase-orders"
    );

    return {
      success:
        true,

      message:
        `Satın alma siparişi aktarımı tamamlandı: ` +
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
      "Satın alma siparişi Excel aktarım hatası:",
      error
    );

    return {
      success:
        false,

      message:
        error instanceof Error
          ? error.message
          : "Satın alma siparişi aktarımı tamamlanamadı.",

      jobId:
        normalizedJobId,

      completed:
        false,
    };
  }
}