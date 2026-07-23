"use server";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
  StockMovementType,
  WmsOperationType,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import { prisma } from "@/lib/prisma";

import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

import { SessionService } from "@/modules/auth/services/session.service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type RFCountingState = {
  success: boolean;
  message: string;

  warehouseCode: string;
  warehouseName: string;
  locationCode: string;

  handlingUnitId?:
    number | null;

  handlingUnitBarcode?:
    string;

  handlingUnitType?:
    string;

  productId: number | null;
  productCode: string;
  productName: string;
  productBarcode: string;

  expectedQuantity: number;
  countedQuantity: number;
  difference: number;

  handlingUnitReservedStock?:
    number;

  locationQuantityBefore?:
    number;

  locationQuantityAfter?:
    number;

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

    handlingUnitId: null,
    handlingUnitBarcode: "",
    handlingUnitType: "",

    productId: null,
    productCode: "",
    productName: "",
    productBarcode: "",

    expectedQuantity: 0,
    countedQuantity: 0,
    difference: 0,

    handlingUnitReservedStock: 0,

    locationQuantityBefore: 0,
    locationQuantityAfter: 0,
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
  handlingUnitId: number
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
    `${handlingUnitId}-` +
    `${datePart}${timePart}`
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

function getHandlingUnitTypeLabel(
  unitType: HandlingUnitType
) {
  const labels:
    Record<
      HandlingUnitType,
      string
    > = {
      BOX: "Koli",
      PALLET: "Palet",
      PICKING_BOX:
        "Toplama Kolisi",
      PICKING_PALLET:
        "Toplama Paleti",
    };

  return labels[unitType];
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

  const currentSession =
    await SessionService.getCurrentSession();

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

  const handlingUnitBarcode =
    normalizeValue(
      formData.get(
        "handlingUnitBarcode"
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

  if (!handlingUnitBarcode) {
    return createEmptyState(
      "Sayım yapılacak koli veya palet barkodunu okutun."
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

  const operatorName =
    operator.employee
      ? `${operator.employee.firstName} ${operator.employee.lastName}`
      : operator.username;

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

          const handlingUnit =
            await tx.handlingUnit.findUnique({
              where: {
                barcode:
                  handlingUnitBarcode,
              },

              select: {
                id: true,
                barcode: true,
                unitType: true,
                purpose: true,
                status: true,
                warehouseId: true,
                locationId: true,
                parentUnitId: true,

                _count: {
                  select: {
                    childUnits: true,
                  },
                },

                items: {
                  where: {
                    productId:
                      product.id,
                  },

                  take: 1,

                  select: {
                    id: true,
                    quantity: true,
                    reservedStock: true,
                  },
                },
              },
            });

          if (!handlingUnit) {
            throw new Error(
              `${handlingUnitBarcode} barkodlu koli veya palet bulunamadı.`
            );
          }

          if (
            handlingUnit.status ===
            HandlingUnitStatus.CANCELLED
          ) {
            throw new Error(
              `${handlingUnit.barcode} iptal durumunda olduğu için sayılamaz.`
            );
          }

          if (
            handlingUnit.status ===
            HandlingUnitStatus.IN_TRANSIT
          ) {
            throw new Error(
              `${handlingUnit.barcode} transfer sürecinde olduğu için sayılamaz.`
            );
          }

          if (
            handlingUnit.purpose !==
            HandlingUnitPurpose.STOCK
          ) {
            throw new Error(
              `${handlingUnit.barcode} stok amaçlı bir taşıma birimi değildir.`
            );
          }

          if (
            handlingUnit.warehouseId !==
              warehouse.id ||
            handlingUnit.locationId !==
              location.id
          ) {
            throw new Error(
              `${handlingUnit.barcode} taşıma birimi ${warehouse.code} / ${locationBarcode} lokasyonunda bulunmuyor.`
            );
          }

          if (
            handlingUnit.unitType ===
              HandlingUnitType.PALLET &&
            handlingUnit._count
              .childUnits > 0
          ) {
            throw new Error(
              `${handlingUnit.barcode} paletine bağlı koliler bulunuyor. Sayım için palet yerine ilgili koli barkodunu okutun.`
            );
          }

          const handlingUnitItem =
            handlingUnit.items[0] ??
            null;

          const expectedQuantity =
            handlingUnitItem
              ?.quantity ?? 0;

          const handlingUnitReservedStock =
            handlingUnitItem
              ?.reservedStock ?? 0;

          if (
            countedQuantity <
            handlingUnitReservedStock
          ) {
            throw new Error(
              `Sayılan miktar THM üzerindeki rezerve stoktan az olamaz. ` +
                `Rezerve: ${handlingUnitReservedStock}, ` +
                `sayılan: ${countedQuantity}.`
            );
          }

          const difference =
            countedQuantity -
            expectedQuantity;

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

          const locationQuantityBefore =
            locationStock?.quantity ??
            0;

          const locationReservedStock =
            locationStock
              ?.reservedStock ?? 0;

          const locationQuantityAfter =
            locationQuantityBefore +
            difference;

          if (
            locationQuantityAfter < 0
          ) {
            throw new Error(
              `Sayım farkı lokasyon stoğunu sıfırın altına düşürüyor. ` +
                `Lokasyon stoğu: ${locationQuantityBefore}, ` +
                `sayım farkı: ${difference}.`
            );
          }

          if (
            locationQuantityAfter <
            locationReservedStock
          ) {
            throw new Error(
              `Sayım sonrası lokasyon miktarı rezerve stoktan az olamaz. ` +
                `Rezerve: ${locationReservedStock}, ` +
                `sayım sonrası: ${locationQuantityAfter}.`
            );
          }

          const documentNumber =
            createCountDocumentNumber(
              warehouse.code,
              handlingUnit.id
            );

          let movementType:
            StockMovementType | null =
              null;

          if (difference !== 0) {
            movementType =
              difference > 0
                ? StockMovementType.COUNT_INCREASE
                : StockMovementType.COUNT_DECREASE;

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
                  `${warehouse.code} / ${locationBarcode} / ${handlingUnit.barcode} için RF sayımı yapıldı. ` +
                  `THM sistem miktarı: ${expectedQuantity}, ` +
                  `sayılan miktar: ${countedQuantity}, ` +
                  `fark: ${difference}.` +
                  (
                    note
                      ? ` Not: ${note}`
                      : ""
                  ),
              }
            );

            if (handlingUnitItem) {
              await tx.handlingUnitItem.update({
                where: {
                  id:
                    handlingUnitItem.id,
                },

                data: {
                  quantity:
                    countedQuantity,
                },
              });
            } else {
              await tx.handlingUnitItem.create({
                data: {
                  handlingUnitId:
                    handlingUnit.id,

                  productId:
                    product.id,

                  quantity:
                    countedQuantity,

                  reservedStock: 0,
                },
              });
            }

            if (locationStock) {
              await tx.warehouseLocationStock.update({
                where: {
                  id:
                    locationStock.id,
                },

                data: {
                  quantity:
                    locationQuantityAfter,
                },
              });
            } else if (
              locationQuantityAfter >
              0
            ) {
              await tx.warehouseLocationStock.create({
                data: {
                  locationId:
                    location.id,

                  productId:
                    product.id,

                  quantity:
                    locationQuantityAfter,

                  reservedStock: 0,
                },
              });
            }
          }

          await tx.wmsOperationLog.create({
            data: {
              operationType:
                WmsOperationType.COUNT,

              module:
                "RF_COUNTING",

              entityType:
                "HANDLING_UNIT",

              entityId:
                handlingUnit.id,

              operatorId:
                operator.id,

              operatorName,

              terminalCode:
                currentSession
                  ?.terminalCode ?? null,

              ipAddress:
                currentSession
                  ?.ipAddress ?? null,

              barcode:
                handlingUnit.barcode,

              productId:
                product.id,

              productCode:
                product.code,

              productName:
                product.name,

              quantity:
                countedQuantity,

              warehouseId:
                warehouse.id,

              warehouseCode:
                warehouse.code,

              sourceLocationId:
                location.id,

              sourceLocationCode:
                locationBarcode,

              previousStatus:
                String(
                  expectedQuantity
                ),

              newStatus:
                String(
                  countedQuantity
                ),

              description:
                difference === 0
                  ? "RF sayımı tamamlandı. Sistem miktarı ile fiziksel miktar eşit."
                  : `RF sayımı tamamlandı. Stok farkı: ${difference}.`,

              metadata: {
                documentNumber,

                handlingUnitType:
                  handlingUnit.unitType,

                handlingUnitParentId:
                  handlingUnit.parentUnitId,

                expectedQuantity,

                countedQuantity,

                difference,

                handlingUnitReservedStock,

                locationQuantityBefore,

                locationQuantityAfter,

                locationReservedStock,

                note:
                  note || null,
              },

              isSuccessful: true,
            },
          });

          return {
            warehouseCode:
              warehouse.code,

            warehouseName:
              warehouse.name,

            locationCode:
              locationBarcode,

            handlingUnitId:
              handlingUnit.id,

            handlingUnitBarcode:
              handlingUnit.barcode,

            handlingUnitType:
              getHandlingUnitTypeLabel(
                handlingUnit.unitType
              ),

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

            handlingUnitReservedStock,

            locationQuantityBefore,

            locationQuantityAfter,

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
      "/admin/handling-units"
    );

    revalidatePath(
      `/admin/handling-units/${result.handlingUnitId}`
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
          ? `${result.handlingUnitBarcode} / ${result.productCode} sayımı tamamlandı. Sistem miktarı ile sayılan miktar eşit.`
          : `${result.handlingUnitBarcode} / ${result.productCode} sayımı tamamlandı. ` +
            `Sistem: ${result.expectedQuantity}, ` +
            `sayılan: ${result.countedQuantity}, ` +
            `fark: ${result.difference}.`,

      warehouseCode:
        result.warehouseCode,

      warehouseName:
        result.warehouseName,

      locationCode:
        result.locationCode,

      handlingUnitId:
        result.handlingUnitId,

      handlingUnitBarcode:
        result.handlingUnitBarcode,

      handlingUnitType:
        result.handlingUnitType,

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

      handlingUnitReservedStock:
        result.handlingUnitReservedStock,

      locationQuantityBefore:
        result.locationQuantityBefore,

      locationQuantityAfter:
        result.locationQuantityAfter,

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
      "RF THM sayım hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createEmptyState(
        "Aynı stok veya THM üzerinde başka bir işlem yapıldı. Lütfen sayımı tekrar deneyin."
      );
    }

    return createEmptyState(
      error instanceof Error
        ? error.message
        : "THM sayımı kaydedilirken beklenmeyen bir hata oluştu."
    );
  }
}