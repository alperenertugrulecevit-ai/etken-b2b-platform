"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type HandlingUnitBulkAddressState = {
  success: boolean;
  message: string;

  warehouseCode: string;
  warehouseName: string;
  locationCode: string;

  selectedUnitCount: number;
  addressedMainUnitCount: number;
  affectedUnitCount: number;
  skippedUnitCount: number;
  totalStockQuantity: number;
};

const emptyState: HandlingUnitBulkAddressState = {
  success: false,
  message: "",

  warehouseCode: "",
  warehouseName: "",
  locationCode: "",

  selectedUnitCount: 0,
  addressedMainUnitCount: 0,
  affectedUnitCount: 0,
  skippedUnitCount: 0,
  totalStockQuantity: 0,
};

function createErrorState(
  message: string
): HandlingUnitBulkAddressState {
  return {
    ...emptyState,
    message,
  };
}

function parseHandlingUnitBarcodes(
  value: FormDataEntryValue | null
) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(
      String(value)
    );

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return Array.from(
      new Set(
        parsedValue
          .map((item) =>
            String(item)
              .trim()
              .toUpperCase()
          )
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
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

export async function bulkAddressHandlingUnits(
  _previousState: HandlingUnitBulkAddressState,
  formData: FormData
): Promise<HandlingUnitBulkAddressState> {
  const handlingUnitBarcodes =
    parseHandlingUnitBarcodes(
      formData.get(
        "handlingUnitBarcodes"
      )
    );

  const warehouseId = Number(
    formData.get("warehouseId")
  );

  const locationId = Number(
    formData.get("locationId")
  );

  if (
    handlingUnitBarcodes.length === 0
  ) {
    return createErrorState(
      "Adreslenecek en az bir koli veya palet okutun."
    );
  }

  if (
    handlingUnitBarcodes.length > 200
  ) {
    return createErrorState(
      "Tek işlemde en fazla 200 koli veya palet adreslenebilir."
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
              "Pasif lokasyona adresleme yapılamaz."
            );
          }

          const handlingUnits =
            await tx.handlingUnit.findMany({
              where: {
                barcode: {
                  in: handlingUnitBarcodes,
                },
              },

              orderBy: {
                barcode: "asc",
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

          if (
            handlingUnits.length !==
            handlingUnitBarcodes.length
          ) {
            const foundBarcodes =
              new Set(
                handlingUnits.map(
                  (unit) => unit.barcode
                )
              );

            const missingBarcodes =
              handlingUnitBarcodes.filter(
                (barcode) =>
                  !foundBarcodes.has(
                    barcode
                  )
              );

            throw new Error(
              `Bazı taşıma birimleri bulunamadı: ${missingBarcodes.join(
                ", "
              )}.`
            );
          }

          for (const unit of handlingUnits) {
            if (
              unit.status ===
              HandlingUnitStatus.CANCELLED
            ) {
              throw new Error(
                `${unit.barcode} iptal durumunda olduğu için adreslenemez.`
              );
            }

            if (
              unit.status ===
              HandlingUnitStatus.IN_TRANSIT
            ) {
              throw new Error(
                `${unit.barcode} transfer sürecinde olduğu için adreslenemez.`
              );
            }

            if (unit.parentUnitId) {
              throw new Error(
                `${unit.barcode} kolisi ${unit.parentUnit?.barcode ?? "bir palete"} bağlıdır. ` +
                  "Bağlı koliyi ayrı olarak adreslemek yerine üst paleti okutun."
              );
            }
          }

          const unitsToAddress =
            handlingUnits.filter(
              (unit) =>
                unit.warehouseId !==
                  warehouseId ||
                unit.locationId !==
                  locationId
            );

          const skippedUnitCount =
            handlingUnits.length -
            unitsToAddress.length;

          if (
            unitsToAddress.length === 0
          ) {
            throw new Error(
              "Seçilen taşıma birimlerinin tamamı zaten hedef lokasyonda bulunuyor."
            );
          }

          let affectedUnitCount = 0;
          let totalStockQuantity = 0;

          const affectedUnitIds:
            number[] = [];

          for (
            const unit of unitsToAddress
          ) {
            const directStock =
              unit.items.reduce(
                (total, item) =>
                  total + item.quantity,
                0
              );

            const childStock =
              unit.childUnits.reduce(
                (
                  childUnitTotal,
                  childUnit
                ) =>
                  childUnitTotal +
                  childUnit.items.reduce(
                    (
                      itemTotal,
                      item
                    ) =>
                      itemTotal +
                      item.quantity,
                    0
                  ),
                0
              );

            totalStockQuantity +=
              directStock + childStock;

            await tx.handlingUnit.update({
              where: {
                id: unit.id,
              },

              data: {
                warehouseId,
                locationId,
                status:
                  HandlingUnitStatus.STORED,
              },
            });

            affectedUnitIds.push(unit.id);
            affectedUnitCount += 1;

            if (
              unit.unitType ===
                HandlingUnitType.PALLET &&
              unit.childUnits.length > 0
            ) {
              const childUnitIds =
                unit.childUnits.map(
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

              affectedUnitIds.push(
                ...childUnitIds
              );

              affectedUnitCount +=
                childUnitIds.length;
            }
          }

          return {
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

            selectedUnitCount:
              handlingUnits.length,

            addressedMainUnitCount:
              unitsToAddress.length,

            affectedUnitCount,

            skippedUnitCount,

            totalStockQuantity,

            affectedUnitIds,
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,

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
      "/admin/handling-units/addressing/bulk"
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

    for (
      const handlingUnitId of
      result.affectedUnitIds
    ) {
      revalidatePath(
        `/admin/handling-units/${handlingUnitId}`
      );
    }

    return {
      success: true,

      message:
        `${result.addressedMainUnitCount} ana taşıma birimi ` +
        `${result.warehouseCode} / ${result.locationCode} adresine yerleştirildi. ` +
        `Bağlı kolilerle birlikte toplam ${result.affectedUnitCount} taşıma birimi güncellendi.`,

      warehouseCode:
        result.warehouseCode,

      warehouseName:
        result.warehouseName,

      locationCode:
        result.locationCode,

      selectedUnitCount:
        result.selectedUnitCount,

      addressedMainUnitCount:
        result.addressedMainUnitCount,

      affectedUnitCount:
        result.affectedUnitCount,

      skippedUnitCount:
        result.skippedUnitCount,

      totalStockQuantity:
        result.totalStockQuantity,
    };
  } catch (error) {
    console.error(
      "Toplu koli/palet adresleme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı taşıma birimi üzerinde başka bir işlem yapıldı. Lütfen işlemi tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Toplu adresleme sırasında beklenmeyen bir hata oluştu."
    );
  }
}