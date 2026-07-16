"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type RFAddressingState = {
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

function createEmptyState(
  message = ""
): RFAddressingState {
  return {
    success: false,
    message,

    handlingUnitId: null,
    handlingUnitBarcode: "",

    warehouseCode: "",
    warehouseName: "",
    locationCode: "",

    affectedUnitCount: 0,
    totalStockQuantity: 0,
  };
}

function normalizeValue(
  value: FormDataEntryValue | null
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

export async function rfAddressHandlingUnit(
  _previousState: RFAddressingState,
  formData: FormData
): Promise<RFAddressingState> {
  const warehouseCode =
    normalizeValue(
      formData.get("warehouseCode")
    );

  const locationBarcode =
    normalizeValue(
      formData.get("locationBarcode")
    );

  const handlingUnitBarcode =
    normalizeValue(
      formData.get(
        "handlingUnitBarcode"
      )
    );

  if (!warehouseCode) {
    return createEmptyState(
      "Depo kodunu okutun veya yazın."
    );
  }

  if (!locationBarcode) {
    return createEmptyState(
      "Hedef lokasyon barkodunu okutun."
    );
  }

  if (!handlingUnitBarcode) {
    return createEmptyState(
      "Koli veya palet barkodunu okutun."
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
                  equals: warehouseCode,
                  mode: "insensitive",
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

          if (!warehouse.isActive) {
            throw new Error(
              `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`
            );
          }

          /*
           * Lokasyon barkodu;
           * code-section-level-bin
           * formatında okutulur.
           *
           * Aynı lokasyon kodu farklı bölüm,
           * kat ve gözlerde kullanılabildiği
           * için tam adres karşılaştırılır.
           */
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
                aisle: true,
                section: true,
                level: true,
                bin: true,
                locationType: true,
                isActive: true,
              },
            });

          const matchingLocations =
            warehouseLocations.filter(
              (location) =>
                createFullLocationCode({
                  code: location.code,
                  section:
                    location.section,
                  level: location.level,
                  bin: location.bin,
                }) === locationBarcode
            );

          if (
            matchingLocations.length === 0
          ) {
            throw new Error(
              `${warehouse.code} deposunda ${locationBarcode} barkodlu aktif lokasyon bulunamadı.`
            );
          }

          if (
            matchingLocations.length > 1
          ) {
            throw new Error(
              `${locationBarcode} barkodu aynı depoda birden fazla lokasyonla eşleşiyor. ` +
                "Lokasyon kayıtlarını kontrol edin."
            );
          }

          const location =
            matchingLocations[0];

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
              `${handlingUnit.barcode} transfer sürecinde olduğu için adreslenemez.`
            );
          }

          if (
            handlingUnit.parentUnitId
          ) {
            throw new Error(
              `${handlingUnit.barcode} kolisi ` +
                `${handlingUnit.parentUnit?.barcode ?? "bir palete"} bağlıdır. ` +
                "Bağlı koli tek başına adreslenemez. Üst paleti okutun."
            );
          }

          if (
            handlingUnit.warehouseId ===
              warehouse.id &&
            handlingUnit.locationId ===
              location.id
          ) {
            throw new Error(
              `${handlingUnit.barcode} zaten ${warehouse.code} / ${locationBarcode} lokasyonunda bulunuyor.`
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

          const totalStockQuantity =
            directStockQuantity +
            childStockQuantity;

          await tx.handlingUnit.update({
            where: {
              id: handlingUnit.id,
            },

            data: {
              warehouseId:
                warehouse.id,

              locationId:
                location.id,

              status:
                HandlingUnitStatus.STORED,
            },
          });

          const affectedUnitIds = [
            handlingUnit.id,
          ];

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
                warehouseId:
                  warehouse.id,

                locationId:
                  location.id,

                status:
                  HandlingUnitStatus.STORED,
              },
            });

            affectedUnitIds.push(
              ...childUnitIds
            );
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
              locationBarcode,

            affectedUnitCount:
              affectedUnitIds.length,

            totalStockQuantity,

            affectedUnitIds,
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
    revalidatePath("/rf/addressing");

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
      "/admin/stock/location-map"
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    revalidatePath(
      "/admin/warehouses"
    );

    for (
      const unitId of
      result.affectedUnitIds
    ) {
      revalidatePath(
        `/admin/handling-units/${unitId}`
      );
    }

    return {
      success: true,

      message:
        `${result.handlingUnitBarcode} barkodlu taşıma birimi ` +
        `${result.warehouseCode} / ${result.locationCode} lokasyonuna adreslendi. ` +
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
      "RF koli/palet adresleme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createEmptyState(
        "Aynı taşıma birimi üzerinde başka bir işlem yapıldı. Lütfen tekrar deneyin."
      );
    }

    return createEmptyState(
      error instanceof Error
        ? error.message
        : "Adresleme sırasında beklenmeyen bir hata oluştu."
    );
  }
}