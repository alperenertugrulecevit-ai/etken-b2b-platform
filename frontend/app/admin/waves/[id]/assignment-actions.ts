"use server";

import {
  WaveAssignmentStatus,
  WmsOperationType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createWaveAssignment,
  deleteWaveAssignment,
  updateWaveAssignmentStatus,
} from "@/lib/wms/wave-assignment-service";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Beklenmeyen bir işlem hatası oluştu.";
}

function createAssignmentsPageUrl(
  waveId: string,
  type: "success" | "error",
  message: string
) {
  const parameters = new URLSearchParams();

  parameters.set(type, message);

  return `/admin/waves/${waveId}/assignments?${parameters.toString()}`;
}

function refreshWavePages(waveId: string) {
  revalidatePath("/admin/waves");
  revalidatePath(`/admin/waves/${waveId}`);
  revalidatePath(
    `/admin/waves/${waveId}/assignments`
  );
  revalidatePath("/admin/wms-dashboard");
}

function getRequiredString(
  formData: FormData,
  fieldName: string
) {
  const value = formData.get(fieldName);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} alanı bulunamadı.`
    );
  }

  return value.trim();
}

function isWmsOperationType(
  value: string
): value is WmsOperationType {
  return Object.values(
    WmsOperationType
  ).includes(value as WmsOperationType);
}

function isWaveAssignmentStatus(
  value: string
): value is WaveAssignmentStatus {
  return Object.values(
    WaveAssignmentStatus
  ).includes(
    value as WaveAssignmentStatus
  );
}

export async function createWaveAssignmentAction(
  formData: FormData
) {
  let waveId = "";

  try {
    waveId = getRequiredString(
      formData,
      "waveId"
    );

    const operatorName =
      getRequiredString(
        formData,
        "operatorName"
      );

    const terminalCodeValue =
      formData.get("terminalCode");

    const terminalCode =
      typeof terminalCodeValue === "string"
        ? terminalCodeValue.trim()
        : "";

    const operationTypeValue =
      formData.get("operationType");

    if (
      typeof operationTypeValue !==
        "string" ||
      !isWmsOperationType(
        operationTypeValue
      )
    ) {
      throw new Error(
        "Geçerli bir operasyon tipi seçilmelidir."
      );
    }

    await createWaveAssignment({
      waveId,
      operatorName,
      terminalCode,
      operationType:
        operationTypeValue,
    });
  } catch (error) {
    if (!waveId) {
      redirect(
        "/admin/waves?error=Wave%20kimliği%20bulunamadı."
      );
    }

    redirect(
      createAssignmentsPageUrl(
        waveId,
        "error",
        getErrorMessage(error)
      )
    );
  }

  refreshWavePages(waveId);

  redirect(
    createAssignmentsPageUrl(
      waveId,
      "success",
      "Operatör Wave’e atandı."
    )
  );
}

export async function updateWaveAssignmentStatusAction(
  formData: FormData
) {
  let waveId = "";

  try {
    waveId = getRequiredString(
      formData,
      "waveId"
    );

    const assignmentId =
      getRequiredString(
        formData,
        "assignmentId"
      );

    const targetStatusValue =
      getRequiredString(
        formData,
        "targetStatus"
      );

    if (
      !isWaveAssignmentStatus(
        targetStatusValue
      )
    ) {
      throw new Error(
        "Geçerli bir atama durumu seçilmedi."
      );
    }

    await updateWaveAssignmentStatus(
      waveId,
      assignmentId,
      targetStatusValue
    );
  } catch (error) {
    if (!waveId) {
      redirect(
        "/admin/waves?error=Wave%20kimliği%20bulunamadı."
      );
    }

    redirect(
      createAssignmentsPageUrl(
        waveId,
        "error",
        getErrorMessage(error)
      )
    );
  }

  refreshWavePages(waveId);

  redirect(
    createAssignmentsPageUrl(
      waveId,
      "success",
      "Operatör durumu güncellendi."
    )
  );
}

export async function deleteWaveAssignmentAction(
  formData: FormData
) {
  let waveId = "";

  try {
    waveId = getRequiredString(
      formData,
      "waveId"
    );

    const assignmentId =
      getRequiredString(
        formData,
        "assignmentId"
      );

    await deleteWaveAssignment(
      waveId,
      assignmentId
    );
  } catch (error) {
    if (!waveId) {
      redirect(
        "/admin/waves?error=Wave%20kimliği%20bulunamadı."
      );
    }

    redirect(
      createAssignmentsPageUrl(
        waveId,
        "error",
        getErrorMessage(error)
      )
    );
  }

  refreshWavePages(waveId);

  redirect(
    createAssignmentsPageUrl(
      waveId,
      "success",
      "Operatör ataması silindi."
    )
  );
}