"use server";

import {
  WarehouseLocationType,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type BulkLocationActionState = {
  success: boolean;
  message: string;
};

type LocationRange = {
  start: number;
  end: number;
};

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function parseInteger(
  formData: FormData,
  fieldName: string
) {
  return Number(
    formData.get(fieldName) ?? 0
  );
}

function validateRange({
  start,
  end,
}: LocationRange) {
  return (
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    end >= start
  );
}

function padLocationPart(value: number) {
  return String(value).padStart(2, "0");
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

export async function createBulkWarehouseLocations(
  warehouseId: number,
  _previousState: BulkLocationActionState,
  formData: FormData
): Promise<BulkLocationActionState> {
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

  const code = normalizeText(
    formData.get("code")
  );

  const aisle =
    normalizeText(
      formData.get("aisle")
    ) || code;

  const sectionStart = parseInteger(
    formData,
    "sectionStart"
  );

  const sectionEnd = parseInteger(
    formData,
    "sectionEnd"
  );

  const levelStart = parseInteger(
    formData,
    "levelStart"
  );

  const levelEnd = parseInteger(
    formData,
    "levelEnd"
  );

  const binStart = parseInteger(
    formData,
    "binStart"
  );

  const binEnd = parseInteger(
    formData,
    "binEnd"
  );

  const capacity = parseInteger(
    formData,
    "capacity"
  );

  const sortOrderStart = parseInteger(
    formData,
    "sortOrderStart"
  );

  const locationTypeValue =
    normalizeText(
      formData.get("locationType")
    );

  const description =
    String(
      formData.get("description") ?? ""
    ).trim() || null;

  if (!code) {
    return {
      success: false,
      message:
        "Lokasyon kodu zorunludur. Örneğin A, B veya C.",
    };
  }

  if (!aisle) {
    return {
      success: false,
      message:
        "Koridor bilgisi zorunludur.",
    };
  }

  if (
    !validateRange({
      start: sectionStart,
      end: sectionEnd,
    })
  ) {
    return {
      success: false,
      message:
        "Bölüm başlangıç ve bitiş değerleri geçerli değil.",
    };
  }

  if (
    !validateRange({
      start: levelStart,
      end: levelEnd,
    })
  ) {
    return {
      success: false,
      message:
        "Kat başlangıç ve bitiş değerleri geçerli değil.",
    };
  }

  if (
    !validateRange({
      start: binStart,
      end: binEnd,
    })
  ) {
    return {
      success: false,
      message:
        "Göz başlangıç ve bitiş değerleri geçerli değil.",
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
    !Number.isInteger(sortOrderStart) ||
    sortOrderStart < 0
  ) {
    return {
      success: false,
      message:
        "Başlangıç sıra değeri sıfır veya pozitif olmalıdır.",
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

  const sectionCount =
    sectionEnd -
    sectionStart +
    1;

  const levelCount =
    levelEnd -
    levelStart +
    1;

  const binCount =
    binEnd -
    binStart +
    1;

  const requestedLocationCount =
    sectionCount *
    levelCount *
    binCount;

  if (requestedLocationCount <= 0) {
    return {
      success: false,
      message:
        "Oluşturulacak lokasyon bulunamadı.",
    };
  }

  if (requestedLocationCount > 2000) {
    return {
      success: false,
      message:
        "Tek işlemde en fazla 2.000 lokasyon oluşturabilirsiniz.",
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
          "Lokasyonların ekleneceği depo bulunamadı.",
      };
    }

    if (!warehouse.isActive) {
      return {
        success: false,
        message:
          `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`,
      };
    }

    const locations: {
      warehouseId: number;
      code: string;
      aisle: string;
      section: string;
      level: string;
      bin: string;
      locationType: WarehouseLocationType;
      capacity: number;
      sortOrder: number;
      description: string | null;
    }[] = [];

    let sortOrder = sortOrderStart;

    for (
      let section = sectionStart;
      section <= sectionEnd;
      section++
    ) {
      for (
        let level = levelStart;
        level <= levelEnd;
        level++
      ) {
        for (
          let bin = binStart;
          bin <= binEnd;
          bin++
        ) {
          locations.push({
            warehouseId,
            code,
            aisle,
            section:
              padLocationPart(section),
            level:
              padLocationPart(level),
            bin:
              padLocationPart(bin),
            locationType:
              locationTypeValue,
            capacity,
            sortOrder,
            description,
          });

          sortOrder++;
        }
      }
    }

    const result =
      await prisma.warehouseLocation.createMany({
        data: locations,

        /*
         * Aynı kombinasyon daha önce varsa
         * o kayıt atlanır, diğerleri oluşturulur.
         */
        skipDuplicates: true,
      });

    const skippedCount =
      requestedLocationCount -
      result.count;

    revalidatePath("/admin");
    revalidatePath(
      "/admin/warehouses"
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations`
    );

    revalidatePath(
      `/admin/warehouses/${warehouseId}/locations/bulk`
    );

    if (result.count === 0) {
      return {
        success: false,
        message:
          "Seçilen aralıktaki tüm lokasyonlar daha önce oluşturulmuş.",
      };
    }

    return {
      success: true,
      message:
        `${result.count} lokasyon başarıyla oluşturuldu.` +
        (
          skippedCount > 0
            ? ` ${skippedCount} tekrarlı lokasyon atlandı.`
            : ""
        ),
    };
  } catch (error) {
    console.error(
      "Toplu lokasyon oluşturma hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lokasyonlar oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }
}