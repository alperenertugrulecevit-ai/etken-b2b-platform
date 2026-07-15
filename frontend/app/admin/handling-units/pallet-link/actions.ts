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

  palletBarcode: string;
  boxBarcode: string;
  linkedBoxCount: number;
};

const emptyState: PalletLinkActionState = {
  success: false,
  message: "",
  palletBarcode: "",
  boxBarcode: "",
  linkedBoxCount: 0,
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
    status === HandlingUnitStatus.EMPTY
  );
}

function canBeLinkedBox(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.CLOSED ||
    status === HandlingUnitStatus.EMPTY
  );
}

export async function linkBoxToPallet(
  _previousState: PalletLinkActionState,
  formData: FormData
): Promise<PalletLinkActionState> {
  const palletBarcode = normalizeBarcode(
    formData.get("palletBarcode")
  );

  const boxBarcode = normalizeBarcode(
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

  if (palletBarcode === boxBarcode) {
    return createErrorState(
      "Palet ve koli barkodu aynı olamaz."
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const [pallet, box] =
          await Promise.all([
            tx.handlingUnit.findUnique({
              where: {
                barcode: palletBarcode,
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
                barcode: boxBarcode,
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

        if (!canAcceptBoxes(pallet.status)) {
          throw new Error(
            `${pallet.barcode} paleti koli kabul etmeye açık değildir.`
          );
        }

        if (!canBeLinkedBox(box.status)) {
          throw new Error(
            `${box.barcode} kolisi palete bağlanabilecek durumda değildir.`
          );
        }

        if (box.parentUnitId) {
          throw new Error(
            `${box.barcode} kolisi zaten ${box.parentUnit?.barcode ?? "başka bir palete"} bağlıdır.`
          );
        }

        if (pallet.parentUnitId) {
          throw new Error(
            "Başka bir taşıma birimine bağlı palet hedef olarak kullanılamaz."
          );
        }

        await tx.handlingUnit.update({
          where: {
            id: box.id,
          },

          data: {
            parentUnitId: pallet.id,

            warehouseId:
              pallet.warehouseId,

            locationId:
              pallet.locationId,
          },
        });

        if (
          pallet.status ===
          HandlingUnitStatus.EMPTY
        ) {
          await tx.handlingUnit.update({
            where: {
              id: pallet.id,
            },

            data: {
              status:
                HandlingUnitStatus.OPEN,
            },
          });
        }

        const linkedBoxCount =
          await tx.handlingUnit.count({
            where: {
              parentUnitId: pallet.id,
              unitType:
                HandlingUnitType.BOX,
            },
          });

        return {
          palletId: pallet.id,
          palletBarcode:
            pallet.barcode,

          boxId: box.id,
          boxBarcode: box.barcode,

          linkedBoxCount,
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

      palletBarcode:
        result.palletBarcode,

      boxBarcode:
        result.boxBarcode,

      linkedBoxCount:
        result.linkedBoxCount,
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
    return;
  }

  const result = await prisma.$transaction(
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
            parentUnitId: true,
            warehouseId: true,
            locationId: true,

            parentUnit: {
              select: {
                id: true,
                barcode: true,
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

      await tx.handlingUnit.update({
        where: {
          id: box.id,
        },

        data: {
          parentUnitId: null,

          // Koli fiziksel olarak aynı yerde
          // bırakıldığı için depo ve lokasyon
          // bilgileri korunur.
        },
      });

      const [
        remainingBoxCount,
        palletItemCount,
      ] = await Promise.all([
        tx.handlingUnit.count({
          where: {
            parentUnitId: palletId,
          },
        }),

        tx.handlingUnitItem.count({
          where: {
            handlingUnitId: palletId,

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
        await tx.handlingUnit.update({
          where: {
            id: palletId,
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
    `/admin/handling-units/${result.boxId}`
  );

  revalidatePath(
    `/admin/handling-units/${result.palletId}`
  );
}