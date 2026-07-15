"use server";

import {
  Prisma,
  WarehouseLocationType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type UpdateWarehouseLocationState = {
  success: boolean;
  message: string;
};

function normalizeText(
  formData: FormData,
  fieldName: string,
  minimumLength = 0
) {
  const value = String(
    formData.get(fieldName) ?? ""
  )
    .trim()
    .toUpperCase();

  if (!value) {
    return "";
  }

  if (
    minimumLength > 0 &&
    /^\d+$/.test(value)
  ) {
    return value.padStart(
      minimumLength,
      "0"
    );
  }

  return value;
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

function isLocationType(
  value: string
): value is WarehouseLocationType {
  return Object.values(
    WarehouseLocationType
  ).includes(
    value as WarehouseLocationType
  );
}

export async function updateWarehouseLocation(
  warehouseId: number,
  locationId: number,
  _previousState: UpdateWarehouseLocationState,
  formData: FormData
): Promise<UpdateWarehouseLocationState> {
  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0 ||
    !Number.isInteger(locationId) ||
    locationId <= 0
  ) {
    return {
      success: false,
      message:
        "Geçerli bir depo veya lokasyon bulunamadı.",
    };
  }

  const code = normalizeText(
    formData,
    "code"
  );

  const aisle = normalizeText(
    formData,
    "aisle",
    1
  );

  const section = normalizeText(
    formData,
    "section",
    2
  );

  const level = normalizeText(
    formData,
    "level",
    2
  );

  const bin = normalizeText(
    formData,
    "bin",
    2
  );

  const locationTypeValue = String(
    formData.get("locationType") ?? ""
  )
    .trim()
    .toUpperCase();

  const capacity = Number(
    formData.get("capacity") ?? 1
  );

  const sortOrder = Number(
    formData.get("sortOrder") ?? 0
  );

  const description = getOptionalText(
    formData,
    "description"
  );

  if (!code) {
    return {
      success: false,
      message:
        "Lokasyon kodu zorunludur.",
    };
  }

  if (code.length > 50) {
    return {
      success: false,
      message:
        "Lokasyon kodu en fazla 50 karakter olabilir.",
    };
  }

  if (
    !isLocationType(
      locationTypeValue
    )
  ) {
    return {
      success: false,
      message:
        "Geçerli bir lokasyon tipi seçin.",
    };
  }

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

  try {
    const location =
      await prisma.warehouseLocation.findFirst({
        where: {
          id: locationId,
          warehouseId,
        },

        include: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

    if (!location) {
      return {
        success: false,
        message:
          "Güncellenecek lokasyon bulunamadı.",
      };
    }

    const updatedLocation =
      await prisma.warehouseLocation.update({
        where: {
          id: locationId,
        },

        data: {
          code,
          aisle,
          section,
          level,
          bin,
          locationType:
            locationTypeValue,
          capacity,
          sortOrder,
          description,
        },

        select: {
          id: true,
          code: true,
          aisle: true,
          section: true,
          level: true,
          bin: true,
        },
      });

    revalidatePath(
      "/admin/warehouses"
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations`
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations/${locationId}/edit`
    );

    const fullLocationCode = [
      updatedLocation.code,
      updatedLocation.section,
      updatedLocation.level,
      updatedLocation.bin,
    ]
      .filter(Boolean)
      .join("-");

    return {
      success: true,
      message:
        `${fullLocationCode} lokasyonu başarıyla güncellendi.`,
    };
  } catch (error) {
    console.error(
      "Lokasyon güncelleme hatası:",
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
          "Aynı depo, lokasyon kodu, koridor, bölüm, kat ve göz kombinasyonu zaten kayıtlı.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lokasyon güncellenirken beklenmeyen bir hata oluştu.",
    };
  }
}