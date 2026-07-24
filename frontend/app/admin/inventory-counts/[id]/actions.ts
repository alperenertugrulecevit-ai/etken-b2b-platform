"use server";

import {
  HandlingUnitStatus,
  InventoryCountStatus,
  Prisma,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const ACTIVE_COUNT_STATUSES:
  InventoryCountStatus[] = [
    InventoryCountStatus.ACTIVE,
    InventoryCountStatus.IN_PROGRESS,
    InventoryCountStatus.SUBMITTED,
  ];

const CANCELLABLE_COUNT_STATUSES:
  InventoryCountStatus[] = [
    InventoryCountStatus.DRAFT,
    InventoryCountStatus.ACTIVE,
    InventoryCountStatus.IN_PROGRESS,
    InventoryCountStatus.SUBMITTED,
  ];

const ASSIGNABLE_COUNT_STATUSES:
  InventoryCountStatus[] = [
    InventoryCountStatus.DRAFT,
    InventoryCountStatus.ACTIVE,
    InventoryCountStatus.IN_PROGRESS,
  ];

function validateInventoryCountId(
  inventoryCountId: number
) {
  if (
    !Number.isInteger(
      inventoryCountId
    ) ||
    inventoryCountId <= 0
  ) {
    throw new Error(
      "Geçerli bir sayım kaydı bulunamadı."
    );
  }
}

function getProfileName(
  profile: Awaited<
    ReturnType<
      typeof AuthorizationService.requirePermission
    >
  >
) {
  return profile.employee
    ? `${profile.employee.firstName} ${profile.employee.lastName}`
    : profile.username;
}

function createDetailUrl(
  inventoryCountId: number,
  type: "success" | "error",
  message: string
) {
  const parameters =
    new URLSearchParams();

  parameters.set(
    type,
    message
  );

  return (
    `/admin/inventory-counts/${inventoryCountId}?` +
    parameters.toString()
  );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return "Sayım kaydı aynı anda başka bir kullanıcı tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.";
  }

  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function parseAssignedUserIds(
  formData: FormData
) {
  const rawValue =
    String(
      formData.get(
        "assignedUserIds"
      ) ?? "[]"
    );

  let parsedValue: unknown;

  try {
    parsedValue =
      JSON.parse(rawValue);
  } catch {
    throw new Error(
      "Seçilen personel bilgileri okunamadı."
    );
  }

  if (
    !Array.isArray(parsedValue)
  ) {
    throw new Error(
      "Seçilen personel bilgileri geçerli değil."
    );
  }

  return Array.from(
    new Set(
      parsedValue
        .map((value) =>
          String(
            value
          ).trim()
        )
        .filter(Boolean)
    )
  );
}

function refreshInventoryCountPages(
  inventoryCountId: number
) {
  revalidatePath(
    "/admin"
  );

  revalidatePath(
    "/admin/inventory-counts"
  );

  revalidatePath(
    `/admin/inventory-counts/${inventoryCountId}`
  );

  revalidatePath(
    "/rf"
  );

  revalidatePath(
    "/rf/inventory-counts"
  );
}

export async function activateInventoryCountAction(
  inventoryCountId: number,
  _formData: FormData
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_COUNT_MANAGE"
  );

  try {
    validateInventoryCountId(
      inventoryCountId
    );

    await prisma.$transaction(
      async (transaction) => {
        const inventoryCount =
          await transaction.inventoryCount.findUnique({
            where: {
              id:
                inventoryCountId,
            },

            select: {
              id: true,
              countNumber: true,
              warehouseId: true,
              status: true,

              assignees: {
                select: {
                  userId: true,
                },
              },

              locations: {
                orderBy: {
                  locationCode:
                    "asc",
                },

                select: {
                  id: true,
                  locationId: true,
                  locationCode: true,

                  location: {
                    select: {
                      id: true,
                      warehouseId:
                        true,
                      isActive:
                        true,
                    },
                  },
                },
              },
            },
          });

        if (!inventoryCount) {
          throw new Error(
            "Aktifleştirilecek sayım bulunamadı."
          );
        }

        if (
          inventoryCount.status !==
          InventoryCountStatus.DRAFT
        ) {
          throw new Error(
            "Yalnızca Taslak durumundaki sayım aktifleştirilebilir."
          );
        }

        if (
          inventoryCount.locations.length ===
          0
        ) {
          throw new Error(
            "Lokasyon bulunmayan sayım aktifleştirilemez."
          );
        }

        if (
          inventoryCount.assignees.length ===
          0
        ) {
          throw new Error(
            "Personel atanmayan sayım aktifleştirilemez."
          );
        }

        const invalidLocation =
          inventoryCount.locations.find(
            (countLocation) =>
              !countLocation.location
                .isActive ||
              countLocation.location
                .warehouseId !==
                inventoryCount.warehouseId
          );

        if (invalidLocation) {
          throw new Error(
            `${invalidLocation.locationCode} lokasyonu pasif durumda veya sayım deposuna ait değil.`
          );
        }

        const assignedUserIds =
          inventoryCount.assignees.map(
            (assignee) =>
              assignee.userId
          );

        const validAssigneeCount =
          await transaction.user.count({
            where: {
              id: {
                in:
                  assignedUserIds,
              },

              status:
                "ACTIVE",

              employee: {
                is: {
                  isActive:
                    true,
                },
              },
            },
          });

        if (
          validAssigneeCount !==
          assignedUserIds.length
        ) {
          throw new Error(
            "Atanan personellerden bazıları artık aktif değil veya personel kaydı bulunmuyor."
          );
        }

        const locationIds =
          inventoryCount.locations.map(
            (countLocation) =>
              countLocation.locationId
          );

        const overlappingCount =
          await transaction.inventoryCount.findFirst({
            where: {
              id: {
                not:
                  inventoryCount.id,
              },

              status: {
                in:
                  ACTIVE_COUNT_STATUSES,
              },

              locations: {
                some: {
                  locationId: {
                    in:
                      locationIds,
                  },
                },
              },
            },

            select: {
              countNumber: true,
            },
          });

        if (overlappingCount) {
          throw new Error(
            `${overlappingCount.countNumber} numaralı aktif sayımla ortak lokasyon bulundu. Aynı lokasyon aynı anda iki planlı sayımda kullanılamaz.`
          );
        }

        const [
          handlingUnits,
          locationStocks,
        ] = await Promise.all([
          transaction.handlingUnit.findMany({
            where: {
              status: {
                notIn: [
                  HandlingUnitStatus.CANCELLED,
                  HandlingUnitStatus.EMPTY,
                ],
              },

              OR: [
                {
                  locationId: {
                    in:
                      locationIds,
                  },
                },
                {
                  parentUnit: {
                    is: {
                      locationId: {
                        in:
                          locationIds,
                      },
                    },
                  },
                },
              ],
            },

            orderBy: {
              id: "asc",
            },

            select: {
              id: true,
              barcode: true,
              unitType: true,
              locationId: true,
              updatedAt: true,

              parentUnit: {
                select: {
                  locationId:
                    true,
                },
              },

              items: {
                where: {
                  quantity: {
                    gt: 0,
                  },
                },

                orderBy: {
                  id: "asc",
                },

                select: {
                  id: true,
                  productId: true,
                  quantity: true,
                  reservedStock:
                    true,
                  updatedAt: true,

                  product: {
                    select: {
                      id: true,
                      code: true,
                      barcode: true,
                      name: true,
                    },
                  },
                },
              },
            },
          }),

          transaction.warehouseLocationStock.findMany({
            where: {
              locationId: {
                in:
                  locationIds,
              },
            },

            select: {
              locationId:
                true,
              productId:
                true,
              quantity:
                true,
              reservedStock:
                true,
              updatedAt:
                true,
            },
          }),
        ]);

        const countLocationByLocationId =
          new Map(
            inventoryCount.locations.map(
              (countLocation) => [
                countLocation.locationId,
                countLocation,
              ]
            )
          );

        const locationStockMap =
          new Map(
            locationStocks.map(
              (locationStock) => [
                `${locationStock.locationId}:${locationStock.productId}`,
                locationStock,
              ]
            )
          );

        const snapshotLines:
          Prisma.InventoryCountLineCreateManyInput[] =
          [];

        for (
          const handlingUnit of
          handlingUnits
        ) {
          const effectiveLocationId =
            handlingUnit.locationId ??
            handlingUnit.parentUnit
              ?.locationId ??
            null;

          if (
            effectiveLocationId ===
            null
          ) {
            continue;
          }

          const countLocation =
            countLocationByLocationId.get(
              effectiveLocationId
            );

          if (!countLocation) {
            continue;
          }

          for (
            const item of
            handlingUnit.items
          ) {
            const locationStock =
              locationStockMap.get(
                `${effectiveLocationId}:${item.productId}`
              );

            snapshotLines.push({
              inventoryCountId:
                inventoryCount.id,

              inventoryCountLocationId:
                countLocation.id,

              locationId:
                effectiveLocationId,

              handlingUnitId:
                handlingUnit.id,

              productId:
                item.product.id,

              status:
                "PENDING",

              locationCode:
                countLocation.locationCode,

              handlingUnitBarcode:
                handlingUnit.barcode,

              handlingUnitType:
                handlingUnit.unitType,

              productCode:
                item.product.code,

              productBarcode:
                item.product.barcode,

              productName:
                item.product.name,

              systemQuantity:
                item.quantity,

              systemReservedStock:
                item.reservedStock,

              locationSystemQuantity:
                locationStock
                  ?.quantity ??
                0,

              locationReservedStock:
                locationStock
                  ?.reservedStock ??
                0,

              handlingUnitUpdatedAt:
                handlingUnit.updatedAt,

              handlingUnitItemUpdatedAt:
                item.updatedAt,

              locationStockUpdatedAt:
                locationStock
                  ?.updatedAt ??
                null,
            });
          }
        }

        const now =
          new Date();

        const transitionResult =
          await transaction.inventoryCount.updateMany({
            where: {
              id:
                inventoryCount.id,

              status:
                InventoryCountStatus.DRAFT,
            },

            data: {
              status:
                InventoryCountStatus.ACTIVE,

              snapshotAt:
                now,

              startedAt:
                now,
            },
          });

        if (
          transitionResult.count !==
          1
        ) {
          throw new Error(
            "Sayım durumu değiştiği için aktifleştirme işlemi tamamlanamadı."
          );
        }

        if (
          snapshotLines.length > 0
        ) {
          await transaction.inventoryCountLine.createMany({
            data:
              snapshotLines,

            skipDuplicates:
              false,
          });
        }
      },
      {
        maxWait: 10000,
        timeout: 60000,

        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      }
    );
  } catch (error) {
    console.error(
      "Planlı sayım aktifleştirme hatası:",
      error
    );

    redirect(
      createDetailUrl(
        inventoryCountId,
        "error",
        getErrorMessage(
          error,
          "Planlı sayım aktifleştirilemedi."
        )
      )
    );
  }

  refreshInventoryCountPages(
    inventoryCountId
  );

  redirect(
    createDetailUrl(
      inventoryCountId,
      "success",
      "Sayım aktifleştirildi ve lokasyon–THM–ürün stok görüntüsü oluşturuldu."
    )
  );
}

export async function addInventoryCountAssigneesAction(
  inventoryCountId: number,
  formData: FormData
): Promise<void> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "INVENTORY_COUNT_MANAGE"
    );

  let addedCount = 0;

  try {
    validateInventoryCountId(
      inventoryCountId
    );

    const selectedUserIds =
      parseAssignedUserIds(
        formData
      );

    if (
      selectedUserIds.length ===
      0
    ) {
      throw new Error(
        "Eklenecek en az bir personel seçin."
      );
    }

    const assignedByName =
      getProfileName(
        currentUser
      );

    addedCount =
      await prisma.$transaction(
        async (transaction) => {
          const inventoryCount =
            await transaction.inventoryCount.findUnique({
              where: {
                id:
                  inventoryCountId,
              },

              select: {
                id: true,
                status: true,

                assignees: {
                  select: {
                    userId:
                      true,
                  },
                },
              },
            });

          if (!inventoryCount) {
            throw new Error(
              "Personel eklenecek sayım bulunamadı."
            );
          }

          if (
            !ASSIGNABLE_COUNT_STATUSES.includes(
              inventoryCount.status
            )
          ) {
            throw new Error(
              "Onaya gönderilmiş, onaylanmış veya iptal edilmiş sayıma personel eklenemez."
            );
          }

          const existingUserIds =
            new Set(
              inventoryCount.assignees.map(
                (assignee) =>
                  assignee.userId
              )
            );

          const newUserIds =
            selectedUserIds.filter(
              (userId) =>
                !existingUserIds.has(
                  userId
                )
            );

          if (
            newUserIds.length ===
            0
          ) {
            throw new Error(
              "Seçilen personeller zaten bu sayıma atanmış."
            );
          }

          const users =
            await transaction.user.findMany({
              where: {
                id: {
                  in:
                    newUserIds,
                },

                status:
                  "ACTIVE",

                employee: {
                  is: {
                    isActive:
                      true,
                  },
                },
              },

              orderBy: {
                username:
                  "asc",
              },

              select: {
                id: true,
                username: true,

                employee: {
                  select: {
                    employeeCode:
                      true,
                    firstName:
                      true,
                    lastName:
                      true,
                  },
                },
              },
            });

          if (
            users.length !==
            newUserIds.length
          ) {
            throw new Error(
              "Seçilen personellerden bazıları bulunamadı veya pasif durumda."
            );
          }

          const createResult =
            await transaction.inventoryCountAssignee.createMany({
              data:
                users.map(
                  (user) => ({
                    inventoryCountId:
                      inventoryCount.id,

                    userId:
                      user.id,

                    username:
                      user.username,

                    employeeCode:
                      user.employee
                        ?.employeeCode ??
                      null,

                    fullName:
                      user.employee
                        ? `${user.employee.firstName} ${user.employee.lastName}`
                        : user.username,

                    assignedById:
                      currentUser.id,

                    assignedByName,
                  })
                ),

              skipDuplicates:
                true,
            });

          return createResult.count;
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

    if (
      addedCount === 0
    ) {
      throw new Error(
        "Sayıma yeni personel eklenemedi."
      );
    }
  } catch (error) {
    console.error(
      "Planlı sayıma personel ekleme hatası:",
      error
    );

    redirect(
      createDetailUrl(
        inventoryCountId,
        "error",
        getErrorMessage(
          error,
          "Sayıma personel eklenemedi."
        )
      )
    );
  }

  refreshInventoryCountPages(
    inventoryCountId
  );

  redirect(
    createDetailUrl(
      inventoryCountId,
      "success",
      `${addedCount} personel sayıma eklendi.`
    )
  );
}

export async function cancelInventoryCountAction(
  inventoryCountId: number,
  formData: FormData
): Promise<void> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "INVENTORY_COUNT_MANAGE"
    );

  try {
    validateInventoryCountId(
      inventoryCountId
    );

    const cancelReason =
      String(
        formData.get(
          "cancelReason"
        ) ?? ""
      ).trim();

    if (
      cancelReason.length < 5
    ) {
      throw new Error(
        "İptal gerekçesi en az 5 karakter olmalıdır."
      );
    }

    if (
      cancelReason.length > 500
    ) {
      throw new Error(
        "İptal gerekçesi en fazla 500 karakter olabilir."
      );
    }

    const cancelledByName =
      getProfileName(
        currentUser
      );

    await prisma.$transaction(
      async (transaction) => {
        const inventoryCount =
          await transaction.inventoryCount.findUnique({
            where: {
              id:
                inventoryCountId,
            },

            select: {
              id: true,
              status: true,
            },
          });

        if (!inventoryCount) {
          throw new Error(
            "İptal edilecek sayım bulunamadı."
          );
        }

        if (
          inventoryCount.status ===
          InventoryCountStatus.APPROVED
        ) {
          throw new Error(
            "Onaylanmış sayım iptal edilemez."
          );
        }

        if (
          inventoryCount.status ===
          InventoryCountStatus.CANCELLED
        ) {
          throw new Error(
            "Sayım daha önce iptal edilmiş."
          );
        }

        if (
          !CANCELLABLE_COUNT_STATUSES.includes(
            inventoryCount.status
          )
        ) {
          throw new Error(
            "Sayım mevcut durumundayken iptal edilemez."
          );
        }

        const now =
          new Date();

        const transitionResult =
          await transaction.inventoryCount.updateMany({
            where: {
              id:
                inventoryCount.id,

              status: {
                in:
                  CANCELLABLE_COUNT_STATUSES,
              },
            },

            data: {
              status:
                InventoryCountStatus.CANCELLED,

              cancelledAt:
                now,

              cancelledById:
                currentUser.id,

              cancelledByName,

              cancelReason,
            },
          });

        if (
          transitionResult.count !==
          1
        ) {
          throw new Error(
            "Sayım durumu değiştiği için iptal işlemi tamamlanamadı."
          );
        }
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
  } catch (error) {
    console.error(
      "Planlı sayım iptal hatası:",
      error
    );

    redirect(
      createDetailUrl(
        inventoryCountId,
        "error",
        getErrorMessage(
          error,
          "Planlı sayım iptal edilemedi."
        )
      )
    );
  }

  refreshInventoryCountPages(
    inventoryCountId
  );

  redirect(
    createDetailUrl(
      inventoryCountId,
      "success",
      "Sayım iptal edildi. Stok kayıtlarında herhangi bir değişiklik yapılmadı."
    )
  );
}