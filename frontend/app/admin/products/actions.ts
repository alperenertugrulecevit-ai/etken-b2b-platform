"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function toggleProductStatus(
  productId: number,
  currentStatus: boolean
) {
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
}