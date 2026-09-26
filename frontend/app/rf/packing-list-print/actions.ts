"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ShippingHandlingUnitStatus, WmsOperationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { PackingListPrintService } from "@/modules/printing/services/packing-list-print.service";

export type RFPackingListPrintState = {
  success: boolean;
  message: string;
  requiresConfirmation: boolean;
  shippingHandlingUnitBarcode: string;
  printerId: string;
};

function createState(
  message: string,
  options?: {
    success?: boolean;
    requiresConfirmation?: boolean;
    shippingHandlingUnitBarcode?: string;
    printerId?: string;
  }
): RFPackingListPrintState {
  return {
    success:
      options?.success ?? false,
    message,
    requiresConfirmation:
      options?.requiresConfirmation ??
      false,
    shippingHandlingUnitBarcode:
      options
        ?.shippingHandlingUnitBarcode ??
      "",
    printerId:
      options?.printerId ?? "",
  };
}

function readText(
  formData: FormData,
  fieldName: string
) {
  return String(
    formData.get(fieldName) ?? ""
  ).trim();
}

function readBarcode(
  formData: FormData,
  fieldName: string
) {
  return readText(
    formData,
    fieldName
  ).toUpperCase();
}

export async function printPackingListAction(
  _previousState: RFPackingListPrintState,
  formData: FormData
): Promise<RFPackingListPrintState> {
  const profile =
    await AuthorizationService.requireRfAccess(
      "PICKING_EXECUTE"
    );

  const printerId =
    readText(
      formData,
      "printerId"
    );

  const shippingHandlingUnitBarcode =
    readBarcode(
      formData,
      "shippingHandlingUnitBarcode"
    );

  const terminalCode =
    readBarcode(
      formData,
      "terminalCode"
    );

  const forceReprint =
    formData.get("forceReprint") ===
    "true";

  if (!printerId) {
    return createState(
      "Önce barkod yazıcısını seçin.",
      {
        shippingHandlingUnitBarcode,
      }
    );
  }

  if (
    !shippingHandlingUnitBarcode
  ) {
    return createState(
      "Sevk THM barkodunu okutun.",
      {
        printerId,
      }
    );
  }

  const displayName =
    profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

  try {
    const result =
      await PackingListPrintService.print(
        {
          printerId,

          shippingHandlingUnitBarcode,

          forceReprint,

          actor: {
            userId:
              profile.id,

            displayName,

            terminalCode:
              terminalCode ||
              null,
          },
        }
      );

    if (
      result.requiresConfirmation
    ) {
      return createState(
        result.message,
        {
          success: false,
          requiresConfirmation:
            true,
          shippingHandlingUnitBarcode,
          printerId,
        }
      );
    }

    if (!result.success) {
      return createState(
        result.message,
        {
          shippingHandlingUnitBarcode,
          printerId,
        }
      );
    }

    revalidatePath(
      "/rf/packing-list-print"
    );

    revalidatePath(
      "/rf/packing"
    );

    revalidatePath(
      "/rf/shipping"
    );

    revalidatePath(
      "/admin/handling-units"
    );

    return createState(
      result.message,
      {
        success: true,
        shippingHandlingUnitBarcode,
        printerId,
      }
    );
  } catch (error) {
    console.error(
      "RF çeki listesi baskı hatası:",
      error
    );

    return createState(
      error instanceof Error
        ? error.message
        : "Çeki listesi yazdırılırken beklenmeyen bir hata oluştu.",
      {
        shippingHandlingUnitBarcode,
        printerId,
      }
    );
  }
}

export async function confirmPackingListWithoutPrintAction(
  formData: FormData
) {
  const profile =
    await AuthorizationService.requireRfAccess(
      "PICKING_EXECUTE"
    );

  const barcode =
    readBarcode(
      formData,
      "shippingHandlingUnitBarcode"
    );

  if (!barcode) {
    redirect(
      "/rf/packing-list-print?manualError=" +
        encodeURIComponent("Sevk THM barkodunu okutun.")
    );
  }

  const shippingUnit =
    await prisma.shippingHandlingUnit.findFirst({
      where: {
        handlingUnit: {
          barcode,
        },
      },
      select: {
        id: true,
        status: true,
        packingListPrintedAt: true,
        packingListPrintCount: true,
        handlingUnit: {
          select: {
            id: true,
            barcode: true,
          },
        },
        items: {
          where: {
            quantity: {
              gt: 0,
            },
          },
          select: {
            quantity: true,
          },
        },
      },
    });

  if (!shippingUnit) {
    redirect(
      "/rf/packing-list-print?manualError=" +
        encodeURIComponent(
          `${barcode} barkodlu Sevk THM bulunamadı.`
        )
    );
  }

  if (
    shippingUnit.status !==
      ShippingHandlingUnitStatus.READY_TO_SHIP &&
    shippingUnit.status !==
      ShippingHandlingUnitStatus.SHIPPED
  ) {
    redirect(
      "/rf/packing-list-print?manualError=" +
        encodeURIComponent(
          "Sevk THM kapatılmış ve sevke hazır durumda olmalıdır."
        )
    );
  }

  const totalQuantity =
    shippingUnit.items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  if (totalQuantity <= 0) {
    redirect(
      "/rf/packing-list-print?manualError=" +
        encodeURIComponent(
          "Sevk THM içerisinde çeki listesine alınacak ürün bulunamadı."
        )
    );
  }

  const displayName =
    profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

  const confirmedAt =
    new Date();

  await prisma.$transaction([
    prisma.shippingHandlingUnit.update({
      where: {
        id: shippingUnit.id,
      },
      data: {
        packingListPrintedAt:
          confirmedAt,
        packingListPrintCount:
          Math.max(
            1,
            shippingUnit.packingListPrintCount
          ),
        packingListLastPrinterCode:
          "MANUAL-CONFIRM",
      },
    }),
    prisma.wmsOperationLog.create({
      data: {
        operationType:
          WmsOperationType.OTHER,
        module:
          "RF_PACKING_LIST_MANUAL_CONFIRM",
        entityType:
          "SHIPPING_HANDLING_UNIT",
        entityId:
          shippingUnit.handlingUnit.id,
        operatorId:
          profile.id,
        operatorName:
          displayName,
        barcode:
          shippingUnit.handlingUnit.barcode,
        quantity:
          totalQuantity,
        description:
          `${shippingUnit.handlingUnit.barcode} Sevk THM çeki listesi fiziksel yazdırma yapılmadan kullanıcı onayıyla basılmış olarak işaretlendi.`,
        metadata: {
          shippingHandlingUnitId:
            shippingUnit.id,
          confirmationType:
            "WITHOUT_PHYSICAL_PRINT",
          previousPrintedAt:
            shippingUnit.packingListPrintedAt,
          previousPrintCount:
            shippingUnit.packingListPrintCount,
        },
        isSuccessful:
          true,
      },
    }),
  ]);

  revalidatePath(
    "/rf/packing-list-print"
  );
  revalidatePath(
    "/rf/packing-list-preview"
  );
  revalidatePath(
    "/rf/shipment-routing"
  );
  revalidatePath(
    "/admin/shipping-planning"
  );

  redirect(
    "/rf/packing-list-preview?barcode=" +
      encodeURIComponent(barcode) +
      "&confirmed=1"
  );
}
