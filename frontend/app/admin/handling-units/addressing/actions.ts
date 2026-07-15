"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type HandlingUnitAddressState = {
  success: boolean;
  message: string;

  handlingUnitId: number | null;
  handlingUnitBarcode: string;

  warehouseCode: string;
  warehouseName: string;
  locationCode: string;

  affectedUnitCount: number;
  totalStockQuantity: number;
};

const emptyState: HandlingUnitAddressState = {
  success: false,
  message: "",

  handlingUnitId: null,
  handlingUnitBarcode: "",

  warehouseCode: "",
  warehouseName: "",
  locationCode: "",

  affectedUnitCount: 0,
  totalStockQuantity: 0,
};

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function createErrorState(
  message: string
): HandlingUnitAddressState {
  return {
    ...emptyState,
    message,
  };
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
    .join("-");
}

export async function addressHandlingUnit(
  _previousState: HandlingUnitAddressState,
  formData: FormData
): Promise<HandlingUnitAddressState> {
  const handlingUnitBarcode =
    normalizeBarcode(
      formData.get(
        "handlingUnitBarcode"
      )
    );

  const warehouseId = Number(
    formData.get("warehouseId")
  );

  const locationId = Number(
    formData.get("locationId")
  );

  if (!handlingUnitBarcode) {
    return createErrorState(
      "Koli veya palet barkodunu okutun."
    );
  }

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    return createErrorState(
      "Geçerli bir hedef depo seçin."
    );
  }

  if (
    !Number.isInteger(locationId) ||
    locationId <= 0
  ) {
    return createErrorState(
      "Geçerli bir hedef lokasyon seçin."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
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
                status: true,
                warehouseId: true,
                locationId: true,
                parentUnitId: true,

                parentUnit: {
                  select: {
                    id: true,
                    barcode: true,
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
                    barcode: true,

                    items: {
                      select: {
                        quantity: true,
                      },
                    },
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
              `${handlingUnit.barcode} iptal durumunda olduğu için adreslenemez.`
            );
          }

          if (
            handlingUnit.status ===
            HandlingUnitStatus.IN_TRANSIT
          ) {
            throw new Error(
              `${handlingUnit.barcode} transfer sürecindedir. İşlem tamamlanmadan adreslenemez.`
            );
          }

          if (
            handlingUnit.parentUnitId
          ) {
            throw new Error(
              `${handlingUnit.barcode} kolisi ${handlingUnit.parentUnit?.barcode ?? "bir palete"} bağlıdır. ` +
                "Bağlı koli tek başına adreslenemez. Üst paleti adresleyin veya koliyi paletten ayırın."
            );
          }

          const warehouse =
            await tx.warehouse.findUnique({
              where: {
                id: warehouseId,
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
              "Hedef depo bulunamadı."
            );
          }

          if (!warehouse.isActive) {
            throw new Error(
              `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`
            );
          }

          const location =
            await tx.warehouseLocation.findFirst({
              where: {
                id: locationId,
                warehouseId,
              },

              select: {
                id: true,
                code: true,
                section: true,
                level: true,
                bin: true,
                locationType: true,
                isActive: true,
              },
            });

          if (!location) {
            throw new Error(
              "Seçilen lokasyon hedef depoya ait değil veya bulunamadı."
            );
          }

          if (!location.isActive) {
            throw new Error(
              "Pasif lokasyona koli veya palet yerleştirilemez."
            );
          }

          if (
            handlingUnit.warehouseId ===
              warehouseId &&
            handlingUnit.locationId ===
              locationId
          ) {
            throw new Error(
              `${handlingUnit.barcode} zaten seçilen lokasyonda bulunuyor.`
            );
          }

          const directStockQuantity =
            handlingUnit.items.reduce(
              (total, item) =>
                total + item.quantity,
              0
            );

          const childStockQuantity =
            handlingUnit.childUnits.reduce(
              (unitTotal, childUnit) =>
                unitTotal +
                childUnit.items.reduce(
                  (itemTotal, item) =>
                    itemTotal +
                    item.quantity,
                  0
                ),
              0
            );

          const totalStockQuantity =
            directStockQuantity +
            childStockQuantity;

          await tx.handlingUnit.update({
            where: {
              id: handlingUnit.id,
            },

            data: {
              warehouseId,
              locationId,

              status:
                HandlingUnitStatus.STORED,
            },
          });

          let affectedUnitCount = 1;

          if (
            handlingUnit.unitType ===
              HandlingUnitType.PALLET &&
            handlingUnit.childUnits.length >
              0
          ) {
            const childUnitIds =
              handlingUnit.childUnits.map(
                (childUnit) =>
                  childUnit.id
              );

            await tx.handlingUnit.updateMany({
              where: {
                id: {
                  in: childUnitIds,
                },
              },

              data: {
                warehouseId,
                locationId,

                status:
                  HandlingUnitStatus.STORED,
              },
            });

            affectedUnitCount +=
              childUnitIds.length;
          }

          return {
            handlingUnitId:
              handlingUnit.id,

            handlingUnitBarcode:
              handlingUnit.barcode,

            warehouseCode:
              warehouse.code,

            warehouseName:
              warehouse.name,

            locationCode:
              createFullLocationCode({
                code: location.code,
                section:
                  location.section,
                level: location.level,
                bin: location.bin,
              }),

            affectedUnitCount,
            totalStockQuantity,
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

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      "/admin/handling-units/addressing"
    );

    revalidatePath(
      `/admin/handling-units/${result.handlingUnitId}`
    );

    revalidatePath(
      "/admin/handling-units/pallet-link"
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    revalidatePath(
      "/admin/warehouses"
    );

    return {
      success: true,

      message:
        `${result.handlingUnitBarcode} barkodlu taşıma birimi ` +
        `${result.warehouseCode} / ${result.locationCode} lokasyonuna yerleştirildi. ` +
        `${result.affectedUnitCount} taşıma birimi güncellendi.`,

      handlingUnitId:
        result.handlingUnitId,

      handlingUnitBarcode:
        result.handlingUnitBarcode,

      warehouseCode:
        result.warehouseCode,

      warehouseName:
        result.warehouseName,

      locationCode:
        result.locationCode,

      affectedUnitCount:
        result.affectedUnitCount,

      totalStockQuantity:
        result.totalStockQuantity,
    };
  } catch (error) {
    console.error(
      "Koli/palet adresleme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı taşıma birimi üzerinde başka bir işlem yapıldı. Lütfen tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Koli veya palet adreslenirken beklenmeyen bir hata oluştu."
    );
  }
}