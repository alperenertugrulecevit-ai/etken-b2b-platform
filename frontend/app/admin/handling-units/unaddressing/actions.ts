"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type HandlingUnitUnaddressState = {
  success: boolean;
  message: string;

  selectedMainUnitCount: number;
  affectedUnitCount: number;
  openedUnitCount: number;
  emptiedUnitCount: number;
  totalStockQuantity: number;
};

const emptyState: HandlingUnitUnaddressState =
  {
    success: false,
    message: "",

    selectedMainUnitCount: 0,
    affectedUnitCount: 0,
    openedUnitCount: 0,
    emptiedUnitCount: 0,
    totalStockQuantity: 0,
  };

function createErrorState(
  message: string
): HandlingUnitUnaddressState {
  return {
    ...emptyState,
    message,
  };
}

function parseBarcodes(
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

export async function unaddressHandlingUnits(
  _previousState: HandlingUnitUnaddressState,
  formData: FormData
): Promise<HandlingUnitUnaddressState> {
  await AuthorizationService.requireAnyPermission([
    "LOCATION_MANAGE",
    "HANDLING_UNIT_MANAGE",
  ]);

  const barcodes = parseBarcodes(
    formData.get("handlingUnitBarcodes")
  );

  if (barcodes.length === 0) {
    return createErrorState(
      "Lokasyondan çıkarılacak en az bir koli veya palet okutun."
    );
  }

  if (barcodes.length > 200) {
    return createErrorState(
      "Tek işlemde en fazla 200 ana taşıma birimi işlenebilir."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const handlingUnits =
            await tx.handlingUnit.findMany({
              where: {
                barcode: {
                  in: barcodes,
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
            barcodes.length
          ) {
            const foundBarcodes =
              new Set(
                handlingUnits.map(
                  (unit) =>
                    unit.barcode
                )
              );

            const missingBarcodes =
              barcodes.filter(
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

          for (
            const unit of handlingUnits
          ) {
            if (unit.parentUnitId) {
              throw new Error(
                `${unit.barcode} kolisi ${unit.parentUnit?.barcode ?? "bir palete"} bağlıdır. ` +
                  "Bağlı koli tek başına lokasyondan çıkarılamaz. Üst paleti okutun veya koliyi paletten ayırın."
              );
            }

            if (
              unit.status ===
              HandlingUnitStatus.CANCELLED
            ) {
              throw new Error(
                `${unit.barcode} iptal durumundadır.`
              );
            }

            if (
              unit.status ===
              HandlingUnitStatus.IN_TRANSIT
            ) {
              throw new Error(
                `${unit.barcode} transfer sürecindedir.`
              );
            }

            if (
              !unit.warehouseId &&
              !unit.locationId
            ) {
              throw new Error(
                `${unit.barcode} herhangi bir depo lokasyonunda bulunmuyor.`
              );
            }
          }

          let affectedUnitCount = 0;
          let openedUnitCount = 0;
          let emptiedUnitCount = 0;
          let totalStockQuantity = 0;

          const affectedUnitIds:
            number[] = [];

          for (
            const unit of handlingUnits
          ) {
            const directStockQuantity =
              unit.items.reduce(
                (total, item) =>
                  total + item.quantity,
                0
              );

            const childStockQuantity =
              unit.childUnits.reduce(
                (
                  childTotal,
                  childUnit
                ) =>
                  childTotal +
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
              directStockQuantity +
              childStockQuantity;

            const hasContent =
              directStockQuantity > 0 ||
              unit.childUnits.length > 0;

            const mainNextStatus =
              hasContent
                ? HandlingUnitStatus.OPEN
                : HandlingUnitStatus.EMPTY;

            await tx.handlingUnit.update({
              where: {
                id: unit.id,
              },
              data: {
                warehouseId: null,
                locationId: null,
                status:
                  mainNextStatus,
              },
            });

            affectedUnitIds.push(unit.id);
            affectedUnitCount += 1;

            if (
              mainNextStatus ===
              HandlingUnitStatus.OPEN
            ) {
              openedUnitCount += 1;
            } else {
              emptiedUnitCount += 1;
            }

            if (
              unit.unitType ===
                HandlingUnitType.PALLET &&
              unit.childUnits.length > 0
            ) {
              for (
                const childUnit of
                unit.childUnits
              ) {
                const childQuantity =
                  childUnit.items.reduce(
                    (total, item) =>
                      total +
                      item.quantity,
                    0
                  );

                const childNextStatus =
                  childQuantity > 0
                    ? HandlingUnitStatus.OPEN
                    : HandlingUnitStatus.EMPTY;

                await tx.handlingUnit.update({
                  where: {
                    id: childUnit.id,
                  },
                  data: {
                    warehouseId: null,
                    locationId: null,
                    status:
                      childNextStatus,
                  },
                });

                affectedUnitIds.push(
                  childUnit.id
                );

                affectedUnitCount += 1;

                if (
                  childNextStatus ===
                  HandlingUnitStatus.OPEN
                ) {
                  openedUnitCount += 1;
                } else {
                  emptiedUnitCount += 1;
                }
              }
            }
          }

          return {
            selectedMainUnitCount:
              handlingUnits.length,
            affectedUnitCount,
            openedUnitCount,
            emptiedUnitCount,
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
      "/admin/handling-units/unaddressing"
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
      "/admin/stock/location-map"
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
        `${result.selectedMainUnitCount} ana taşıma birimi lokasyondan çıkarıldı. ` +
        `Bağlı kolilerle birlikte toplam ${result.affectedUnitCount} taşıma birimi güncellendi.`,

      selectedMainUnitCount:
        result.selectedMainUnitCount,
      affectedUnitCount:
        result.affectedUnitCount,
      openedUnitCount:
        result.openedUnitCount,
      emptiedUnitCount:
        result.emptiedUnitCount,
      totalStockQuantity:
        result.totalStockQuantity,
    };
  } catch (error) {
    console.error(
      "Koli/palet adres kaldırma hatası:",
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
        : "Adres kaldırma sırasında beklenmeyen bir hata oluştu."
    );
  }
}