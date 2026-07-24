"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  WaveDistributionService,
} from "@/modules/fulfillment/services/wave-distribution.service";

function createWaveUrl(
  waveId: string,
  type: "success" | "error",
  message: string,
) {
  const parameters =
    new URLSearchParams({
      [type]: message,
    });

  return `/admin/waves/${waveId}?${parameters.toString()}`;
}

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Dağılım planı oluşturulamadı.";
}

export async function createWaveDistributionPlanAction(
  formData: FormData,
): Promise<void> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "WAVE_MANAGE",
    );

  const waveId = String(
    formData.get("waveId") ?? "",
  ).trim();

  if (!waveId) {
    redirect(
      "/admin/waves?error=Wave%20kimliği%20bulunamadı.",
    );
  }

  let result:
    | Awaited<
        ReturnType<
          typeof WaveDistributionService.createOrRefreshPlan
        >
      >
    | null = null;

  try {
    const displayName =
      currentUser.employee
        ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
        : currentUser.username;

    result =
      await WaveDistributionService.createOrRefreshPlan(
        waveId,
        {
          userId:
            currentUser.id,
          displayName,
        },
      );
  } catch (error) {
    redirect(
      createWaveUrl(
        waveId,
        "error",
        getErrorMessage(error),
      ),
    );
  }

  revalidatePath(
    `/admin/waves/${waveId}`,
  );

  revalidatePath(
    `/admin/waves/${waveId}/orders`,
  );

  revalidatePath(
    "/admin/waves",
  );

  revalidatePath(
    "/admin/wms-dashboard",
  );

  redirect(
    createWaveUrl(
      waveId,
      "success",
      `${result.distributionCount} alıcı sırası, ${result.orderCount} sipariş ve ${result.plannedQuantity} adet ürün için dağılım planı oluşturuldu.`,
    ),
  );
}
