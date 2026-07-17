"use server";

import {
  HandlingUnitPurpose,
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

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
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
  const prefixes: Record<
    HandlingUnitType,
    string
  > = {
    [HandlingUnitType.BOX]: "KOL",
    [HandlingUnitType.PALLET]: "PLT",
    [HandlingUnitType.PICKING_BOX]:
      "PKOL",
    [HandlingUnitType.PICKING_PALLET]:
      "PPAL",
  };

  return prefixes[unitType];
}

function getHandlingUnitPurpose(
  unitType: HandlingUnitType
) {
  if (
    unitType ===
      HandlingUnitType.PICKING_BOX ||
    unitType ===
      HandlingUnitType.PICKING_PALLET
  ) {
    return HandlingUnitPurpose.PICKING;
  }

  return HandlingUnitPurpose.STOCK;
}

function getHandlingUnitLabel(
  unitType: HandlingUnitType
) {
  const labels: Record<
    HandlingUnitType,
    string
  > = {
    [HandlingUnitType.BOX]: "Koli",
    [HandlingUnitType.PALLET]: "Palet",
    [HandlingUnitType.PICKING_BOX]:
      "Toplama Kolisi",
    [HandlingUnitType.PICKING_PALLET]:
      "Toplama Paleti",
  };

  return labels[unitType];
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

  let nextNumber = 1;

  if (lastUnit) {
    const numberPart =
      lastUnit.barcode.slice(
        prefix.length
      );

    const barcodeNumber =
      Number(numberPart);

    if (
      Number.isInteger(barcodeNumber) &&
      barcodeNumber > 0
    ) {
      nextNumber =
        barcodeNumber + 1;
    } else {
      nextNumber =
        lastUnit.id + 1;
    }
  }

  let barcode = `${prefix}${String(
    nextNumber
  ).padStart(8, "0")}`;

  while (
    await prisma.handlingUnit.findUnique({
      where: {
        barcode,
      },

      select: {
        id: true,
      },
    })
  ) {
    nextNumber += 1;

    barcode = `${prefix}${String(
      nextNumber
    ).padStart(8, "0")}`;
  }

  return barcode;
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

  const purpose =
    getHandlingUnitPurpose(
      unitTypeValue
    );

  try {
    const handlingUnit =
      await prisma.handlingUnit.create({
        data: {
          barcode,
          unitType:
            unitTypeValue,
          purpose,

          status:
            HandlingUnitStatus.OPEN,

          warehouseId: null,
          locationId: null,
          parentUnitId: null,
          assignedOrderId: null,
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
      message: `${handlingUnit.barcode} numaralı ${getHandlingUnitLabel(
        handlingUnit.unitType
      )} başarıyla oluşturuldu.`,
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
          "Bu barkodla kayıtlı başka bir taşıma birimi bulunuyor.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Taşıma birimi oluşturulurken beklenmeyen bir hata oluştu.",
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