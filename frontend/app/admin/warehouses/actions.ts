"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type WarehouseActionState = {
  success: boolean;
  message: string;
};

function getOptionalText(
  formData: FormData,
  fieldName: string
) {
  const value = String(
    formData.get(fieldName) ?? ""
  ).trim();

  return value || null;
}

export async function createWarehouse(
  _previousState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const code = String(
    formData.get("code") ?? ""
  )
    .trim()
    .toUpperCase();

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  if (!code) {
    return {
      success: false,
      message: "Depo kodu zorunludur.",
    };
  }

  if (!name) {
    return {
      success: false,
      message: "Depo adı zorunludur.",
    };
  }

  if (code.length > 20) {
    return {
      success: false,
      message:
        "Depo kodu en fazla 20 karakter olabilir.",
    };
  }

  try {
    const warehouse =
      await prisma.warehouse.create({
        data: {
          code,
          name,

          address: getOptionalText(
            formData,
            "address"
          ),

          city: getOptionalText(
            formData,
            "city"
          ),

          district: getOptionalText(
            formData,
            "district"
          ),
        },

        select: {
          id: true,
          code: true,
          name: true,
        },
      });

    revalidatePath("/admin");
    revalidatePath("/admin/warehouses");

    return {
      success: true,
      message:
        `${warehouse.code} - ${warehouse.name} deposu başarıyla oluşturuldu.`,
    };
  } catch (error) {
    console.error(
      "Depo oluşturma hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message:
          "Bu depo koduyla kayıtlı başka bir depo bulunuyor.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Depo oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function toggleWarehouseStatus(
  warehouseId: number,
  currentStatus: boolean
) {
  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    throw new Error(
      "Geçerli bir depo kimliği bulunamadı."
    );
  }

  await prisma.warehouse.update({
    where: {
      id: warehouseId,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/warehouses");

  revalidatePath(
    `/admin/warehouses/${warehouseId}/edit`
  );
}