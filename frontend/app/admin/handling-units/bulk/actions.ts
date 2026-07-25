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

type SupportedPurpose =
  | typeof HandlingUnitPurpose.STOCK
  | typeof HandlingUnitPurpose.PICKING
  | typeof HandlingUnitPurpose.SHIPPING;

type PhysicalUnitType = "BOX" | "PALLET";

function emptyResult(
  message: string
): BulkHandlingUnitState {
  return {
    success: false,
    message,
    createdIds: [],
    firstBarcode: "",
    lastBarcode: "",
  };
}

function normalizeText(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isSupportedPurpose(
  value: string
): value is SupportedPurpose {
  return (
    value === HandlingUnitPurpose.STOCK ||
    value === HandlingUnitPurpose.PICKING ||
    value === HandlingUnitPurpose.SHIPPING
  );
}

function isPhysicalUnitType(
  value: string
): value is PhysicalUnitType {
  return (
    value === HandlingUnitType.BOX ||
    value === HandlingUnitType.PALLET
  );
}

function resolveUnitType(
  purpose: SupportedPurpose,
  physicalUnitType: PhysicalUnitType
): HandlingUnitType {
  if (purpose === HandlingUnitPurpose.PICKING) {
    return physicalUnitType === "PALLET"
      ? HandlingUnitType.PICKING_PALLET
      : HandlingUnitType.PICKING_BOX;
  }

  return physicalUnitType === "PALLET"
    ? HandlingUnitType.PALLET
    : HandlingUnitType.BOX;
}

function getDefaultPrefix(
  purpose: SupportedPurpose,
  physicalUnitType: PhysicalUnitType
) {
  if (purpose === HandlingUnitPurpose.PICKING) {
    return physicalUnitType === "PALLET"
      ? "PPAL"
      : "PKOL";
  }

  if (purpose === HandlingUnitPurpose.SHIPPING) {
    return physicalUnitType === "PALLET"
      ? "SPAL"
      : "SKOL";
  }

  return physicalUnitType === "PALLET"
    ? "PLT"
    : "KOL";
}

function getHandlingUnitLabel(
  purpose: SupportedPurpose,
  physicalUnitType: PhysicalUnitType
) {
  const physicalLabel =
    physicalUnitType === "PALLET"
      ? "paleti"
      : "kolisi";

  if (purpose === HandlingUnitPurpose.PICKING) {
    return `toplama ${physicalLabel}`;
  }

  if (purpose === HandlingUnitPurpose.SHIPPING) {
    return `sevk ${physicalLabel}`;
  }

  return `stok ${physicalLabel}`;
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

  const purposeValue = normalizeText(
    formData.get("purpose")
  );

  if (!isSupportedPurpose(purposeValue)) {
    return emptyResult(
      "Geçerli bir kullanım amacı seçin."
    );
  }

  const physicalUnitTypeValue =
    normalizeText(
      formData.get("physicalUnitType")
    );

  if (
    !isPhysicalUnitType(
      physicalUnitTypeValue
    )
  ) {
    return emptyResult(
      "Geçerli bir fiziksel taşıma birimi tipi seçin."
    );
  }

  const unitType = resolveUnitType(
    purposeValue,
    physicalUnitTypeValue
  );

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
    getDefaultPrefix(
      purposeValue,
      physicalUnitTypeValue
    );

  if (
    !Number.isInteger(count) ||
    count <= 0
  ) {
    return emptyResult(
      "Oluşturulacak barkod adedi sıfırdan büyük olmalıdır."
    );
  }

  if (count > 200) {
    return emptyResult(
      "Tek işlemde en fazla 200 barkod oluşturabilirsiniz."
    );
  }

  if (!/^[A-Z0-9-]+$/.test(prefix)) {
    return emptyResult(
      "Barkod ön ekinde yalnızca harf, rakam ve tire kullanılabilir."
    );
  }

  if (prefix.length > 20) {
    return emptyResult(
      "Barkod ön eki en fazla 20 karakter olabilir."
    );
  }

  if (
    !Number.isInteger(digitCount) ||
    digitCount < 4 ||
    digitCount > 12
  ) {
    return emptyResult(
      "Numara uzunluğu 4 ile 12 basamak arasında olmalıdır."
    );
  }

  if (
    !Number.isInteger(startNumberValue) ||
    startNumberValue < 0
  ) {
    return emptyResult(
      "Başlangıç numarası sıfır veya pozitif tam sayı olmalıdır."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          let startNumber =
            startNumberValue;

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
                  unitType,
                  purpose:
                    purposeValue,
                  status:
                    HandlingUnitStatus.OPEN,
                  warehouseId: null,
                  locationId: null,
                  parentUnitId: null,
                  assignedOrderId: null,
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
          purposeValue,
          physicalUnitTypeValue
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
      return emptyResult(
        "Oluşturulmak istenen barkodlardan biri daha önce kaydedilmiş."
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return emptyResult(
        "Aynı anda başka bir barkod oluşturma işlemi yapıldı. Lütfen tekrar deneyin."
      );
    }

    return emptyResult(
      error instanceof Error
        ? error.message
        : "Barkodlar oluşturulurken beklenmeyen bir hata oluştu."
    );
  }
}
