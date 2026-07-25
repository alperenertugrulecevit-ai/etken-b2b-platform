"use server";

import {
  revalidatePath,
} from "next/cache";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import {
  ShippingService,
  type ShippingUnitDetail,
} from "@/modules/fulfillment/services/shipping.service";

export type ShippingLookupResult =
  | {
      success: true;
      unit: ShippingUnitDetail;
    }
  | {
      success: false;
      message: string;
    };

export type ShippingSubmitInput = {
  barcode: string;
  carrierName: string;
  vehiclePlate: string;
  driverName: string;
  driverIdentityNumber: string;
  notes: string;
};

export type ShippingSubmitResult =
  | {
      success: true;
      message: string;
      dispatchNumber: string;
      barcode: string;
    }
  | {
      success: false;
      message: string;
    };

function getOperatorName(
  profile: Awaited<
    ReturnType<
      typeof AuthorizationService.requireRfAccess
    >
  >
) {
  if (profile.employee) {
    return `${profile.employee.firstName} ${profile.employee.lastName}`;
  }

  return profile.username;
}

export async function lookupShippingUnitAction(
  barcode: string
): Promise<ShippingLookupResult> {
  await AuthorizationService.requireRfAccess(
    "SHIPPING_EXECUTE"
  );

  try {
    const unit =
      await ShippingService.findReadyUnit(
        barcode
      );

    return {
      success: true,
      unit,
    };
  } catch (error) {
    console.error(
      "Sevk THM sorgulama hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Sevk THM sorgulanamadı.",
    };
  }
}

export async function shipHandlingUnitAction(
  input: ShippingSubmitInput
): Promise<ShippingSubmitResult> {
  const profile =
    await AuthorizationService.requireRfAccess(
      "SHIPPING_EXECUTE"
    );

  try {
    const result =
      await ShippingService.ship({
        ...input,
        operatorId: profile.id,
        operatorName:
          getOperatorName(profile),
      });

    revalidatePath("/rf");
    revalidatePath("/rf/shipping");
    revalidatePath("/admin/orders");
    revalidatePath(
      "/admin/handling-units"
    );
    revalidatePath(
      "/admin/stock/movements"
    );

    return {
      success: true,
      barcode: result.barcode,
      dispatchNumber:
        result.dispatchNumber,
      message:
        `${result.barcode} Sevk THM başarıyla sevk edildi. ` +
        `Belge no: ${result.dispatchNumber}. ` +
        `Toplam ${result.totalQuantity} adet ürün stoktan düşüldü.`,
    };
  } catch (error) {
    console.error(
      "Sevk THM çıkış hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Sevkiyat işlemi tamamlanamadı.",
    };
  }
}
