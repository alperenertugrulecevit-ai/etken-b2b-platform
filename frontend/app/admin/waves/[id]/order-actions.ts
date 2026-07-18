"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addOrdersToWave,
  removeOrdersFromWave,
} from "@/lib/wms/wave-order-service";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Beklenmeyen bir işlem hatası oluştu.";
}

function createOrdersPageUrl(
  waveId: string,
  type: "success" | "error",
  message: string
) {
  const parameters = new URLSearchParams();

  parameters.set(type, message);

  return `/admin/waves/${waveId}/orders?${parameters.toString()}`;
}

function refreshWavePages(waveId: string) {
  revalidatePath("/admin/waves");
  revalidatePath(`/admin/waves/${waveId}`);
  revalidatePath(
    `/admin/waves/${waveId}/orders`
  );
  revalidatePath("/admin/wms-dashboard");
}

export async function addOrdersToWaveAction(
  formData: FormData
) {
  const waveIdValue =
    formData.get("waveId");

  if (
    typeof waveIdValue !== "string" ||
    !waveIdValue.trim()
  ) {
    redirect(
      "/admin/waves?error=Wave%20kimliği%20bulunamadı."
    );
  }

  const waveId = waveIdValue.trim();

  const orderIds = formData
    .getAll("orderIds")
    .map((value) => Number(value))
    .filter((value) =>
      Number.isInteger(value)
    );

  let addedOrderCount = 0;

  try {
    const result = await addOrdersToWave(
      waveId,
      orderIds
    );

    addedOrderCount =
      result.addedOrderCount;
  } catch (error) {
    redirect(
      createOrdersPageUrl(
        waveId,
        "error",
        getErrorMessage(error)
      )
    );
  }

  refreshWavePages(waveId);

  redirect(
    createOrdersPageUrl(
      waveId,
      "success",
      `${addedOrderCount} sipariş Wave’e eklendi.`
    )
  );
}

export async function removeOrdersFromWaveAction(
  formData: FormData
) {
  const waveIdValue =
    formData.get("waveId");

  if (
    typeof waveIdValue !== "string" ||
    !waveIdValue.trim()
  ) {
    redirect(
      "/admin/waves?error=Wave%20kimliği%20bulunamadı."
    );
  }

  const waveId = waveIdValue.trim();

  const waveOrderIds = formData
    .getAll("waveOrderIds")
    .map((value) => String(value))
    .filter(Boolean);

  let removedOrderCount = 0;

  try {
    const result =
      await removeOrdersFromWave(
        waveId,
        waveOrderIds
      );

    removedOrderCount =
      result.removedOrderCount;
  } catch (error) {
    redirect(
      createOrdersPageUrl(
        waveId,
        "error",
        getErrorMessage(error)
      )
    );
  }

  refreshWavePages(waveId);

  redirect(
    createOrdersPageUrl(
      waveId,
      "success",
      `${removedOrderCount} sipariş Wave’den çıkarıldı.`
    )
  );
}