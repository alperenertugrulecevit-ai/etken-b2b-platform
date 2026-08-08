"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  prisma,
} from "@/lib/prisma";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

function createSlug(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replaceAll(
      "ı",
      "i",
    )
    .replaceAll(
      "ğ",
      "g",
    )
    .replaceAll(
      "ü",
      "u",
    )
    .replaceAll(
      "ş",
      "s",
    )
    .replaceAll(
      "ö",
      "o",
    )
    .replaceAll(
      "ç",
      "c",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function revalidateCategoryPages() {
  revalidatePath(
    "/",
  );

  revalidatePath(
    "/products",
  );

  revalidatePath(
    "/admin",
  );

  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/categories",
  );
}

export async function createMainCategory(
  formData: FormData,
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const name =
    String(
      formData.get(
        "name",
      ) ?? "",
    ).trim();

  if (!name) {
    throw new Error(
      "Ana kategori adı zorunludur.",
    );
  }

  const baseSlug =
    createSlug(
      name,
    );

  if (!baseSlug) {
    throw new Error(
      "Geçerli bir kategori adı girin.",
    );
  }

  const existing =
    await prisma.category.findFirst({
      where: {
        parentId:
          null,

        name: {
          equals:
            name,

          mode:
            "insensitive",
        },
      },

      select: {
        id: true,
      },
    });

  if (existing) {
    throw new Error(
      "Bu ana kategori zaten mevcut.",
    );
  }

  let slug =
    baseSlug;

  let counter =
    2;

  while (
    await prisma.category.findUnique({
      where: {
        slug,
      },

      select: {
        id: true,
      },
    })
  ) {
    slug =
      `${baseSlug}-${counter}`;

    counter +=
      1;
  }

  await prisma.category.create({
    data: {
      name,
      slug,
      isActive:
        true,
      parentId:
        null,
    },
  });

  revalidateCategoryPages();
}

export async function createSubCategory(
  formData: FormData,
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const name =
    String(
      formData.get(
        "name",
      ) ?? "",
    ).trim();

  const parentId =
    Number(
      formData.get(
        "parentId",
      ),
    );

  if (!name) {
    throw new Error(
      "Alt kategori adı zorunludur.",
    );
  }

  if (
    !Number.isInteger(
      parentId,
    ) ||
    parentId <=
      0
  ) {
    throw new Error(
      "Geçerli bir ana kategori seçin.",
    );
  }

  const parent =
    await prisma.category.findFirst({
      where: {
        id:
          parentId,

        parentId:
          null,
      },

      select: {
        id: true,
        slug: true,
      },
    });

  if (!parent) {
    throw new Error(
      "Ana kategori bulunamadı.",
    );
  }

  const existing =
    await prisma.category.findFirst({
      where: {
        parentId,
        name: {
          equals:
            name,

          mode:
            "insensitive",
        },
      },

      select: {
        id: true,
      },
    });

  if (existing) {
    throw new Error(
      "Bu alt kategori seçilen ana kategori altında zaten mevcut.",
    );
  }

  const rawSlug =
    createSlug(
      name,
    );

  if (!rawSlug) {
    throw new Error(
      "Geçerli bir alt kategori adı girin.",
    );
  }

  let slug =
    `${parent.slug}-${rawSlug}`;

  let counter =
    2;

  while (
    await prisma.category.findUnique({
      where: {
        slug,
      },

      select: {
        id: true,
      },
    })
  ) {
    slug =
      `${parent.slug}-${rawSlug}-${counter}`;

    counter +=
      1;
  }

  await prisma.category.create({
    data: {
      name,
      slug,
      parentId,
      isActive:
        true,
    },
  });

  revalidateCategoryPages();
}

export async function toggleCategoryStatus(
  categoryId: number,
  currentStatus: boolean,
) {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  if (
    !Number.isInteger(
      categoryId,
    ) ||
    categoryId <=
      0
  ) {
    throw new Error(
      "Geçerli bir kategori kimliği bulunamadı.",
    );
  }

  const category =
    await prisma.category.findUnique({
      where: {
        id:
          categoryId,
      },

      select: {
        id: true,
        parentId:
          true,
        children: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!category) {
    throw new Error(
      "Kategori bulunamadı.",
    );
  }

  const nextStatus =
    !currentStatus;

  await prisma.$transaction(
    async (
      tx,
    ) => {
      await tx.category.update({
        where: {
          id:
            categoryId,
        },

        data: {
          isActive:
            nextStatus,
        },
      });

      if (
        category.parentId ===
          null &&
        category.children.length >
          0
      ) {
        await tx.category.updateMany({
          where: {
            parentId:
              categoryId,
          },

          data: {
            isActive:
              nextStatus,
          },
        });
      }
    },
  );

  revalidateCategoryPages();
}