"use server";

import {
  HandlingUnitStatus,
  HandlingUnitType,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type PalletLinkActionState = {
  success: boolean;
  message: string;

  palletId: number | null;
  palletBarcode: string;

  boxId: number | null;
  boxBarcode: string;

  linkedBoxCount: number;
  boxStockQuantity: number;
};

const emptyState: PalletLinkActionState = {
  success: false,
  message: "",

  palletId: null,
  palletBarcode: "",

  boxId: null,
  boxBarcode: "",

  linkedBoxCount: 0,
  boxStockQuantity: 0,
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
): PalletLinkActionState {
  return {
    ...emptyState,
    message,
  };
}

function canAcceptBoxes(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

function canBeLinkedBox(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.CLOSED ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

function getLinkedBoxNextStatus({
  palletStatus,
  boxStatus,
  palletWarehouseId,
  palletLocationId,
}: {
  palletStatus: HandlingUnitStatus;
  boxStatus: HandlingUnitStatus;
  palletWarehouseId: number | null;
  palletLocationId: number | null;
}) {
  if (
    palletStatus ===
      HandlingUnitStatus.STORED &&
    palletWarehouseId &&
    palletLocationId
  ) {
    return HandlingUnitStatus.STORED;
  }

  if (
    boxStatus ===
    HandlingUnitStatus.EMPTY
  ) {
    return HandlingUnitStatus.EMPTY;
  }

  if (
    boxStatus ===
    HandlingUnitStatus.CLOSED
  ) {
    return HandlingUnitStatus.CLOSED;
  }

  return HandlingUnitStatus.OPEN;
}

export async function linkBoxToPallet(
  _previousState: PalletLinkActionState,
  formData: FormData
): Promise<PalletLinkActionState> {
  const palletBarcode =
    normalizeBarcode(
      formData.get("palletBarcode")
    );

  const boxBarcode =
    normalizeBarcode(
      formData.get("boxBarcode")
    );

  if (!palletBarcode) {
    return createErrorState(
      "Palet barkodunu okutun."
    );
  }

  if (!boxBarcode) {
    return createErrorState(
      "Koli barkodunu okutun."
    );
  }

  if (
    palletBarcode === boxBarcode
  ) {
    return createErrorState(
      "Palet ve koli barkodu aynı olamaz."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const [pallet, box] =
            await Promise.all([
              tx.handlingUnit.findUnique({
                where: {
                  barcode:
                    palletBarcode,
                },

                select: {
                  id: true,
                  barcode: true,
                  unitType: true,
                  status: true,
                  warehouseId: true,
                  locationId: true,
                  parentUnitId: true,
                },
              }),

              tx.handlingUnit.findUnique({
                where: {
                  barcode:
                    boxBarcode,
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
                    },
                  },
                },
              }),
            ]);

          if (!pallet) {
            throw new Error(
              `${palletBarcode} barkodlu palet bulunamadı.`
            );
          }

          if (!box) {
            throw new Error(
              `${boxBarcode} barkodlu koli bulunamadı.`
            );
          }

          if (
            pallet.id === box.id
          ) {
            throw new Error(
              "Palet ve koli aynı taşıma birimi olamaz."
            );
          }

          if (
            pallet.unitType !==
            HandlingUnitType.PALLET
          ) {
            throw new Error(
              `${pallet.barcode} barkodlu taşıma birimi palet değildir.`
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
            !canAcceptBoxes(
              pallet.status
            )
          ) {
            throw new Error(
              `${pallet.barcode} paleti koli kabul etmeye uygun durumda değildir.`
            );
          }

          if (
            !canBeLinkedBox(
              box.status
            )
          ) {
            throw new Error(
              `${box.barcode} kolisi palete bağlanmaya uygun durumda değildir.`
            );
          }

          if (pallet.parentUnitId) {
            throw new Error(
              `${pallet.barcode} paleti başka bir taşıma birimine bağlıdır.`
            );
          }

          if (
            box.childUnits.length > 0
          ) {
            throw new Error(
              `${box.barcode} taşıma biriminin bağlı alt birimleri bulunuyor.`
            );
          }

          if (box.parentUnitId) {
            throw new Error(
              `${box.barcode} kolisi zaten ` +
                `${box.parentUnit?.barcode ?? "başka bir palete"} bağlıdır.`
            );
          }

          const boxStockQuantity =
            box.items.reduce(
              (total, item) =>
                total + item.quantity,
              0
            );

          const boxNextStatus =
            getLinkedBoxNextStatus({
              palletStatus:
                pallet.status,

              boxStatus: box.status,

              palletWarehouseId:
                pallet.warehouseId,

              palletLocationId:
                pallet.locationId,
            });

          /*
           * Koli fiziksel olarak palete
           * bağlandığı için paletin depo ve
           * lokasyon bilgileri koliye geçer.
           */
          await tx.handlingUnit.update({
            where: {
              id: box.id,
            },

            data: {
              parentUnitId:
                pallet.id,

              warehouseId:
                pallet.warehouseId,

              locationId:
                pallet.locationId,

              status:
                boxNextStatus,
            },
          });

          /*
           * Boş palete ilk koli
           * bağlandığında palet:
           *
           * Adresliyse STORED,
           * adresli değilse OPEN olur.
           */
          if (
            pallet.status ===
            HandlingUnitStatus.EMPTY
          ) {
            const palletNextStatus =
              pallet.warehouseId &&
              pallet.locationId
                ? HandlingUnitStatus.STORED
                : HandlingUnitStatus.OPEN;

            await tx.handlingUnit.update({
              where: {
                id: pallet.id,
              },

              data: {
                status:
                  palletNextStatus,
              },
            });
          }

          const linkedBoxCount =
            await tx.handlingUnit.count({
              where: {
                parentUnitId:
                  pallet.id,

                unitType:
                  HandlingUnitType.BOX,
              },
            });

          return {
            palletId: pallet.id,

            palletBarcode:
              pallet.barcode,

            boxId: box.id,

            boxBarcode:
              box.barcode,

            linkedBoxCount,

            boxStockQuantity,
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
      "/admin/handling-units/pallet-link"
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
      "/rf"
    );

    revalidatePath(
      "/rf/pallet-link"
    );

    revalidatePath(
      `/admin/handling-units/${result.palletId}`
    );

    revalidatePath(
      `/admin/handling-units/${result.boxId}`
    );

    return {
      success: true,

      message:
        `${result.boxBarcode} kolisi ` +
        `${result.palletBarcode} paletine başarıyla bağlandı.`,

      palletId:
        result.palletId,

      palletBarcode:
        result.palletBarcode,

      boxId:
        result.boxId,

      boxBarcode:
        result.boxBarcode,

      linkedBoxCount:
        result.linkedBoxCount,

      boxStockQuantity:
        result.boxStockQuantity,
    };
  } catch (error) {
    console.error(
      "Koliyi palete bağlama hatası:",
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
        : "Koli palete bağlanırken beklenmeyen bir hata oluştu."
    );
  }
}

export async function unlinkBoxFromPallet(
  boxId: number
) {
  if (
    !Number.isInteger(boxId) ||
    boxId <= 0
  ) {
    throw new Error(
      "Geçersiz koli bilgisi."
    );
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const box =
          await tx.handlingUnit.findUnique({
            where: {
              id: boxId,
            },

            select: {
              id: true,
              barcode: true,
              unitType: true,
              status: true,
              parentUnitId: true,
              warehouseId: true,
              locationId: true,

              items: {
                select: {
                  quantity: true,
                },
              },

              parentUnit: {
                select: {
                  id: true,
                  barcode: true,
                  status: true,
                },
              },
            },
          });

        if (!box) {
          throw new Error(
            "Paletten ayrılacak koli bulunamadı."
          );
        }

        if (
          box.unitType !==
          HandlingUnitType.BOX
        ) {
          throw new Error(
            "Yalnızca koliler paletten ayrılabilir."
          );
        }

        if (
          !box.parentUnitId ||
          !box.parentUnit
        ) {
          throw new Error(
            `${box.barcode} kolisi herhangi bir palete bağlı değil.`
          );
        }

        const palletId =
          box.parentUnit.id;

        const palletBarcode =
          box.parentUnit.barcode;

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
         * Koli aynı fiziksel lokasyonda
         * bırakıldığı için depo ve lokasyon
         * bilgileri korunur.
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
          palletItemCount,
        ] = await Promise.all([
          tx.handlingUnit.count({
            where: {
              parentUnitId:
                palletId,
            },
          }),

          tx.handlingUnitItem.count({
            where: {
              handlingUnitId:
                palletId,

              quantity: {
                gt: 0,
              },
            },
          }),
        ]);

        if (
          remainingBoxCount === 0 &&
          palletItemCount === 0
        ) {
          const pallet =
            await tx.handlingUnit.findUnique({
              where: {
                id: palletId,
              },

              select: {
                warehouseId: true,
                locationId: true,
              },
            });

          const palletNextStatus =
            pallet?.warehouseId &&
            pallet.locationId
              ? HandlingUnitStatus.EMPTY
              : HandlingUnitStatus.EMPTY;

          await tx.handlingUnit.update({
            where: {
              id: palletId,
            },

            data: {
              status:
                palletNextStatus,
            },
          });
        }

        return {
          boxId: box.id,
          boxBarcode:
            box.barcode,

          palletId,
          palletBarcode,
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
    "/admin/handling-units/pallet-link"
  );

  revalidatePath(
    "/admin/stock/location-map"
  );

  revalidatePath(
    "/rf"
  );

  revalidatePath(
    "/rf/pallet-link"
  );

  revalidatePath(
    `/admin/handling-units/${result.boxId}`
  );

  revalidatePath(
    `/admin/handling-units/${result.palletId}`
  );
}