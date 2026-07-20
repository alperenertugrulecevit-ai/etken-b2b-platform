"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type PurchaseOrderActionState = {
  success: boolean;
  message: string;
};

function createPurchaseNumber(
  lastId: number
) {
  const nextNumber = lastId + 1;

  return `PO${String(
    nextNumber
  ).padStart(6, "0")}`;
}

export async function createPurchaseOrder(
  _previousState: PurchaseOrderActionState,
  formData: FormData
): Promise<PurchaseOrderActionState> {
  await AuthorizationService.requirePermission(
    "RECEIVING_EXECUTE"
  );

  const supplierId = Number(
    formData.get("supplierId")
  );

  const expectedDateValue = String(
    formData.get("expectedDate") ?? ""
  ).trim();

  const supplierNote =
    String(
      formData.get("supplierNote") ?? ""
    ).trim() || null;

  const internalNote =
    String(
      formData.get("internalNote") ?? ""
    ).trim() || null;

  if (
    !Number.isInteger(supplierId) ||
    supplierId <= 0
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir tedarikçi seçin.",
    };
  }

  let expectedDate: Date | null = null;

  if (expectedDateValue) {
    expectedDate = new Date(
      `${expectedDateValue}T12:00:00`
    );

    if (
      Number.isNaN(
        expectedDate.getTime()
      )
    ) {
      return {
        success: false,
        message:
          "Beklenen teslim tarihi geçerli değil.",
      };
    }
  }

  let createdPurchaseOrderId: number;

  try {
    const createdPurchaseOrder =
      await prisma.$transaction(
        async (tx) => {
          const supplier =
            await tx.supplier.findFirst({
              where: {
                id: supplierId,
                isActive: true,
              },

              select: {
                id: true,
                paymentTermDays: true,
                discountRate: true,
              },
            });

          if (!supplier) {
            throw new Error(
              "Tedarikçi bulunamadı veya pasif durumda."
            );
          }

          const lastPurchaseOrder =
            await tx.purchaseOrder.findFirst({
              orderBy: {
                id: "desc",
              },

              select: {
                id: true,
              },
            });

          const purchaseNumber =
            createPurchaseNumber(
              lastPurchaseOrder?.id ?? 0
            );

          return tx.purchaseOrder.create({
            data: {
              purchaseNumber,
              supplierId:
                supplier.id,
              status: "DRAFT",
              expectedDate,

              paymentTermDays:
                supplier.paymentTermDays,

              discountRate:
                supplier.discountRate,

              subtotal: 0,
              discountAmount: 0,
              vatAmount: 0,
              totalAmount: 0,

              supplierNote,
              internalNote,
            },

            select: {
              id: true,
            },
          });
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    createdPurchaseOrderId =
      createdPurchaseOrder.id;
  } catch (error) {
    console.error(
      "Satın alma siparişi oluşturma hatası:",
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
          "Satın alma numarası çakıştı. Lütfen tekrar deneyin.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Satın alma siparişi oluşturulurken beklenmeyen bir hata oluştu.",
    };
  }

  revalidatePath("/admin");

  revalidatePath(
    "/admin/purchase-orders"
  );

  redirect(
    `/admin/purchase-orders/${createdPurchaseOrderId}`
  );
}