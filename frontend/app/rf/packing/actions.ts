"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  WavePackingService,
} from "@/modules/fulfillment/services/wave-packing.service";

export type RFPackingState = {
  success: boolean;
  message: string;
  distributionCode: string;
  waveNo: string;
  customerName: string;
  sourceBarcode: string;
  sourceQuantityAfter: number;
  targetBarcode: string;
  targetQuantityAfter: number;
  packageSequence: number;
  productCode: string;
  productName: string;
  packedQuantity: number;
  distributionPackedQuantity: number;
  distributionPlannedQuantity: number;
  distributionCompleted: boolean;
};

export type CloseShippingUnitResult = {
  success: boolean;
  message: string;
};

function emptyState(
  message: string,
): RFPackingState {
  return {
    success: false,
    message,
    distributionCode: "",
    waveNo: "",
    customerName: "",
    sourceBarcode: "",
    sourceQuantityAfter: 0,
    targetBarcode: "",
    targetQuantityAfter: 0,
    packageSequence: 0,
    productCode: "",
    productName: "",
    packedQuantity: 0,
    distributionPackedQuantity: 0,
    distributionPlannedQuantity: 0,
    distributionCompleted: false,
  };
}

function readText(
  formData: FormData,
  fieldName: string,
) {
  return String(
    formData.get(fieldName) ?? "",
  )
    .trim()
    .toUpperCase();
}

function getActor(
  profile: Awaited<
    ReturnType<
      typeof AuthorizationService.requireRfAccess
    >
  >,
  terminalCode?: string,
) {
  return {
    userId: profile.id,
    displayName:
      profile.employee
        ? `${profile.employee.firstName} ${profile.employee.lastName}`
        : profile.username,
    terminalCode:
      terminalCode || null,
  };
}

export async function rfPackWaveItemAction(
  _previousState: RFPackingState,
  formData: FormData,
): Promise<RFPackingState> {
  const currentUser =
    await AuthorizationService.requireRfAccess(
      "PICKING_EXECUTE",
    );

  const distributionCode =
    readText(
      formData,
      "distributionCode",
    );

  const sourceBarcode =
    readText(
      formData,
      "sourceBarcode",
    );

  const targetBarcode =
    readText(
      formData,
      "targetBarcode",
    );

  const productBarcode =
    readText(
      formData,
      "productBarcode",
    );

  const terminalCode =
    readText(
      formData,
      "terminalCode",
    );

  const quantity = Number(
    formData.get("quantity"),
  );

  try {
    const result =
      await WavePackingService.packItem({
        distributionCode,
        sourceBarcode,
        targetBarcode,
        productBarcode,
        quantity,
        actor:
          getActor(
            currentUser,
            terminalCode,
          ),
      });

    revalidatePath(
      "/rf/packing",
    );

    revalidatePath(
      "/admin/waves",
    );

    revalidatePath(
      "/admin/wms-dashboard",
    );

    return {
      success: true,
      message:
        `${result.productCode} - ${result.productName} ürününden ${result.packedQuantity} adet ` +
        `${result.sourceBarcode} Toplama THM'den ${result.targetBarcode} Sevk THM'ye aktarıldı.`,
      ...result,
    };
  } catch (error) {
    console.error(
      "RF Wave paketleme hatası:",
      error,
    );

    return emptyState(
      error instanceof Error
        ? error.message
        : "Paketleme işlemi tamamlanamadı.",
    );
  }
}

export async function closeWaveShippingUnitAction(
  targetBarcode: string,
  terminalCode = "",
): Promise<CloseShippingUnitResult> {
  const currentUser =
    await AuthorizationService.requireRfAccess(
      "PICKING_EXECUTE",
    );

  try {
    const result =
      await WavePackingService.closeShippingUnit(
        targetBarcode,
        getActor(
          currentUser,
          terminalCode
            .trim()
            .toUpperCase(),
        ),
      );

    revalidatePath(
      "/rf/packing",
    );

    revalidatePath(
      "/admin/waves",
    );

    revalidatePath(
      "/admin/wms-dashboard",
    );

    return {
      success: true,
      message:
        `${result.targetBarcode} Sevk THM kapatıldı. ` +
        `Koli ${result.packageSequence}, ${result.totalQuantity} adet ürünle sevke hazırdır.`,
    };
  } catch (error) {
    console.error(
      "Sevk THM kapatma hatası:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Sevk THM kapatılamadı.",
    };
  }
}
