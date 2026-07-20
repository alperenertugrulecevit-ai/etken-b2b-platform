"use server";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type BulkHandlingUnitState = {
  success: boolean;
  message: string;
  createdIds: number[];
  firstBarcode: string;
  lastBarcode: string;
};

function normalizeText(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isHandlingUnitType(
  value: string
): value is HandlingUnitType {
  return Object.values(
    HandlingUnitType
  ).includes(
    value as HandlingUnitType
  );
}

function getDefaultPrefix(
  unitType: HandlingUnitType
) {
  switch (unitType) {
    case HandlingUnitType.PALLET:
      return "PLT";

    case HandlingUnitType.BOX:
      return "KOL";

    case HandlingUnitType.PICKING_PALLET:
      return "PPAL";

    case HandlingUnitType.PICKING_BOX:
      return "PKOL";

    default:
      return "KOL";
  }
}

function getHandlingUnitPurpose(
  unitType: HandlingUnitType
) {
  switch (unitType) {
    case HandlingUnitType.PICKING_BOX:
    case HandlingUnitType.PICKING_PALLET:
      return HandlingUnitPurpose.PICKING;

    case HandlingUnitType.BOX:
    case HandlingUnitType.PALLET:
    default:
      return HandlingUnitPurpose.STOCK;
  }
}

function getHandlingUnitLabel(
  unitType: HandlingUnitType
) {
  switch (unitType) {
    case HandlingUnitType.PALLET:
      return "palet";

    case HandlingUnitType.BOX:
      return "koli";

    case HandlingUnitType.PICKING_BOX:
      return "toplama kolisi";

    case HandlingUnitType.PICKING_PALLET:
      return "toplama paleti";

    default:
      return "taşıma birimi";
  }
}

function getBarcodeNumber(
  barcode: string,
  prefix: string
) {
  if (!barcode.startsWith(prefix)) {
    return null;
  }

  const numericPart =
    barcode.slice(prefix.length);

  if (!/^\d+$/.test(numericPart)) {
    return null;
  }

  const value = Number(numericPart);

  return Number.isSafeInteger(value)
    ? value
    : null;
}

function createBarcode(
  prefix: string,
  number: number,
  digitCount: number
) {
  return `${prefix}${String(number).padStart(
    digitCount,
    "0"
  )}`;
}

export async function createBulkHandlingUnits(
  _previousState: BulkHandlingUnitState,
  formData: FormData
): Promise<BulkHandlingUnitState> {
  await AuthorizationService.requirePermission(
    "HANDLING_UNIT_MANAGE"
  );

  const unitTypeValue = normalizeText(
    formData.get("unitType")
  );

  if (
    !isHandlingUnitType(unitTypeValue)
  ) {
    return {
      success: false,
      message:
        "Geçerli bir taşıma birimi tipi seçin.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  const count = Number(
    formData.get("count")
  );

  const digitCount = Number(
    formData.get("digitCount") ?? 8
  );

  const startNumberValue = Number(
    formData.get("startNumber") ?? 0
  );

  const customPrefix = normalizeText(
    formData.get("prefix")
  );

  const description =
    String(
      formData.get("description") ?? ""
    ).trim() || null;

  const prefix =
    customPrefix ||
    getDefaultPrefix(unitTypeValue);

  const purpose =
    getHandlingUnitPurpose(
      unitTypeValue
    );

  if (
    !Number.isInteger(count) ||
    count <= 0
  ) {
    return {
      success: false,
      message:
        "Oluşturulacak barkod adedi sıfırdan büyük olmalıdır.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  if (count > 200) {
    return {
      success: false,
      message:
        "Tek işlemde en fazla 200 barkod oluşturabilirsiniz.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  if (
    !/^[A-Z0-9-]+$/.test(prefix)
  ) {
    return {
      success: false,
      message:
        "Barkod ön ekinde yalnızca harf, rakam ve tire kullanılabilir.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  if (prefix.length > 20) {
    return {
      success: false,
      message:
        "Barkod ön eki en fazla 20 karakter olabilir.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  if (
    !Number.isInteger(digitCount) ||
    digitCount < 4 ||
    digitCount > 12
  ) {
    return {
      success: false,
      message:
        "Numara uzunluğu 4 ile 12 basamak arasında olmalıdır.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  if (
    !Number.isInteger(startNumberValue) ||
    startNumberValue < 0
  ) {
    return {
      success: false,
      message:
        "Başlangıç numarası sıfır veya pozitif tam sayı olmalıdır.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          let startNumber =
            startNumberValue;

          /*
           * Başlangıç numarası 0 ise
           * seçilen ön eke ait mevcut en
           * büyük numaradan devam edilir.
           */
          if (startNumber === 0) {
            const existingUnits =
              await tx.handlingUnit.findMany({
                where: {
                  barcode: {
                    startsWith: prefix,
                  },
                },
                select: {
                  barcode: true,
                },
              });

            let maximumNumber = 0;

            for (
              const unit of existingUnits
            ) {
              const barcodeNumber =
                getBarcodeNumber(
                  unit.barcode,
                  prefix
                );

              if (
                barcodeNumber !== null &&
                barcodeNumber >
                  maximumNumber
              ) {
                maximumNumber =
                  barcodeNumber;
              }
            }

            startNumber =
              maximumNumber + 1;
          }

          const lastNumber =
            startNumber + count - 1;

          if (
            String(lastNumber).length >
            digitCount
          ) {
            throw new Error(
              `${digitCount} basamaklı numara alanı seçilen adet için yetersiz.`
            );
          }

          const barcodes = Array.from(
            {
              length: count,
            },
            (_, index) =>
              createBarcode(
                prefix,
                startNumber + index,
                digitCount
              )
          );

          const existingBarcode =
            await tx.handlingUnit.findFirst({
              where: {
                barcode: {
                  in: barcodes,
                },
              },
              select: {
                barcode: true,
              },
            });

          if (existingBarcode) {
            throw new Error(
              `${existingBarcode.barcode} barkodu daha önce oluşturulmuş. ` +
                "Başlangıç numarasını değiştirin veya otomatik numaralandırma kullanın."
            );
          }

          const createdUnits =
            await tx.handlingUnit.createManyAndReturn({
              data: barcodes.map(
                (barcode) => ({
                  barcode,
                  unitType:
                    unitTypeValue,
                  purpose,
                  status:
                    HandlingUnitStatus.OPEN,
                  warehouseId: null,
                  locationId: null,
                  parentUnitId: null,
                  description,
                })
              ),
              select: {
                id: true,
                barcode: true,
              },
            });

          createdUnits.sort(
            (first, second) =>
              first.barcode.localeCompare(
                second.barcode
              )
          );

          return {
            createdIds:
              createdUnits.map(
                (unit) => unit.id
              ),
            firstBarcode:
              createdUnits[0]
                ?.barcode ?? "",
            lastBarcode:
              createdUnits[
                createdUnits.length - 1
              ]?.barcode ?? "",
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );

    revalidatePath("/admin");

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      "/admin/handling-units/bulk"
    );

    return {
      success: true,
      message:
        `${count} adet ${getHandlingUnitLabel(
          unitTypeValue
        )} barkodu başarıyla oluşturuldu.`,
      createdIds:
        result.createdIds,
      firstBarcode:
        result.firstBarcode,
      lastBarcode:
        result.lastBarcode,
    };
  } catch (error) {
    console.error(
      "Toplu taşıma birimi oluşturma hatası:",
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
          "Oluşturulmak istenen barkodlardan biri daha önce kayıt edilmiş.",
        createdIds: [],
        firstBarcode: "",
        lastBarcode: "",
      };
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        success: false,
        message:
          "Aynı anda başka bir barkod oluşturma işlemi yapıldı. Lütfen tekrar deneyin.",
        createdIds: [],
        firstBarcode: "",
        lastBarcode: "",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Barkodlar oluşturulurken beklenmeyen bir hata oluştu.",
      createdIds: [],
      firstBarcode: "",
      lastBarcode: "",
    };
  }
}