import { prisma } from "../lib/prisma";

type CategoryMap = Record<string, string[]>;

const CATEGORY_MAP: CategoryMap = {
  "Ofis Kırtasiye": [
    "Ofis Kırtasiye",
    "Fotokopi Kağıdı",
    "Bant",
    "Bant Kesici",
    "Delgeç",
    "Evrak Rafı",
    "Hesap Makinesi",
    "Marker Kalem",
    "Plastik Klasör",
    "Poşet Dosya",
    "Tahta Kalemi",
    "Tel Sökücü",
    "Tükenmez Kalem",
    "Versatil Kalem",
    "Yapışkanlı Not",
    "Yapıştırıcı",
    "Zımba",
    "Zımba Teli",
  ],

  "Temizlik ve Hijyen": [
    "Banyo ve Tuvalet",
    "Bulaşık Deterjanı",
    "Cam Temizleyici",
    "Çamaşır Suyu",
    "Çöp Torbası",
    "Hareketli Havlu",
    "İçten Çekmeli Havlu",
    "Kağıt Havlu",
    "Kolonya",
    "Lavabo Açıcı",
    "Mutfak Temizleyici",
    "Peçete",
    "Sünger",
    "Temizlik Bezi",
    "Tuvalet Kağıdı",
    "Yüzey Temizleyici",
  ],

  "Gıda ve Mutfak": [
    "Bitki Çayı",
    "Çekirdek Kahve",
    "Demlik Poşet Çay",
    "Dökme Çay",
    "Filtre Kahve",
    "Hazır Kahve",
    "Kahve",
    "Kahve Yan Ürünü",
    "Karton Bardak",
    "Kullan At Mutfak",
    "Şeker",
    "Türk Kahvesi",
    "Yeşil Çay",
  ],

  "Ambalaj ve Paketleme": [
    "Balonlu Naylon",
    "Çift Taraflı Bant",
    "Karton Koli",
    "Koli Bandı",
    "Streç Film",
  ],

  "İş Güvenliği": [
    "Baret",
    "Koruyucu Gözlük",
    "Reflektörlü Yelek",
    "Uyarı Levhası",
  ],
};

function slugify(value: string) {
  return value
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

async function main() {
  console.log("Kategori taşıma işlemi başladı...");

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      categoryId: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`Aktif ürün: ${products.length}`);

  const productCategories =
    Array.from(
      new Set(
        products.map(
          (product) =>
            product.category,
        ),
      ),
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "tr",
        ),
    );

  const knownSubCategories =
    new Set(
      Object.values(
        CATEGORY_MAP,
      ).flat(),
    );

  const unknownCategories =
    productCategories.filter(
      (category) =>
        !knownSubCategories.has(
          category,
        ),
    );

  if (
    unknownCategories.length >
    0
  ) {
    console.error(
      "\nEşleştirilmemiş kategoriler bulundu:",
    );

    for (
      const category of
      unknownCategories
    ) {
      console.error(
        `- ${category}`,
      );
    }

    throw new Error(
      "Kategori eşleştirmesi tamamlanmadan işlem durduruldu.",
    );
  }

  const categoryIdByName =
    new Map<
      string,
      number
    >();

  for (
    const [
      mainCategoryName,
      subCategories,
    ] of Object.entries(
      CATEGORY_MAP,
    )
  ) {
    const mainSlug =
      slugify(
        mainCategoryName,
      );

    const mainCategory =
      await prisma.category.upsert({
        where: {
          slug:
            mainSlug,
        },

        update: {
          name:
            mainCategoryName,

          isActive:
            true,

          parentId:
            null,
        },

        create: {
          name:
            mainCategoryName,

          slug:
            mainSlug,

          isActive:
            true,

          parentId:
            null,
        },
      });

    console.log(
      `Ana kategori hazır: ${mainCategory.name}`,
    );

    for (
      const subCategoryName of
      subCategories
    ) {
      if (
        subCategoryName ===
        mainCategoryName
      ) {
        categoryIdByName.set(
          subCategoryName,
          mainCategory.id,
        );

        continue;
      }

      const subSlug =
        `${mainSlug}-${slugify(
          subCategoryName,
        )}`;

      const subCategory =
        await prisma.category.upsert({
          where: {
            slug:
              subSlug,
          },

          update: {
            name:
              subCategoryName,

            parentId:
              mainCategory.id,

            isActive:
              true,
          },

          create: {
            name:
              subCategoryName,

            slug:
              subSlug,

            parentId:
              mainCategory.id,

            isActive:
              true,
          },
        });

      categoryIdByName.set(
        subCategoryName,
        subCategory.id,
      );
    }
  }

  console.log(
    "\nKategori kayıtları hazır.",
  );

  let updatedCount = 0;

  for (
    const product of
    products
  ) {
    const categoryId =
      categoryIdByName.get(
        product.category,
      );

    if (!categoryId) {
      throw new Error(
        `Kategori ID bulunamadı: ${product.category}`,
      );
    }

    if (
      product.categoryId ===
      categoryId
    ) {
      continue;
    }

    await prisma.product.update({
      where: {
        id:
          product.id,
      },

      data: {
        categoryId,
      },
    });

    updatedCount += 1;
  }

  console.log(
    `Ürüne categoryId yazılan kayıt: ${updatedCount}`,
  );

  const categories =
    await prisma.category.findMany({
      orderBy: [
        {
          parentId: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

  console.table(
    categories.map(
      (category) => ({
        id:
          category.id,

        name:
          category.name,

        parentId:
          category.parentId,

        products:
          category._count
            .products,

        children:
          category._count
            .children,

        active:
          category.isActive,
      }),
    ),
  );

  const missingCategory =
    await prisma.product.count({
      where: {
        isActive: true,
        categoryId: null,
      },
    });

  console.log(
    `\nAktif fakat categoryId boş ürün: ${missingCategory}`,
  );

  if (
    missingCategory !== 0
  ) {
    throw new Error(
      "Bazı aktif ürünlerin kategori bağlantısı kurulamadı.",
    );
  }

  console.log(
    "\nKategori taşıma işlemi başarıyla tamamlandı.",
  );
}

main()
  .catch(
    (error) => {
      console.error(
        error,
      );

      process.exitCode =
        1;
    },
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    },
  );
