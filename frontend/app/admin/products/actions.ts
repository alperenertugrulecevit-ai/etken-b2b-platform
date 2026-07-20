"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export async function toggleProductStatus(
  productId: number,
  currentStatus: boolean
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST"
  );

  if (
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    throw new Error(
      "Geçerli bir ürün kimliği bulunamadı."
    );
  }

  await prisma.product.update({
    where: {
      id: productId,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  revalidatePath(
    `/admin/products/${productId}`
  );
}