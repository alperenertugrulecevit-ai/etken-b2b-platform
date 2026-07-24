import {
  PrismaClient,
} from "@prisma/client";

const PRODUCT_SEED_DATA = [
  {
    code: "ETK000001",
    barcode: "8690000000001",

    name:
      "Navigator A4 Fotokopi Kağıdı 80 gr",

    brand: "Navigator",
    category: "Ofis Kırtasiye",
    supplier: "Keskin Color",

    price: 189.9,
    initialStock: 245,
    vat: 20,
    ownStock: true,
  },
  {
    code: "ETK000002",
    barcode: "8690000000002",

    name:
      "Koroplast Endüstriyel Streç Film",

    brand: "Koroplast",
    category: "Endüstriyel",
    supplier: "Koroplast",

    price: 124.9,
    initialStock: 82,
    vat: 20,
    ownStock: true,
  },
  {
    code: "ETK000003",
    barcode: "8690000000003",

    name:
      "Karton Bardak 7 Oz",

    brand: "Etken",
    category: "Endüstriyel",
    supplier: "Etken",

    price: 79.9,
    initialStock: 520,
    vat: 20,
    ownStock: true,
  },
  {
    code: "ETK000004",
    barcode: "8690000000004",

    name:
      "Selpak Jumbo Tuvalet Kağıdı",

    brand: "Selpak",
    category: "Temizlik",
    supplier: "Eczacıbaşı",

    price: 469.9,
    initialStock: 61,
    vat: 20,
    ownStock: false,
  },
] as const;

export async function seedProducts(
  prisma: PrismaClient
) {
  console.log(
    "Ürünler hazırlanıyor..."
  );

  let createdCount = 0;
  let updatedCount = 0;

  for (
    const productDefinition of
    PRODUCT_SEED_DATA
  ) {
    const existingProduct =
      await prisma.product.findUnique({
        where: {
          code:
            productDefinition.code,
        },

        select: {
          id: true,
        },
      });

    await prisma.product.upsert({
      where: {
        code:
          productDefinition.code,
      },

      create: {
        code:
          productDefinition.code,

        barcode:
          productDefinition.barcode,

        name:
          productDefinition.name,

        brand:
          productDefinition.brand,

        category:
          productDefinition.category,

        supplier:
          productDefinition.supplier,

        price:
          productDefinition.price,

        stock:
          productDefinition.initialStock,

        reservedStock: 0,

        vat:
          productDefinition.vat,

        ownStock:
          productDefinition.ownStock,

        isActive: true,
      },

      /*
       * Mevcut ürünlerde yalnızca
       * kart bilgileri güncellenir.
       *
       * stock ve reservedStock
       * özellikle güncellenmez.
       * Operasyonlarla oluşan stok
       * bakiyeleri korunur.
       */
      update: {
        barcode:
          productDefinition.barcode,

        name:
          productDefinition.name,

        brand:
          productDefinition.brand,

        category:
          productDefinition.category,

        supplier:
          productDefinition.supplier,

        price:
          productDefinition.price,

        vat:
          productDefinition.vat,

        ownStock:
          productDefinition.ownStock,
      },
    });

    if (existingProduct) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  console.log(
    `Ürün seed tamamlandı: ${createdCount} yeni, ${updatedCount} güncellendi.`
  );
}