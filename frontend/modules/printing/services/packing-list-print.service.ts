import "server-only";

import {
  ShippingHandlingUnitStatus,
  WmsOperationType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  NetworkPrinterService,
} from "./network-printer.service";

import {
  PackingListZplService,
} from "./packing-list-zpl.service";

type PrintActor = {
  userId: string;
  displayName: string;
  terminalCode?: string | null;
};

export type PrintPackingListInput = {
  shippingHandlingUnitBarcode: string;
  printerId: string;
  forceReprint: boolean;
  actor: PrintActor;
};

export type PackingListPrintResult = {
  success: boolean;
  printed: boolean;
  requiresConfirmation: boolean;

  message: string;

  shippingHandlingUnitId:
    string | null;

  shippingHandlingUnitBarcode:
    string;

  customerName: string;
  orderNumbers: string[];

  printerId: string;
  printerCode: string;
  printerName: string;

  previousPrintCount: number;
  printCount: number;
  labelCount: number;
};

function normalizeBarcode(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

function normalizeText(
  value: string | null | undefined
) {
  return value?.trim() ?? "";
}

function createEmptyResult(
  message: string
): PackingListPrintResult {
  return {
    success: false,
    printed: false,
    requiresConfirmation:
      false,

    message,

    shippingHandlingUnitId:
      null,

    shippingHandlingUnitBarcode:
      "",

    customerName: "",
    orderNumbers: [],

    printerId: "",
    printerCode: "",
    printerName: "",

    previousPrintCount: 0,
    printCount: 0,
    labelCount: 0,
  };
}

function canPrintPackingList(
  status: ShippingHandlingUnitStatus
) {
  return (
    status ===
      ShippingHandlingUnitStatus.READY_TO_SHIP ||
    status ===
      ShippingHandlingUnitStatus.SHIPPED
  );
}

export class PackingListPrintService {
  static async print(
    input: PrintPackingListInput
  ): Promise<PackingListPrintResult> {
    const barcode =
      normalizeBarcode(
        input
          .shippingHandlingUnitBarcode
      );

    const printerId =
      normalizeText(
        input.printerId
      );

    if (!barcode) {
      return createEmptyResult(
        "Sevk THM barkodunu okutun."
      );
    }

    if (!printerId) {
      return createEmptyResult(
        "Barkod yazıcısı seçin."
      );
    }

    const [
      printer,
      shippingUnit,
    ] =
      await Promise.all([
        prisma.barcodePrinter.findUnique({
          where: {
            id: printerId,
          },

          select: {
            id: true,
            code: true,
            name: true,
            ipAddress: true,
            port: true,
            dpi: true,
            labelWidthMm:
              true,
            labelHeightMm:
              true,
            commandLanguage:
              true,
            isActive: true,
          },
        }),

        prisma.shippingHandlingUnit.findFirst({
          where: {
            handlingUnit: {
              barcode,
            },
          },

          select: {
            id: true,
            status: true,
            customerName: true,

            closedAt: true,
            readyAt: true,

            packingListPrintedAt:
              true,

            packingListPrintCount:
              true,

            packingListLastPrinterCode:
              true,

            handlingUnit: {
              select: {
                id: true,
                barcode: true,
              },
            },

            orders: {
              orderBy: {
                orderNumber:
                  "asc",
              },

              select: {
                orderNumber:
                  true,
              },
            },

            items: {
              where: {
                quantity: {
                  gt: 0,
                },
              },

              orderBy: [
                {
                  productCode:
                    "asc",
                },
                {
                  orderId:
                    "asc",
                },
              ],

              select: {
                productId: true,
                productCode: true,
                productName: true,
                quantity: true,
              },
            },

            dispatchDocument: {
              select: {
                id: true,
                status: true,
                dispatchNumber:
                  true,
                ettn: true,
              },
            },
          },
        }),
      ]);

    if (!printer) {
      return createEmptyResult(
        "Seçilen barkod yazıcısı bulunamadı."
      );
    }

    if (!printer.isActive) {
      return {
        ...createEmptyResult(
          `${printer.code} - ${printer.name} yazıcısı pasif durumdadır.`
        ),

        printerId:
          printer.id,

        printerCode:
          printer.code,

        printerName:
          printer.name,

        shippingHandlingUnitBarcode:
          barcode,
      };
    }

    if (!shippingUnit) {
      return {
        ...createEmptyResult(
          `${barcode} barkodlu Sevk THM bulunamadı.`
        ),

        printerId:
          printer.id,

        printerCode:
          printer.code,

        printerName:
          printer.name,

        shippingHandlingUnitBarcode:
          barcode,
      };
    }

    const orderNumbers =
      Array.from(
        new Set(
          shippingUnit.orders.map(
            (order) =>
              order.orderNumber
          )
        )
      );

    const baseResult = {
      shippingHandlingUnitId:
        shippingUnit.id,

      shippingHandlingUnitBarcode:
        shippingUnit
          .handlingUnit.barcode,

      customerName:
        shippingUnit.customerName,

      orderNumbers,

      printerId:
        printer.id,

      printerCode:
        printer.code,

      printerName:
        printer.name,

      previousPrintCount:
        shippingUnit
          .packingListPrintCount,

      printCount:
        shippingUnit
          .packingListPrintCount,

      labelCount: 0,
    };

    if (
      !canPrintPackingList(
        shippingUnit.status
      )
    ) {
      return {
        success: false,
        printed: false,

        requiresConfirmation:
          false,

        message:
          shippingUnit.status ===
          ShippingHandlingUnitStatus.OPEN
            ? "Sevk THM henüz kapatılmadı. Çeki listesi için önce Sevk THM'yi kapatın."
            : "Sevk THM çeki listesi basımına uygun durumda değildir.",

        ...baseResult,
      };
    }

    if (
      shippingUnit.items.length ===
      0
    ) {
      return {
        success: false,
        printed: false,

        requiresConfirmation:
          false,

        message:
          "Sevk THM içerisinde yazdırılacak ürün bulunamadı.",

        ...baseResult,
      };
    }

    const wasPrintedBefore =
      shippingUnit
        .packingListPrintCount >
        0 ||
      shippingUnit
        .packingListPrintedAt !==
        null;

    if (
      wasPrintedBefore &&
      !input.forceReprint
    ) {
      const previousPrintDate =
        shippingUnit
          .packingListPrintedAt
          ? new Intl.DateTimeFormat(
              "tr-TR",
              {
                dateStyle:
                  "short",
                timeStyle:
                  "medium",
              }
            ).format(
              shippingUnit
                .packingListPrintedAt
            )
          : "bilinmeyen tarih";

      return {
        success: false,
        printed: false,

        requiresConfirmation:
          true,

        message:
          "Bu çeki listesi daha önce basılmıştır. " +
          `Son baskı: ${previousPrintDate}. ` +
          `Yazıcı: ${
            shippingUnit
              .packingListLastPrinterCode ??
            "-"
          }. Devam etmek istiyor musunuz?`,

        ...baseResult,
      };
    }

    const productMap =
      new Map<
        number,
        {
          productCode: string;
          productName: string;
          quantity: number;
        }
      >();

    for (
      const item of
        shippingUnit.items
    ) {
      const current =
        productMap.get(
          item.productId
        );

      if (current) {
        current.quantity +=
          item.quantity;
      } else {
        productMap.set(
          item.productId,
          {
            productCode:
              item.productCode,

            productName:
              item.productName,

            quantity:
              item.quantity,
          }
        );
      }
    }

    const products =
      Array.from(
        productMap.values()
      );

    const totalQuantity =
      products.reduce(
        (
          total,
          product
        ) =>
          total +
          product.quantity,
        0
      );

    const printedAt =
      new Date();

    const labels =
      PackingListZplService.createLabels({
        dpi:
          printer.dpi,

        labelWidthMm:
          printer.labelWidthMm,

        labelHeightMm:
          printer.labelHeightMm,

        data: {
          shippingHandlingUnitBarcode:
            shippingUnit
              .handlingUnit.barcode,

          printedAt,

          closedAt:
            shippingUnit.closedAt ??
            shippingUnit.readyAt,

          customerName:
            shippingUnit.customerName,

          orderNumbers,

          totalQuantity,

          ettn:
            shippingUnit
              .dispatchDocument
              ?.ettn ?? null,

          products,
        },
      });

    const zplPrintJob =
      labels.join(
        "\n"
      );

    try {
      await NetworkPrinterService.sendZpl(
        printer,
        zplPrintJob
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Çeki listesi yazıcıya gönderilemedi.";

      await prisma.wmsOperationLog.create({
        data: {
          operationType:
            WmsOperationType.OTHER,

          module:
            "RF_PACKING_LIST_PRINT",

          entityType:
            "SHIPPING_HANDLING_UNIT",

          entityId:
            shippingUnit
              .handlingUnit.id,

          operatorId:
            input.actor.userId,

          operatorName:
            input.actor
              .displayName,

          terminalCode:
            input.actor
              .terminalCode ??
            null,

          barcode:
            shippingUnit
              .handlingUnit.barcode,

          quantity:
            totalQuantity,

          description:
            `${shippingUnit.handlingUnit.barcode} Sevk THM çeki listesi yazdırılamadı.`,

          metadata: {
            shippingHandlingUnitId:
              shippingUnit.id,

            printerId:
              printer.id,

            printerCode:
              printer.code,

            printerName:
              printer.name,

            printerIpAddress:
              printer.ipAddress,

            labelCount:
              labels.length,

            isReprint:
              wasPrintedBefore,
          },

          isSuccessful:
            false,

          errorMessage,
        },
      });

      return {
        success: false,
        printed: false,

        requiresConfirmation:
          false,

        message:
          errorMessage,

        ...baseResult,

        labelCount:
          labels.length,
      };
    }

    const newPrintCount =
      shippingUnit
        .packingListPrintCount +
      1;

    await prisma.$transaction([
      prisma.shippingHandlingUnit.update({
        where: {
          id:
            shippingUnit.id,
        },

        data: {
          packingListPrintedAt:
            printedAt,

          packingListPrintCount:
            newPrintCount,

          packingListLastPrinterCode:
            printer.code,
        },
      }),

      prisma.wmsOperationLog.create({
        data: {
          operationType:
            WmsOperationType.OTHER,

          module:
            "RF_PACKING_LIST_PRINT",

          entityType:
            "SHIPPING_HANDLING_UNIT",

          entityId:
            shippingUnit
              .handlingUnit.id,

          operatorId:
            input.actor.userId,

          operatorName:
            input.actor
              .displayName,

          terminalCode:
            input.actor
              .terminalCode ??
            null,

          barcode:
            shippingUnit
              .handlingUnit.barcode,

          quantity:
            totalQuantity,

          description:
            wasPrintedBefore
              ? `${shippingUnit.handlingUnit.barcode} Sevk THM çeki listesi tekrar yazdırıldı.`
              : `${shippingUnit.handlingUnit.barcode} Sevk THM çeki listesi yazdırıldı.`,

          metadata: {
            shippingHandlingUnitId:
              shippingUnit.id,

            printerId:
              printer.id,

            printerCode:
              printer.code,

            printerName:
              printer.name,

            printerIpAddress:
              printer.ipAddress,

            labelCount:
              labels.length,

            printCount:
              newPrintCount,

            isReprint:
              wasPrintedBefore,

            orderNumbers,

            customerName:
              shippingUnit.customerName,

            dispatchNumber:
              shippingUnit
                .dispatchDocument
                ?.dispatchNumber ??
              null,

            ettn:
              shippingUnit
                .dispatchDocument
                ?.ettn ??
              null,
          },

          isSuccessful:
            true,
        },
      }),
    ]);

    return {
      success: true,
      printed: true,

      requiresConfirmation:
        false,

      message:
        labels.length > 1
          ? `${shippingUnit.handlingUnit.barcode} için ${labels.length} adet 10×10 çeki listesi etiketi ${printer.code} yazıcısına gönderildi.`
          : `${shippingUnit.handlingUnit.barcode} çeki listesi ${printer.code} yazıcısına gönderildi.`,

      ...baseResult,

      printCount:
        newPrintCount,

      labelCount:
        labels.length,
    };
  }
}