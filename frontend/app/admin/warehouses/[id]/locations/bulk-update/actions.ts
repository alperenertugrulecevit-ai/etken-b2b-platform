"use server";

import {
  Prisma,
  WarehouseLocationType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type BulkUpdateLocationState = {
  success: boolean;
  message: string;
};

function getOptionalUppercaseText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  )
    .trim()
    .toUpperCase();

  return value || null;
}

function getOptionalText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  return value || null;
}

function isWarehouseLocationType(
  value: string
): value is WarehouseLocationType {
  return Object.values(
    WarehouseLocationType
  ).includes(
    value as WarehouseLocationType
  );
}

function getUniquePositiveIntegers(
  values: unknown[]
) {
  return Array.from(
    new Set(
      values
        .map(Number)
        .filter(
          (value) =>
            Number.isInteger(value) &&
            value > 0
        )
    )
  );
}

export async function bulkUpdateWarehouseLocations(
  warehouseId: number,
  _previousState: BulkUpdateLocationState,
  formData: FormData
): Promise<BulkUpdateLocationState> {
  await AuthorizationService.requirePermission(
    "LOCATION_MANAGE"
  );

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    return {
      success: false,
      message:
        "Geçerli bir depo bulunamadı.",
    };
  }

  const selectedIdsValue = String(
    formData.get("selectedIds") ?? "[]"
  );

  let parsedSelectedIds: unknown[] = [];

  try {
    const parsedValue = JSON.parse(
      selectedIdsValue
    );

    if (Array.isArray(parsedValue)) {
      parsedSelectedIds = parsedValue;
    }
  } catch {
    return {
      success: false,
      message:
        "Seçilen lokasyon bilgileri okunamadı.",
    };
  }

  const selectedIds =
    getUniquePositiveIntegers(
      parsedSelectedIds
    );

  if (selectedIds.length === 0) {
    return {
      success: false,
      message:
        "Güncellenecek en az bir lokasyon seçin.",
    };
  }

  const updateCode =
    formData.get("updateCode") === "on";

  const updateLocationType =
    formData.get(
      "updateLocationType"
    ) === "on";

  const updateCapacity =
    formData.get("updateCapacity") ===
    "on";

  const updateSortOrder =
    formData.get("updateSortOrder") ===
    "on";

  const updateDescription =
    formData.get(
      "updateDescription"
    ) === "on";

  const updateStatus =
    formData.get("updateStatus") ===
    "on";

  if (
    !updateCode &&
    !updateLocationType &&
    !updateCapacity &&
    !updateSortOrder &&
    !updateDescription &&
    !updateStatus
  ) {
    return {
      success: false,
      message:
        "Güncellenecek en az bir alanı işaretleyin.",
    };
  }

  const updateData:
    Prisma.WarehouseLocationUpdateManyMutationInput =
    {};

  if (updateCode) {
    const code =
      getOptionalUppercaseText(
        formData,
        "code"
      );

    if (!code) {
      return {
        success: false,
        message:
          "Lokasyon kodunu değiştirmek için yeni kodu girin.",
      };
    }

    if (code.length > 50) {
      return {
        success: false,
        message:
          "Lokasyon kodu en fazla 50 karakter olabilir.",
      };
    }

    updateData.code = code;
  }

  if (updateLocationType) {
    const locationTypeValue = String(
      formData.get("locationType") ?? ""
    )
      .trim()
      .toUpperCase();

    if (
      !isWarehouseLocationType(
        locationTypeValue
      )
    ) {
      return {
        success: false,
        message:
          "Geçerli bir lokasyon tipi seçin.",
      };
    }

    updateData.locationType =
      locationTypeValue;
  }

  if (updateCapacity) {
    const capacity = Number(
      formData.get("capacity")
    );

    if (
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      return {
        success: false,
        message:
          "Kapasite sıfırdan büyük bir tam sayı olmalıdır.",
      };
    }

    updateData.capacity = capacity;
  }

  if (updateSortOrder) {
    const sortOrder = Number(
      formData.get("sortOrder")
    );

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return {
        success: false,
        message:
          "Sıralama değeri sıfır veya pozitif tam sayı olmalıdır.",
      };
    }

    updateData.sortOrder = sortOrder;
  }

  if (updateDescription) {
    updateData.description =
      getOptionalText(
        formData,
        "description"
      );
  }

  if (updateStatus) {
    const statusValue = String(
      formData.get("isActive") ?? ""
    ).trim();

    if (
      statusValue !== "true" &&
      statusValue !== "false"
    ) {
      return {
        success: false,
        message:
          "Geçerli bir aktiflik durumu seçin.",
      };
    }

    updateData.isActive =
      statusValue === "true";
  }

  try {
    const selectedLocations =
      await prisma.warehouseLocation.findMany({
        where: {
          warehouseId,
          id: {
            in: selectedIds,
          },
        },
        select: {
          id: true,
        },
      });

    if (
      selectedLocations.length !==
      selectedIds.length
    ) {
      return {
        success: false,
        message:
          "Seçilen lokasyonlardan bazıları bulunamadı veya bu depoya ait değil.",
      };
    }

    const result =
      await prisma.warehouseLocation.updateMany({
        where: {
          warehouseId,
          id: {
            in: selectedIds,
          },
        },
        data: updateData,
      });

    revalidatePath(
      "/admin/warehouses"
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations`
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations/bulk-update`
    );

    return {
      success: true,
      message:
        `${result.count} lokasyon başarıyla güncellendi.`,
    };
  } catch (error) {
    console.error(
      "Toplu lokasyon güncelleme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message:
          "Toplu güncelleme sonucunda aynı lokasyon kombinasyonu oluşacağı için işlem tamamlanamadı.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lokasyonlar güncellenirken beklenmeyen bir hata oluştu.",
    };
  }
}