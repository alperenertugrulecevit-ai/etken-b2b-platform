import "server-only";

import {
  ShippingHandlingUnitStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import type {
  PackingListData,
  PackingListProduct,
} from "./packing-list-zpl.service";

export type PackingListPreviewResult = {
  success: boolean;
  message: string;

  shippingHandlingUnitId:
    string | null;

  shippingHandlingUnitBarcode:
    string;

  status:
    ShippingHandlingUnitStatus | null;

  customerName: string;
  orderNumbers: string[];

  previousPrintCount: number;
  packingListPrintedAt:
    Date | null;

  labelCount: number;

  data:
    PackingListData | null;
};

function normalizeBarcode(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

function createEmptyResult(
  message: string,
  barcode = ""
): PackingListPreviewResult {
  return {
    success: false,
    message,

    shippingHandlingUnitId:
      null,

    shippingHandlingUnitBarcode:
      barcode,

    status: null,

    customerName: "",
    orderNumbers: [],

    previousPrintCount: 0,
    packingListPrintedAt:
      null,

    labelCount: 0,

    data: null,
  };
}

function canPreviewPackingList(
  status: ShippingHandlingUnitStatus
) {
  return (
    status ===
      ShippingHandlingUnitStatus.READY_TO_SHIP ||
    status ===
      ShippingHandlingUnitStatus.SHIPPED
  );
}

export class PackingListPreviewService {
  static async getByBarcode(
    value: string
  ): Promise<PackingListPreviewResult> {
    const barcode =
      normalizeBarcode(value);

    if (!barcode) {
      return createEmptyResult(
        "Ön izleme için Sevk THM barkodunu okutun."
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
          customerName: true,

          closedAt: true,
          readyAt: true,

          packingListPrintedAt:
            true,

          packingListPrintCount:
            true,

          handlingUnit: {
            select: {
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
              dispatchNumber:
                true,
              ettn: true,
            },
          },
        },
      });

    if (!shippingUnit) {
      return createEmptyResult(
        `${barcode} barkodlu Sevk THM bulunamadı.`,
        barcode
      );
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

      status:
        shippingUnit.status,

      customerName:
        shippingUnit.customerName,

      orderNumbers,

      previousPrintCount:
        shippingUnit
          .packingListPrintCount,

      packingListPrintedAt:
        shippingUnit
          .packingListPrintedAt,
    };

    if (
      !canPreviewPackingList(
        shippingUnit.status
      )
    ) {
      return {
        success: false,

        message:
          shippingUnit.status ===
          ShippingHandlingUnitStatus.OPEN
            ? "Sevk THM henüz kapatılmadı. Çeki listesi ön izlemesi için önce Sevk THM'yi kapatın."
            : "Sevk THM çeki listesi ön izlemesine uygun durumda değildir.",

        ...baseResult,

        labelCount: 0,
        data: null,
      };
    }

    if (
      shippingUnit.items.length ===
      0
    ) {
      return {
        success: false,

        message:
          "Sevk THM içerisinde ön izlenecek ürün bulunamadı.",

        ...baseResult,

        labelCount: 0,
        data: null,
      };
    }

    const productMap =
      new Map<
        number,
        PackingListProduct
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
      ).sort(
        (
          left,
          right
        ) =>
          left.productCode.localeCompare(
            right.productCode,
            "tr"
          )
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

    const labelCount =
      Math.max(
        1,
        Math.ceil(
          products.length / 6
        )
      );

    const data:
      PackingListData = {
        shippingHandlingUnitBarcode:
          shippingUnit
            .handlingUnit.barcode,

        printedAt:
          new Date(),

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
      };

    return {
      success: true,

      message:
        labelCount > 1
          ? `${shippingUnit.handlingUnit.barcode} için ${labelCount} sayfalık çeki listesi ön izlemesi hazırlandı.`
          : `${shippingUnit.handlingUnit.barcode} çeki listesi ön izlemesi hazırlandı.`,

      ...baseResult,

      labelCount,
      data,
    };
  }
}