"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function createSlug(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategory(
  formData: FormData
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST"
  );

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  if (!name) {
    return;
  }

  const slug = createSlug(name);

  if (!slug) {
    throw new Error(
      "Kategori adı geçerli bir bağlantı adresi oluşturmak için uygun değil."
    );
  }

  await prisma.category.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
}

export async function toggleCategoryStatus(
  categoryId: number,
  currentStatus: boolean
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST"
  );

  if (
    !Number.isInteger(categoryId) ||
    categoryId <= 0
  ) {
    throw new Error(
      "Geçerli bir kategori kimliği bulunamadı."
    );
  }

  await prisma.category.update({
    where: {
      id: categoryId,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
}