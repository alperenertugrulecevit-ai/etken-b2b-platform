import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      {
        code: "ETK000001",
        barcode: "8690000000001",
        name: "Navigator A4 Fotokopi Kağıdı 80 gr",
        brand: "Navigator",
        category: "Ofis Kırtasiye",
        supplier: "Keskin Color",
        price: 189.9,
        stock: 245,
        vat: 20,
        ownStock: true,
      },
      {
        code: "ETK000002",
        barcode: "8690000000002",
        name: "Koroplast Endüstriyel Streç Film",
        brand: "Koroplast",
        category: "Endüstriyel",
        supplier: "Koroplast",
        price: 124.9,
        stock: 82,
        vat: 20,
        ownStock: true,
      },
      {
        code: "ETK000003",
        barcode: "8690000000003",
        name: "Karton Bardak 7 Oz",
        brand: "Etken",
        category: "Endüstriyel",
        supplier: "Etken",
        price: 79.9,
        stock: 520,
        vat: 20,
        ownStock: true,
      },
      {
        code: "ETK000004",
        barcode: "8690000000004",
        name: "Selpak Jumbo Tuvalet Kağıdı",
        brand: "Selpak",
        category: "Temizlik",
        supplier: "Eczacıbaşı",
        price: 469.9,
        stock: 61,
        vat: 20,
        ownStock: false,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Ürünler başarıyla veritabanına aktarıldı.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });