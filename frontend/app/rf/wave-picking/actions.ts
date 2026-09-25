"use server";

import {
  Prisma,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { prisma } from "@/lib/prisma";
import { WarehouseTransferService } from "@/modules/inventory/services/warehouse-transfer.service";

import { WavePoolPickingService } from "@/modules/fulfillment/services/wave-pool-picking.service";

export type RFWavePoolPickingState = {
  success: boolean;
  message: string;

  waveId: string;
  waveNo: string;

  productId: number | null;
  productCode: string;
  productName: string;

  sourceBarcode: string;
  targetBarcode: string;

  pickedQuantity: number;
  sourceQuantityAfter: number;
  targetQuantityAfter: number;
  waveRemainingQuantity: number;

  allocationCount: number;
  allocationSummary: string[];
};

function createErrorState(
  message: string
): RFWavePoolPickingState {
  return {
    success: false,
    message,

    waveId: "",
    waveNo: "",

    productId: null,
    productCode: "",
    productName: "",

    sourceBarcode: "",
    targetBarcode: "",

    pickedQuantity: 0,
    sourceQuantityAfter: 0,
    targetQuantityAfter: 0,
    waveRemainingQuantity: 0,

    allocationCount: 0,
    allocationSummary: [],
  };
}

function readText(
  formData: FormData,
  fieldName: string
) {
  return String(
    formData.get(fieldName) ??
      ""
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

export async function rfWavePoolMarkProductLost(formData: FormData) {
  const currentUser = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const waveId = readText(formData, "waveId");
  const sourceBarcode = readBarcode(formData, "sourceBarcode");
  const productId = Number(formData.get("productId"));
  const terminalCode = readText(formData, "terminalCode").toUpperCase();

  if (!waveId || !sourceBarcode || !Number.isInteger(productId) || productId <= 0) {
    throw new Error("Kayıp işlemi için Wave, kaynak THM ve ürün zorunludur.");
  }

  const operatorName = currentUser.employee
    ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
    : currentUser.username;

  await prisma.$transaction(async (tx) => {
    const wave = await tx.wave.findUnique({
      where: { id: waveId },
      select: {
        distributions: {
          where: { status: { not: "CANCELLED" } },
          select: { lines: { where: { productId }, select: { productId: true } } },
        },
      },
    });

    if (!wave || !wave.distributions.some((distribution) => distribution.lines.length > 0)) {
      throw new Error("Seçilen ürün bu Wave'in aktif toplama planında bulunmuyor.");
    }

    await WarehouseTransferService.markProductLost(tx, {
      sourceHandlingUnitBarcode: sourceBarcode,
      productId,
      actor: {
        operatorId: currentUser.id,
        operatorName,
        terminalCode: terminalCode || null,
      },
    });
  }, {
    maxWait: 10000,
    timeout: 30000,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  revalidatePath("/rf/wave-picking");
  revalidatePath("/admin/stock/movements");
  revalidatePath("/admin/stock/thm-movements");
  revalidatePath("/admin/wms-reports/lost-stock");
}

export async function rfWavePoolPickAction(
  _previousState: RFWavePoolPickingState,
  formData: FormData
): Promise<RFWavePoolPickingState> {
  const currentUser =
    await AuthorizationService.requireRfAccess(
      "PICKING_EXECUTE"
    );

  const waveId =
    readText(
      formData,
      "waveId"
    );

  const sourceBarcode =
    readBarcode(
      formData,
      "sourceBarcode"
    );

  const targetBarcode =
    readBarcode(
      formData,
      "targetBarcode"
    );

  const productBarcode =
    readBarcode(
      formData,
      "productBarcode"
    );

  const terminalCode =
    readText(
      formData,
      "terminalCode"
    ).toUpperCase();

  const quantity =
    Number(
      formData.get(
        "quantity"
      )
    );

  if (!waveId) {
    return createErrorState(
      "Toplama yapılacak Wave seçilmelidir."
    );
  }

  if (!targetBarcode) {
    return createErrorState(
      "Ortak Toplama THM barkodunu okutun."
    );
  }

  if (!sourceBarcode) {
    return createErrorState(
      "Kaynak stok THM barkodunu okutun."
    );
  }

  if (!productBarcode) {
    return createErrorState(
      "Toplanacak ürün barkodunu okutun."
    );
  }

  if (
    sourceBarcode ===
    targetBarcode
  ) {
    return createErrorState(
      "Kaynak THM ile Toplama THM aynı olamaz."
    );
  }

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity <= 0
  ) {
    return createErrorState(
      "Toplama miktarı sıfırdan büyük bir tam sayı olmalıdır."
    );
  }

  const operatorName =
    currentUser.employee
      ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
      : currentUser.username;

  try {
    const result =
      await WavePoolPickingService.execute(
        {
          waveId,

          sourceBarcode,
          targetBarcode,
          productBarcode,
          quantity,

          operatorId:
            currentUser.id,

          operatorName,

          terminalCode:
            terminalCode ||
            null,
        }
      );

    revalidatePath(
      "/rf"
    );

    revalidatePath(
      "/rf/wave-picking"
    );

    revalidatePath(
      "/rf/picking"
    );

    revalidatePath(
      "/rf/packing"
    );

    revalidatePath(
      "/admin/orders"
    );

    revalidatePath(
      "/admin/waves"
    );

    revalidatePath(
      `/admin/waves/${result.waveId}`
    );

    revalidatePath(
      "/admin/handling-units"
    );

    return {
      success: true,

      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.pickedQuantity} adet ${result.targetBarcode} ortak Toplama THM'ine aktarıldı.`,

      waveId:
        result.waveId,

      waveNo:
        result.waveNo,

      productId:
        result.productId,

      productCode:
        result.productCode,

      productName:
        result.productName,

      sourceBarcode:
        result.sourceBarcode,

      targetBarcode:
        result.targetBarcode,

      pickedQuantity:
        result.pickedQuantity,

      sourceQuantityAfter:
        result.sourceQuantityAfter,

      targetQuantityAfter:
        result.targetQuantityAfter,

      waveRemainingQuantity:
        result.waveRemainingQuantity,

      allocationCount:
        result.allocations
          .length,

      allocationSummary:
        result.allocations.map(
          (
            allocation
          ) =>
            `${allocation.distributionCode} / ` +
            `${allocation.orderNumber}: ` +
            `${allocation.quantity} adet`
        ),
    };
  } catch (error) {
    console.error(
      "RF Wave havuz toplama hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen barkodları kontrol ederek yeniden deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Wave havuz toplama sırasında beklenmeyen bir hata oluştu."
    );
  }
}