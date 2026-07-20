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

export async function createBrand(
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
      "Marka adı geçerli bir bağlantı adresi oluşturmak için uygun değil."
    );
  }

  await prisma.brand.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
}

export async function toggleBrandStatus(
  brandId: number,
  currentStatus: boolean
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST"
  );

  if (
    !Number.isInteger(brandId) ||
    brandId <= 0
  ) {
    throw new Error(
      "Geçerli bir marka kimliği bulunamadı."
    );
  }

  await prisma.brand.update({
    where: {
      id: brandId,
    },

    data: {
      isActive: !currentStatus,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
}