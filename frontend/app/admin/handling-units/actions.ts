"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type HandlingUnitActionState = {
  success: boolean;
  message: string;
};

function normalizeBarcode(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
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

function isHandlingUnitType(
  value: string
): value is HandlingUnitType {
  return Object.values(
    HandlingUnitType
  ).includes(
    value as HandlingUnitType
  );
}

function getBarcodePrefix(
  unitType: HandlingUnitType
) {
  return unitType ===
    HandlingUnitType.PALLET
    ? "PLT"
    : "KOL";
}

async function createAutomaticBarcode(
  unitType: HandlingUnitType
) {
  const prefix =
    getBarcodePrefix(unitType);

  const lastUnit =
    await prisma.handlingUnit.findFirst({
      where: {
        unitType,
        barcode: {
          startsWith: prefix,
        },
      },

      orderBy: {
        id: "desc",
      },

      select: {
        id: true,
        barcode: true,
      },
    });

  let nextNumber =
    (lastUnit?.id ?? 0) + 1;

  if (lastUnit) {
    const barcodeNumber =
      Number(
        lastUnit.barcode.replace(
          prefix,
          ""
        )
      );

    if (
      Number.isInteger(barcodeNumber) &&
      barcodeNumber >= nextNumber
    ) {
      nextNumber =
        barcodeNumber + 1;
    }
  }

  return `${prefix}${String(
    nextNumber
  ).padStart(8, "0")}`;
}

export async function createHandlingUnit(
  _previousState: HandlingUnitActionState,
  formData: FormData
): Promise<HandlingUnitActionState> {
  const unitTypeValue = String(
    formData.get("unitType") ?? ""
  )
    .trim()
    .toUpperCase();

  if (
    !isHandlingUnitType(
      unitTypeValue
    )
  ) {
    return {
      success: false,
      message:
        "Geçerli bir taşıma birimi tipi seçin.",
    };
  }

  const manualBarcode =
    normalizeBarcode(
      formData.get("barcode")
    );

  const useAutomaticBarcode =
    formData.get(
      "useAutomaticBarcode"
    ) === "on";

  const description =
    getOptionalText(
      formData,
      "description"
    );

  let barcode = manualBarcode;

  if (useAutomaticBarcode) {
    barcode =
      await createAutomaticBarcode(
        unitTypeValue
      );
  }

  if (!barcode) {
    return {
      success: false,
      message:
        "Barkod girin veya otomatik barkod oluşturmayı seçin.",
    };
  }

  if (barcode.length > 60) {
    return {
      success: false,
      message:
        "Barkod en fazla 60 karakter olabilir.",
    };
  }

  try {
    const handlingUnit =
      await prisma.handlingUnit.create({
        data: {
          barcode,
          unitType:
            unitTypeValue,

          status:
            HandlingUnitStatus.OPEN,

          warehouseId: null,
          locationId: null,
          parentUnitId: null,
          description,
        },

        select: {
          id: true,
          barcode: true,
          unitType: true,
        },
      });

    revalidatePath("/admin");
    revalidatePath(
      "/admin/handling-units"
    );

    return {
      success: true,
      message:
        `${handlingUnit.barcode} ${
          handlingUnit.unitType ===
          HandlingUnitType.PALLET
            ? "paleti"
            : "kolisi"
        } başarıyla oluşturuldu.`,
    };
  } catch (error) {
    console.error(
      "Taşıma birimi oluşturma hatası:",
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
          "Bu barkodla kayıtlı başka bir koli veya palet bulunuyor.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Koli veya palet oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function toggleHandlingUnitStatus(
  handlingUnitId: number,
  currentStatus: HandlingUnitStatus
) {
  if (
    !Number.isInteger(handlingUnitId) ||
    handlingUnitId <= 0
  ) {
    return;
  }

  const handlingUnit =
    await prisma.handlingUnit.findUnique({
      where: {
        id: handlingUnitId,
      },

      select: {
        id: true,
        status: true,

        items: {
          select: {
            quantity: true,
          },
        },

        childUnits: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!handlingUnit) {
    return;
  }

  const hasContent =
    handlingUnit.items.some(
      (item) => item.quantity > 0
    ) ||
    handlingUnit.childUnits.length > 0;

  let nextStatus:
    HandlingUnitStatus;

  if (
    currentStatus ===
    HandlingUnitStatus.OPEN
  ) {
    nextStatus =
      HandlingUnitStatus.CLOSED;
  } else if (
    currentStatus ===
      HandlingUnitStatus.CLOSED ||
    currentStatus ===
      HandlingUnitStatus.EMPTY
  ) {
    nextStatus =
      HandlingUnitStatus.OPEN;
  } else {
    return;
  }

  if (
    nextStatus ===
      HandlingUnitStatus.CLOSED &&
    !hasContent
  ) {
    return;
  }

  await prisma.handlingUnit.update({
    where: {
      id: handlingUnitId,
    },

    data: {
      status: nextStatus,
    },
  });

  revalidatePath(
    "/admin/handling-units"
  );
}