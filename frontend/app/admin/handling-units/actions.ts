"use server";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  prisma,
} from "@/lib/prisma";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

export type HandlingUnitActionState = {
  success: boolean;
  message: string;
  handlingUnitId: number | null;
  barcode: string;
  purpose:
    | "STOCK"
    | "PICKING"
    | "SHIPPING"
    | "";
};

const CREATE_PURPOSES: HandlingUnitPurpose[] = [
  HandlingUnitPurpose.STOCK,
  HandlingUnitPurpose.PICKING,
  HandlingUnitPurpose.SHIPPING,
];

type PhysicalUnitType =
  | "BOX"
  | "PALLET";

type CreatePurpose =
  | "STOCK"
  | "PICKING"
  | "SHIPPING";

function normalizeBarcode(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getOptionalText(
  formData: FormData,
  fieldName: string,
) {
  const value = String(
    formData.get(fieldName) ?? "",
  ).trim();

  return value || null;
}

function isPhysicalUnitType(
  value: string,
): value is PhysicalUnitType {
  return (
    value ===
      HandlingUnitType.BOX ||
    value ===
      HandlingUnitType.PALLET
  );
}

function isCreatePurpose(
  value: string,
): value is CreatePurpose {
  return CREATE_PURPOSES.includes(
    value as HandlingUnitPurpose,
  );
}

function resolveUnitType(
  physicalType: PhysicalUnitType,
  purpose: CreatePurpose,
) {
  if (
    purpose ===
    HandlingUnitPurpose.PICKING
  ) {
    return physicalType ===
      HandlingUnitType.BOX
      ? HandlingUnitType.PICKING_BOX
      : HandlingUnitType.PICKING_PALLET;
  }

  return physicalType;
}

function getBarcodePrefix(
  physicalType: PhysicalUnitType,
  purpose: CreatePurpose,
) {
  if (
    purpose ===
    HandlingUnitPurpose.SHIPPING
  ) {
    return physicalType ===
      HandlingUnitType.BOX
      ? "SKOL"
      : "SPAL";
  }

  if (
    purpose ===
    HandlingUnitPurpose.PICKING
  ) {
    return physicalType ===
      HandlingUnitType.BOX
      ? "PKOL"
      : "PPAL";
  }

  return physicalType ===
    HandlingUnitType.BOX
    ? "KOL"
    : "PLT";
}

function getHandlingUnitLabel(
  physicalType: PhysicalUnitType,
  purpose: CreatePurpose,
) {
  const typeLabel =
    physicalType ===
    HandlingUnitType.BOX
      ? "Kolisi"
      : "Paleti";

  if (
    purpose ===
    HandlingUnitPurpose.SHIPPING
  ) {
    return `Sevk ${typeLabel}`;
  }

  if (
    purpose ===
    HandlingUnitPurpose.PICKING
  ) {
    return `Toplama ${typeLabel}`;
  }

  return `Stok ${typeLabel}`;
}

async function createAutomaticBarcode(
  physicalType: PhysicalUnitType,
  purpose: CreatePurpose,
) {
  const prefix =
    getBarcodePrefix(
      physicalType,
      purpose,
    );

  const lastUnit =
    await prisma.handlingUnit.findFirst({
      where: {
        purpose,
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
    const barcodeNumber =
      Number(
        lastUnit.barcode.slice(
          prefix.length,
        ),
      );

    nextNumber =
      Number.isInteger(
        barcodeNumber,
      ) &&
      barcodeNumber > 0
        ? barcodeNumber + 1
        : lastUnit.id + 1;
  }

  let barcode =
    `${prefix}${String(
      nextNumber,
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

    barcode =
      `${prefix}${String(
        nextNumber,
      ).padStart(8, "0")}`;
  }

  return barcode;
}

export async function createHandlingUnit(
  _previousState: HandlingUnitActionState,
  formData: FormData,
): Promise<HandlingUnitActionState> {
  await AuthorizationService.requirePermission(
    "HANDLING_UNIT_MANAGE",
  );

  const physicalTypeValue =
    String(
      formData.get("unitType") ??
        "",
    )
      .trim()
      .toUpperCase();

  const purposeValue =
    String(
      formData.get("purpose") ??
        "",
    )
      .trim()
      .toUpperCase();

  if (
    !isPhysicalUnitType(
      physicalTypeValue,
    )
  ) {
    return {
      success: false,
      message:
        "Koli veya palet tiplerinden birini seçin.",
      handlingUnitId: null,
      barcode: "",
      purpose: "",
    };
  }

  if (
    !isCreatePurpose(
      purposeValue,
    )
  ) {
    return {
      success: false,
      message:
        "Stok, Toplama veya Sevk kullanım amaçlarından birini seçin.",
      handlingUnitId: null,
      barcode: "",
      purpose: "",
    };
  }

  const manualBarcode =
    normalizeBarcode(
      formData.get("barcode"),
    );

  const useAutomaticBarcode =
    formData.get(
      "useAutomaticBarcode",
    ) === "on";

  const description =
    getOptionalText(
      formData,
      "description",
    );

  let barcode = manualBarcode;

  if (useAutomaticBarcode) {
    barcode =
      await createAutomaticBarcode(
        physicalTypeValue,
        purposeValue,
      );
  }

  if (!barcode) {
    return {
      success: false,
      message:
        "Barkod girin veya otomatik barkod oluşturmayı seçin.",
      handlingUnitId: null,
      barcode: "",
      purpose: "",
    };
  }

  if (barcode.length > 60) {
    return {
      success: false,
      message:
        "Barkod en fazla 60 karakter olabilir.",
      handlingUnitId: null,
      barcode: "",
      purpose: "",
    };
  }

  const unitType =
    resolveUnitType(
      physicalTypeValue,
      purposeValue,
    );

  try {
    const handlingUnit =
      await prisma.handlingUnit.create({
        data: {
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
          assignedWaveId: null,
          description,
        },
        select: {
          id: true,
          barcode: true,
        },
      });

    revalidatePath("/admin");

    revalidatePath(
      "/admin/handling-units",
    );

    revalidatePath(
      "/rf/packing",
    );

    revalidatePath(
      "/rf/picking",
    );

    return {
      success: true,
      message:
        `${handlingUnit.barcode} numaralı ` +
        `${getHandlingUnitLabel(
          physicalTypeValue,
          purposeValue,
        )} başarıyla oluşturuldu.`,
      handlingUnitId:
        handlingUnit.id,
      barcode:
        handlingUnit.barcode,
      purpose:
        purposeValue,
    };
  } catch (error) {
    console.error(
      "Taşıma birimi oluşturma hatası:",
      error,
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
        handlingUnitId: null,
        barcode: "",
        purpose: "",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Taşıma birimi oluşturulurken beklenmeyen bir hata oluştu.",
      handlingUnitId: null,
      barcode: "",
      purpose: "",
    };
  }
}

export async function toggleHandlingUnitStatus(
  handlingUnitId: number,
  currentStatus: HandlingUnitStatus,
) {
  await AuthorizationService.requirePermission(
    "HANDLING_UNIT_MANAGE",
  );

  if (
    !Number.isInteger(
      handlingUnitId,
    ) ||
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
        purpose: true,
        shippingProfile: {
          select: {
            status: true,
          },
        },
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

  if (
    handlingUnit.purpose ===
      HandlingUnitPurpose.SHIPPING &&
    handlingUnit.shippingProfile
  ) {
    return;
  }

  const hasContent =
    handlingUnit.items.some(
      (item) =>
        item.quantity > 0,
    ) ||
    handlingUnit.childUnits.length >
      0;

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
    "/admin/handling-units",
  );

  revalidatePath(
    `/admin/handling-units/${handlingUnitId}`,
  );
}
