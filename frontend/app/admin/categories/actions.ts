"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const slug = createSlug(name);

  await prisma.category.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/categories");
}

export async function toggleCategoryStatus(
  categoryId: number,
  currentStatus: boolean
) {
  await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin/categories");
}