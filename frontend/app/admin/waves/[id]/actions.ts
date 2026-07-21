"use server";

import {
  WaveStatus,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const allowedTransitions: Record<
  WaveStatus,
  WaveStatus[]
> = {
  DRAFT: [
    WaveStatus.READY,
    WaveStatus.CANCELLED,
  ],

  READY: [
    WaveStatus.DRAFT,
    WaveStatus.RELEASED,
    WaveStatus.CANCELLED,
  ],

  RELEASED: [
    WaveStatus.IN_PROGRESS,
    WaveStatus.PAUSED,
    WaveStatus.CANCELLED,
  ],

  IN_PROGRESS: [
    WaveStatus.PAUSED,
    WaveStatus.COMPLETED,
    WaveStatus.CANCELLED,
  ],

  PAUSED: [
    WaveStatus.IN_PROGRESS,
    WaveStatus.CANCELLED,
  ],

  COMPLETED: [],

  CANCELLED: [],
};

function isWaveStatus(
  value: string
): value is WaveStatus {
  return Object.values(
    WaveStatus
  ).includes(
    value as WaveStatus
  );
}

export async function updateWaveStatusAction(
  formData: FormData
) {
  await AuthorizationService.requirePermission(
    "WAVE_MANAGE"
  );

  const waveIdValue =
    formData.get("waveId");

  const targetStatusValue =
    formData.get(
      "targetStatus"
    );

  if (
    typeof waveIdValue !== "string" ||
    waveIdValue.trim() === ""
  ) {
    throw new Error(
      "Wave kimliği bulunamadı."
    );
  }

  if (
    typeof targetStatusValue !==
      "string" ||
    !isWaveStatus(
      targetStatusValue
    )
  ) {
    throw new Error(
      "Geçerli bir Wave durumu seçilmedi."
    );
  }

  const waveId =
    waveIdValue.trim();

  const targetStatus =
    targetStatusValue;

  const currentWave =
    await prisma.wave.findUnique({
      where: {
        id: waveId,
      },

      select: {
        id: true,
        waveNo: true,
        status: true,
      },
    });

  if (!currentWave) {
    throw new Error(
      "Wave kaydı bulunamadı."
    );
  }

  const permittedStatuses =
    allowedTransitions[
      currentWave.status
    ];

  if (
    !permittedStatuses.includes(
      targetStatus
    )
  ) {
    throw new Error(
      `${currentWave.status} durumundaki Wave, ${targetStatus} durumuna geçirilemez.`
    );
  }

  if (
    targetStatus ===
    WaveStatus.COMPLETED
  ) {
    const waveSummary =
      await prisma.wave.findUnique({
        where: {
          id: waveId,
        },

        select: {
          plannedQuantity: true,
          completedQuantity: true,
        },
      });

    if (!waveSummary) {
      throw new Error(
        "Wave kaydı bulunamadı."
      );
    }

    if (
      waveSummary.plannedQuantity >
        0 &&
      waveSummary.completedQuantity <
        waveSummary.plannedQuantity
    ) {
      throw new Error(
        "Planlanan miktarın tamamı işlenmeden Wave tamamlanamaz."
      );
    }
  }

  await prisma.wave.update({
    where: {
      id: waveId,
    },

    data: {
      status: targetStatus,
    },
  });

  revalidatePath("/admin");

  revalidatePath(
    "/admin/waves"
  );

  revalidatePath(
    `/admin/waves/${waveId}`
  );

  revalidatePath(
    "/admin/wms-dashboard"
  );

  redirect(
    `/admin/waves/${waveId}`
  );
}