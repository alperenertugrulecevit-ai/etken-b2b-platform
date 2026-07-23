"use server";

import {
  InventoryCountScope,
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

export type CreateInventoryCountState = {
  success: boolean;
  message: string;
};

function createErrorState(
  message: string
): CreateInventoryCountState {
  return {
    success: false,
    message,
  };
}

function getIstanbulDatePart() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Istanbul",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const getPart = (
    type: string
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value ?? "";

  return (
    getPart("year") +
    getPart("month") +
    getPart("day")
  );
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

function parseSelectedLocationIds(
  formData: FormData
) {
  const rawValue =
    String(
      formData.get(
        "selectedLocationIds"
      ) ?? "[]"
    );

  let parsedValue: unknown;

  try {
    parsedValue =
      JSON.parse(rawValue);
  } catch {
    throw new Error(
      "Seçilen lokasyon bilgileri okunamadı."
    );
  }

  if (
    !Array.isArray(parsedValue)
  ) {
    throw new Error(
      "Seçilen lokasyon bilgileri geçerli değil."
    );
  }

  return Array.from(
    new Set(
      parsedValue
        .map(Number)
        .filter(
          (value) =>
            Number.isInteger(
              value
            ) &&
            value > 0
        )
    )
  );
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
      "Seçilen sayım personeli bilgileri okunamadı."
    );
  }

  if (
    !Array.isArray(parsedValue)
  ) {
    throw new Error(
      "Seçilen sayım personeli bilgileri geçerli değil."
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

async function createNextCountNumber(
  transaction:
    Prisma.TransactionClient
) {
  const datePart =
    getIstanbulDatePart();

  const prefix =
    `SAY-${datePart}-`;

  const lastInventoryCount =
    await transaction.inventoryCount.findFirst({
      where: {
        countNumber: {
          startsWith: prefix,
        },
      },

      orderBy: {
        countNumber: "desc",
      },

      select: {
        countNumber: true,
      },
    });

  const lastSequence =
    lastInventoryCount
      ? Number(
          lastInventoryCount.countNumber.slice(
            prefix.length
          )
        )
      : 0;

  const nextSequence =
    Number.isInteger(
      lastSequence
    )
      ? lastSequence + 1
      : 1;

  return (
    prefix +
    String(
      nextSequence
    ).padStart(4, "0")
  );
}

export async function createInventoryCountAction(
  _previousState:
    CreateInventoryCountState,
  formData: FormData
): Promise<CreateInventoryCountState> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "INVENTORY_COUNT_MANAGE"
    );

  const warehouseId =
    Number(
      formData.get(
        "warehouseId"
      )
    );

  const scopeValue =
    String(
      formData.get("scope") ??
        ""
    ).trim();

  const notes =
    String(
      formData.get("notes") ??
        ""
    ).trim() || null;

  if (
    !Number.isInteger(
      warehouseId
    ) ||
    warehouseId <= 0
  ) {
    return createErrorState(
      "Geçerli bir depo seçin."
    );
  }

  if (
    scopeValue !==
      InventoryCountScope.ALL_LOCATIONS &&
    scopeValue !==
      InventoryCountScope.SELECTED_LOCATIONS
  ) {
    return createErrorState(
      "Geçerli bir sayım kapsamı seçin."
    );
  }

  if (
    notes &&
    notes.length > 1000
  ) {
    return createErrorState(
      "Sayım açıklaması en fazla 1.000 karakter olabilir."
    );
  }

  let selectedLocationIds:
    number[] = [];

  let assignedUserIds:
    string[] = [];

  if (
    scopeValue ===
    InventoryCountScope.SELECTED_LOCATIONS
  ) {
    try {
      selectedLocationIds =
        parseSelectedLocationIds(
          formData
        );
    } catch (error) {
      return createErrorState(
        error instanceof Error
          ? error.message
          : "Lokasyon seçimi okunamadı."
      );
    }

    if (
      selectedLocationIds.length ===
      0
    ) {
      return createErrorState(
        "Seçili lokasyonlar kapsamında en az bir lokasyon seçin."
      );
    }
  }

  try {
    assignedUserIds =
      parseAssignedUserIds(
        formData
      );
  } catch (error) {
    return createErrorState(
      error instanceof Error
        ? error.message
        : "Sayım personeli seçimi okunamadı."
    );
  }

  if (
    assignedUserIds.length ===
    0
  ) {
    return createErrorState(
      "Sayıma en az bir personel atayın."
    );
  }

  const creatorName =
    currentUser.employee
      ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
      : currentUser.username;

  let createdInventoryCountId:
    number | null = null;

  try {
    const createdInventoryCount =
      await prisma.$transaction(
        async (transaction) => {
          const warehouse =
            await transaction.warehouse.findUnique({
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
              "Sayım yapılacak depo bulunamadı."
            );
          }

          if (!warehouse.isActive) {
            throw new Error(
              `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`
            );
          }

          const assignedUsers =
            await transaction.user.findMany({
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
            assignedUsers.length !==
            assignedUserIds.length
          ) {
            throw new Error(
              "Seçilen personellerden bazıları bulunamadı veya pasif durumda."
            );
          }

          const locations =
            await transaction.warehouseLocation.findMany({
              where: {
                warehouseId:
                  warehouse.id,

                isActive: true,

                ...(scopeValue ===
                InventoryCountScope.SELECTED_LOCATIONS
                  ? {
                      id: {
                        in:
                          selectedLocationIds,
                      },
                    }
                  : {}),
              },

              orderBy: [
                {
                  sortOrder: "asc",
                },
                {
                  code: "asc",
                },
                {
                  section: "asc",
                },
                {
                  level: "asc",
                },
                {
                  bin: "asc",
                },
              ],

              select: {
                id: true,
                code: true,
                aisle: true,
                section: true,
                level: true,
                bin: true,
              },
            });

          if (
            locations.length === 0
          ) {
            throw new Error(
              "Seçilen kapsamda aktif lokasyon bulunamadı."
            );
          }

          if (
            scopeValue ===
              InventoryCountScope.SELECTED_LOCATIONS &&
            locations.length !==
              selectedLocationIds.length
          ) {
            throw new Error(
              "Seçilen lokasyonlardan bazıları bulunamadı, pasif durumda veya seçilen depoya ait değil."
            );
          }

          const locationCodes =
            locations.map(
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
                })
            );

          if (
            new Set(
              locationCodes
            ).size !==
            locationCodes.length
          ) {
            throw new Error(
              "Seçilen lokasyonlarda aynı barkodu üreten birden fazla kayıt bulunuyor. Lokasyon tanımlarını kontrol edin."
            );
          }

          const countNumber =
            await createNextCountNumber(
              transaction
            );

          return transaction.inventoryCount.create({
            data: {
              countNumber,

              warehouseId:
                warehouse.id,

              scope:
                scopeValue,

              status: "DRAFT",

              notes,

              createdById:
                currentUser.id,

              createdByName:
                creatorName,

              locations: {
                create:
                  locations.map(
                    (
                      location,
                      index
                    ) => ({
                      locationId:
                        location.id,

                      locationCode:
                        locationCodes[
                          index
                        ],

                      status:
                        "PENDING",
                    })
                  ),
              },

              assignees: {
                create:
                  assignedUsers.map(
                    (
                      assignedUser
                    ) => ({
                      userId:
                        assignedUser.id,

                      username:
                        assignedUser.username,

                      employeeCode:
                        assignedUser.employee
                          ?.employeeCode ??
                        null,

                      fullName:
                        assignedUser.employee
                          ? `${assignedUser.employee.firstName} ${assignedUser.employee.lastName}`
                          : assignedUser.username,

                      assignedById:
                        currentUser.id,

                      assignedByName:
                        creatorName,
                    })
                  ),
              },
            },

            select: {
              id: true,
              countNumber: true,
            },
          });
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

    createdInventoryCountId =
      createdInventoryCount.id;
  } catch (error) {
    console.error(
      "Planlı sayım oluşturma hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      (
        error.code === "P2002" ||
        error.code === "P2034"
      )
    ) {
      return createErrorState(
        "Sayım numarası oluşturulurken başka bir işlem gerçekleşti. Lütfen tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Planlı sayım oluşturulurken beklenmeyen bir hata oluştu."
    );
  }

  revalidatePath(
    "/admin/inventory-counts"
  );

  revalidatePath(
    `/admin/inventory-counts/${createdInventoryCountId}`
  );

  redirect(
    `/admin/inventory-counts/${createdInventoryCountId}?success=${encodeURIComponent(
      "Planlı sayım taslak olarak oluşturuldu."
    )}`
  );
}