"use server";

import {
  Prisma,
  WarehouseLocationType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type WarehouseLocationActionState = {
  success: boolean;
  message: string;
};

function normalizedText(
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

function optionalText(
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

export async function createWarehouseLocation(
  warehouseId: number,
  _previousState: WarehouseLocationActionState,
  formData: FormData
): Promise<WarehouseLocationActionState> {
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

  const code = normalizedText(
    formData,
    "code"
  );

  const aisle = normalizedText(
    formData,
    "aisle",
    1
  );

  const section = normalizedText(
    formData,
    "section",
    2
  );

  const level = normalizedText(
    formData,
    "level",
    2
  );

  const bin = normalizedText(
    formData,
    "bin",
    2
  );

  const locationTypeValue = String(
    formData.get("locationType") ?? ""
  ).trim();

  const capacity = Number(
    formData.get("capacity") ?? 1
  );

  const sortOrder = Number(
    formData.get("sortOrder") ?? 0
  );

  const description = optionalText(
    formData,
    "description"
  );

  if (!code) {
    return {
      success: false,
      message:
        "Lokasyon kodu zorunludur. Örneğin A, B, IADE veya RFID.",
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
    const warehouse =
      await prisma.warehouse.findUnique({
        where: {
          id: warehouseId,
        },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      });

    if (!warehouse) {
      return {
        success: false,
        message:
          "Lokasyonun ekleneceği depo bulunamadı.",
      };
    }

    if (!warehouse.isActive) {
      return {
        success: false,
        message:
          `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`,
      };
    }

    const location =
      await prisma.warehouseLocation.create({
        data: {
          warehouseId,
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

    const fullLocation = [
      location.code,
      location.aisle,
      location.section,
      location.level,
      location.bin,
    ]
      .filter(Boolean)
      .join("-");

    return {
      success: true,
      message:
        `${fullLocation} lokasyonu başarıyla oluşturuldu.`,
    };
  } catch (error) {
    console.error(
      "Lokasyon oluşturma hatası:",
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
          "Aynı depo, lokasyon kodu, bölüm, kat ve göz kombinasyonu zaten kayıtlı.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lokasyon oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function toggleWarehouseLocationStatus(
  warehouseId: number,
  locationId: number,
  currentStatus: boolean
) {
  await AuthorizationService.requirePermission(
    "LOCATION_MANAGE"
  );

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0 ||
    !Number.isInteger(locationId) ||
    locationId <= 0
  ) {
    return;
  }

  await prisma.warehouseLocation.updateMany({
    where: {
      id: locationId,
      warehouseId,
    },
    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath(
    "/admin/warehouses"
  );

  revalidatePath(
    `/admin/warehouses/${warehouseId}/locations`
  );
}