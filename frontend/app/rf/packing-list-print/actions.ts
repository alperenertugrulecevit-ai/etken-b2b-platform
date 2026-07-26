"use server";

import { revalidatePath } from "next/cache";

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