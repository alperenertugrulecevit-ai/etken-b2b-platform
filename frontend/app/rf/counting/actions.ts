"use server";

import {
  Prisma,
  StockMovementType,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import { prisma } from "@/lib/prisma";

import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type RFCountingState = {
  success: boolean;
  message: string;

  warehouseCode: string;
  warehouseName: string;
  locationCode: string;

  productId: number | null;
  productCode: string;
  productName: string;
  productBarcode: string;

  expectedQuantity: number;
  countedQuantity: number;
  difference: number;
  locationReservedStock: number;

  movementType: string;
  documentNumber: string;
};

function createEmptyState(
  message = ""
): RFCountingState {
  return {
    success: false,
    message,

    warehouseCode: "",
    warehouseName: "",
    locationCode: "",

    productId: null,
    productCode: "",
    productName: "",
    productBarcode: "",

    expectedQuantity: 0,
    countedQuantity: 0,
    difference: 0,
    locationReservedStock: 0,

    movementType: "",
    documentNumber: "",
  };
}

function normalizeValue(
  value:
    FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function createFullLocationCode({
  code,
  section,
  level,
  bin,
}: {
  code: string;
  section: string;
  level: string;
  bin: string;
}) {
  return [
    code,
    section,
    level,
    bin,
  ]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

function createCountDocumentNumber(
  warehouseCode: string,
  locationId: number
) {
  const now = new Date();

  const datePart = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getDate()
    ).padStart(2, "0"),
  ].join("");

  const timePart = [
    String(
      now.getHours()
    ).padStart(2, "0"),

    String(
      now.getMinutes()
    ).padStart(2, "0"),

    String(
      now.getSeconds()
    ).padStart(2, "0"),

    String(
      now.getMilliseconds()
    ).padStart(3, "0"),
  ].join("");

  return (
    `SAYIM-${warehouseCode}-` +
    `${locationId}-${datePart}${timePart}`
  );
}

function getMovementTypeLabel(
  movementType:
    StockMovementType | null
) {
  if (
    movementType ===
    StockMovementType.COUNT_INCREASE
  ) {
    return "Sayım Fazlası";
  }

  if (
    movementType ===
    StockMovementType.COUNT_DECREASE
  ) {
    return "Sayım Eksiği";
  }

  return "Fark Yok";
}

export async function rfCountLocationStock(
  _previousState:
    RFCountingState,
  formData: FormData
): Promise<RFCountingState> {
  const operator =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  const warehouseCode =
    normalizeValue(
      formData.get(
        "warehouseCode"
      )
    );

  const locationBarcode =
    normalizeValue(
      formData.get(
        "locationBarcode"
      )
    );

  const productBarcode =
    normalizeValue(
      formData.get(
        "productBarcode"
      )
    );

  const countedQuantity =
    Number(
      formData.get(
        "countedQuantity"
      )
    );

  const note =
    String(
      formData.get("note") ??
        ""
    ).trim();

  if (!warehouseCode) {
    return createEmptyState(
      "Depo kodunu okutun veya yazın."
    );
  }

  if (!locationBarcode) {
    return createEmptyState(
      "Sayım yapılacak lokasyon barkodunu okutun."
    );
  }

  if (!productBarcode) {
    return createEmptyState(
      "Sayılacak ürünün kodunu veya barkodunu okutun."
    );
  }

  if (
    !Number.isInteger(
      countedQuantity
    ) ||
    countedQuantity < 0
  ) {
    return createEmptyState(
      "Sayılan miktar sıfır veya pozitif tam sayı olmalıdır."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const warehouse =
            await tx.warehouse.findFirst({
              where: {
                code: {
                  equals:
                    warehouseCode,

                  mode:
                    "insensitive",
                },
              },

              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            });

          if (!warehouse) {
            throw new Error(
              `${warehouseCode} kodlu depo bulunamadı.`
            );
          }

          if (
            !warehouse.isActive
          ) {
            throw new Error(
              `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`
            );
          }

          const warehouseLocations =
            await tx.warehouseLocation.findMany({
              where: {
                warehouseId:
                  warehouse.id,

                isActive: true,
              },

              select: {
                id: true,
                code: true,
                section: true,
                level: true,
                bin: true,
              },
            });

          const matchingLocations =
            warehouseLocations.filter(
              (location) =>
                createFullLocationCode({
                  code:
                    location.code,

                  section:
                    location.section,

                  level:
                    location.level,

                  bin:
                    location.bin,
                }) ===
                locationBarcode
            );

          if (
            matchingLocations.length ===
            0
          ) {
            throw new Error(
              `${warehouse.code} deposunda ${locationBarcode} barkodlu aktif lokasyon bulunamadı.`
            );
          }

          if (
            matchingLocations.length >
            1
          ) {
            throw new Error(
              `${locationBarcode} barkodu aynı depoda birden fazla lokasyonla eşleşiyor. Lokasyon kayıtlarını kontrol edin.`
            );
          }

          const location =
            matchingLocations[0];

          const product =
            await tx.product.findFirst({
              where: {
                OR: [
                  {
                    code: {
                      equals:
                        productBarcode,

                      mode:
                        "insensitive",
                    },
                  },
                  {
                    barcode: {
                      equals:
                        productBarcode,

                      mode:
                        "insensitive",
                    },
                  },
                ],
              },

              select: {
                id: true,
                code: true,
                barcode: true,
                name: true,
                isActive: true,
                stock: true,
                reservedStock: true,
              },
            });

          if (!product) {
            throw new Error(
              `${productBarcode} kodlu veya barkodlu ürün bulunamadı.`
            );
          }

          if (!product.isActive) {
            throw new Error(
              `${product.code} - ${product.name} ürünü pasif durumda.`
            );
          }

          const locationStock =
            await tx.warehouseLocationStock.findUnique({
              where: {
                location_product_unique: {
                  locationId:
                    location.id,

                  productId:
                    product.id,
                },
              },

              select: {
                id: true,
                quantity: true,
                reservedStock: true,
              },
            });

          const expectedQuantity =
            locationStock?.quantity ??
            0;

          const locationReservedStock =
            locationStock
              ?.reservedStock ?? 0;

          if (
            countedQuantity <
            locationReservedStock
          ) {
            throw new Error(
              `Sayılan miktar lokasyondaki rezerve stoktan az olamaz. ` +
                `Rezerve stok: ${locationReservedStock}, ` +
                `sayılan miktar: ${countedQuantity}.`
            );
          }

          const difference =
            countedQuantity -
            expectedQuantity;

          let movementType:
            StockMovementType | null =
              null;

          let documentNumber = "";

          if (difference !== 0) {
            movementType =
              difference > 0
                ? StockMovementType.COUNT_INCREASE
                : StockMovementType.COUNT_DECREASE;

            documentNumber =
              createCountDocumentNumber(
                warehouse.code,
                location.id
              );

            await createStockMovementWithTransaction(
              tx,
              {
                productId:
                  product.id,

                movementType,

                physicalChange:
                  difference,

                reservedChange: 0,

                documentNumber,

                description:
                  `${warehouse.code} / ${locationBarcode} lokasyonunda ` +
                  `${operator.username} tarafından RF sayımı yapıldı. ` +
                  `Sistem miktarı: ${expectedQuantity}, ` +
                  `sayılan miktar: ${countedQuantity}, ` +
                  `fark: ${difference}.` +
                  (
                    note
                      ? ` Not: ${note}`
                      : ""
                  ),
              }
            );

            if (locationStock) {
              await tx.warehouseLocationStock.update({
                where: {
                  id:
                    locationStock.id,
                },

                data: {
                  quantity:
                    countedQuantity,
                },
              });
            } else {
              await tx.warehouseLocationStock.create({
                data: {
                  locationId:
                    location.id,

                  productId:
                    product.id,

                  quantity:
                    countedQuantity,

                  reservedStock: 0,
                },
              });
            }
          }

          return {
            warehouseCode:
              warehouse.code,

            warehouseName:
              warehouse.name,

            locationCode:
              locationBarcode,

            productId:
              product.id,

            productCode:
              product.code,

            productName:
              product.name,

            productBarcode:
              product.barcode ??
              productBarcode,

            expectedQuantity,

            countedQuantity,

            difference,

            locationReservedStock,

            movementType,

            documentNumber,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,

          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );

    revalidatePath("/rf");

    revalidatePath(
      "/rf/counting"
    );

    revalidatePath(
      "/admin"
    );

    revalidatePath(
      "/admin/products"
    );

    revalidatePath(
      "/admin/stock/movements"
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    revalidatePath(
      "/admin/stock/location-map"
    );

    return {
      success: true,

      message:
        result.difference === 0
          ? `${result.productCode} - ${result.productName} için sayım tamamlandı. Sistem miktarı ile sayılan miktar eşit.`
          : `${result.productCode} - ${result.productName} için sayım tamamlandı. ` +
            `Sistem: ${result.expectedQuantity}, ` +
            `sayılan: ${result.countedQuantity}, ` +
            `fark: ${result.difference}.`,

      warehouseCode:
        result.warehouseCode,

      warehouseName:
        result.warehouseName,

      locationCode:
        result.locationCode,

      productId:
        result.productId,

      productCode:
        result.productCode,

      productName:
        result.productName,

      productBarcode:
        result.productBarcode,

      expectedQuantity:
        result.expectedQuantity,

      countedQuantity:
        result.countedQuantity,

      difference:
        result.difference,

      locationReservedStock:
        result.locationReservedStock,

      movementType:
        getMovementTypeLabel(
          result.movementType
        ),

      documentNumber:
        result.documentNumber,
    };
  } catch (error) {
    console.error(
      "RF lokasyon sayım hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createEmptyState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen sayımı tekrar deneyin."
      );
    }

    return createEmptyState(
      error instanceof Error
        ? error.message
        : "Sayım kaydedilirken beklenmeyen bir hata oluştu."
    );
  }
}