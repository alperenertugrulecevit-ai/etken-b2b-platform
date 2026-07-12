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

export async function createBrand(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const slug = createSlug(name);

  await prisma.brand.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/brands");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin/products");
}

export async function toggleBrandStatus(
  brandId: number,
  currentStatus: boolean
) {
  await prisma.brand.update({
    where: {
      id: brandId,
    },
    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/admin/brands");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin/products");
}