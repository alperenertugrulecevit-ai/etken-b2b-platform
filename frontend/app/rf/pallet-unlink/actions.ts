"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type RFPalletUnlinkState = {
  success: boolean;
  message: string;

  boxId: number | null;
  boxBarcode: string;
  boxStockQuantity: number;
  boxNextStatus: string;

  palletId: number | null;
  palletBarcode: string;
  remainingBoxCount: number;
};

const emptyState: RFPalletUnlinkState = {
  success: false,
  message: "",

  boxId: null,
  boxBarcode: "",
  boxStockQuantity: 0,
  boxNextStatus: "",

  palletId: null,
  palletBarcode: "",
  remainingBoxCount: 0,
};

function createErrorState(
  message: string
): RFPalletUnlinkState {
  return {
    ...emptyState,
    message,
  };
}

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getStatusLabel(
  status: HandlingUnitStatus
) {
  const labels: Record<
    HandlingUnitStatus,
    string
  > = {
    OPEN: "Açık",
    CLOSED: "Kapalı",
    STORED: "Adreslendi",
    IN_TRANSIT: "Transferde",
    EMPTY: "Boş",
    CANCELLED: "İptal",
  };

  return labels[status];
}

export async function rfUnlinkBoxFromPallet(
  _previousState: RFPalletUnlinkState,
  formData: FormData
): Promise<RFPalletUnlinkState> {
  const boxBarcode =
    normalizeBarcode(
      formData.get("boxBarcode")
    );

  if (!boxBarcode) {
    return createErrorState(
      "Paletten ayrılacak koli barkodunu okutun."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const box =
            await tx.handlingUnit.findUnique({
              where: {
                barcode: boxBarcode,
              },

              select: {
                id: true,
                barcode: true,
                unitType: true,
                status: true,
                parentUnitId: true,
                warehouseId: true,
                locationId: true,

                parentUnit: {
                  select: {
                    id: true,
                    barcode: true,
                    unitType: true,
                    status: true,
                    warehouseId: true,
                    locationId: true,
                  },
                },

                items: {
                  select: {
                    quantity: true,
                  },
                },
              },
            });

          if (!box) {
            throw new Error(
              `${boxBarcode} barkodlu koli bulunamadı.`
            );
          }

          if (
            box.unitType !==
            HandlingUnitType.BOX
          ) {
            throw new Error(
              `${box.barcode} barkodlu taşıma birimi koli değildir.`
            );
          }

          if (
            box.status ===
            HandlingUnitStatus.CANCELLED
          ) {
            throw new Error(
              `${box.barcode} iptal durumunda olduğu için işlem yapılamaz.`
            );
          }

          if (
            box.status ===
            HandlingUnitStatus.IN_TRANSIT
          ) {
            throw new Error(
              `${box.barcode} transfer sürecinde olduğu için paletten ayrılamaz.`
            );
          }

          if (
            !box.parentUnitId ||
            !box.parentUnit
          ) {
            throw new Error(
              `${box.barcode} herhangi bir palete bağlı değildir.`
            );
          }

          if (
            box.parentUnit.unitType !==
            HandlingUnitType.PALLET
          ) {
            throw new Error(
              `${box.barcode} geçerli bir palete bağlı değildir.`
            );
          }

          const pallet =
            box.parentUnit;

          const boxStockQuantity =
            box.items.reduce(
              (total, item) =>
                total + item.quantity,
              0
            );

          let boxNextStatus:
            HandlingUnitStatus;

          if (
            box.warehouseId &&
            box.locationId
          ) {
            boxNextStatus =
              HandlingUnitStatus.STORED;
          } else if (
            boxStockQuantity > 0
          ) {
            boxNextStatus =
              HandlingUnitStatus.OPEN;
          } else {
            boxNextStatus =
              HandlingUnitStatus.EMPTY;
          }

          /*
           * Koli fiziksel olarak paletin
           * bulunduğu yerde bırakılır.
           *
           * warehouseId ve locationId
           * değiştirilmez.
           */
          await tx.handlingUnit.update({
            where: {
              id: box.id,
            },

            data: {
              parentUnitId: null,
              status: boxNextStatus,
            },
          });

          const [
            remainingBoxCount,
            palletDirectItemCount,
          ] = await Promise.all([
            tx.handlingUnit.count({
              where: {
                parentUnitId:
                  pallet.id,

                unitType:
                  HandlingUnitType.BOX,
              },
            }),

            tx.handlingUnitItem.count({
              where: {
                handlingUnitId:
                  pallet.id,

                quantity: {
                  gt: 0,
                },
              },
            }),
          ]);

          if (
            remainingBoxCount === 0 &&
            palletDirectItemCount === 0
          ) {
            await tx.handlingUnit.update({
              where: {
                id: pallet.id,
              },

              data: {
                status:
                  HandlingUnitStatus.EMPTY,
              },
            });
          }

          return {
            boxId: box.id,
            boxBarcode: box.barcode,
            boxStockQuantity,
            boxNextStatus,

            palletId: pallet.id,
            palletBarcode:
              pallet.barcode,

            remainingBoxCount,
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
      "/rf/pallet-unlink"
    );

    revalidatePath(
      "/rf/pallet-link"
    );

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      "/admin/handling-units/pallet-link"
    );

    revalidatePath(
      "/admin/stock/location-map"
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    revalidatePath(
      `/admin/handling-units/${result.boxId}`
    );

    revalidatePath(
      `/admin/handling-units/${result.palletId}`
    );

    return {
      success: true,

      message:
        `${result.boxBarcode} kolisi ` +
        `${result.palletBarcode} paletinden ayrıldı.`,

      boxId: result.boxId,
      boxBarcode:
        result.boxBarcode,

      boxStockQuantity:
        result.boxStockQuantity,

      boxNextStatus:
        getStatusLabel(
          result.boxNextStatus
        ),

      palletId:
        result.palletId,

      palletBarcode:
        result.palletBarcode,

      remainingBoxCount:
        result.remainingBoxCount,
    };
  } catch (error) {
    console.error(
      "RF paletten koli ayırma hatası:",
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
        : "Koli paletten ayrılırken beklenmeyen bir hata oluştu."
    );
  }
}