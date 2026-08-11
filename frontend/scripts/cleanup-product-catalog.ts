import { prisma } from "../lib/prisma";

const APPLY_MODE =
  process.argv.includes("--apply");

const PREFIX_BY_MAIN_CATEGORY: Record<
  string,
  string
> = {
  "Kağıt Ürünleri": "KAG",
  "Ofis Kırtasiye": "KRT",
  "Temizlik ve Hijyen": "TEM",
  "Gıda ve Mutfak": "GID",
  "Ambalaj ve Paketleme": "AMB",
  "İş Güvenliği": "ISG",
  "Teknoloji-Hırdavat": "TEK",
  "Teknoloji ve Elektronik": "TEK",
  Endüstriyel: "END",
};

const STANDARD_CODE_REGEX =
  /^ETK-([A-Z]{3})-(\d{4})$/;

type ProductHistoryCounts = {
  warehouseStocks: number;
  orderItems: number;
  purchaseOrderItems: number;
  stockMovements: number;
  locationStocks: number;
  handlingUnitItems: number;
  pickingRecords: number;
  packingRecords: number;
  shippingUnitItems: number;
  dispatchLines: number;
  inventoryCountLines: number;
  waveDistributionLines: number;
};

function normalizeText(
  value:
    | string
    | null
    | undefined,
) {
  return value?.trim() ?? "";
}

function containsAvansas(
  value:
    | string
    | null
    | undefined,
) {
  return normalizeText(value)
    .toLocaleLowerCase("tr-TR")
    .includes("avansas");
}

function hasRealBarcode(
  productBarcodes: Array<{
    barcode: string;
  }>,
) {
  return productBarcodes.some(
    (item) => {
      const barcode =
        normalizeText(
          item.barcode,
        );

      if (!barcode) {
        return false;
      }

      /*
       * Sistem tarafından geçici olarak
       * üretilmiş barkodları gerçek
       * üretici barkodu saymıyoruz.
       */
      if (
        barcode.startsWith(
          "TMP-",
        ) ||
        barcode.startsWith(
          "ETKINT",
        ) ||
        barcode.startsWith(
          "ETKNEW",
        )
      ) {
        return false;
      }

      /*
       * EAN-8 / UPC / EAN-13 /
       * GTIN-14 aralığı.
       */
      return /^\d{8,14}$/.test(
        barcode,
      );
    },
  );
}

function hasImage({
  imageUrl,
  productImageSources,
}: {
  imageUrl:
    | string
    | null;

  productImageSources: Array<{
    sourceUrl: string;
    storageUrl:
      | string
      | null;
  }>;
}) {
  /*
   * Legacy ana görsel alanı.
   */
  if (
    normalizeText(
      imageUrl,
    )
  ) {
    return true;
  }

  /*
   * Yeni ProductImageSource
   * kayıtlarından herhangi biri.
   */
  return productImageSources.some(
    (image) =>
      Boolean(
        normalizeText(
          image.storageUrl,
        ) ||
          normalizeText(
            image.sourceUrl,
          ),
      ),
  );
}

function resolveMainCategory(
  product: {
    category: string;

    categoryRef: {
      name: string;

      parent: {
        name: string;
      } | null;
    } | null;
  },
) {
  /*
   * Ürün alt kategoriye bağlıysa
   * ana kategori parent'tır.
   */
  if (
    product.categoryRef
      ?.parent?.name
  ) {
    return product.categoryRef
      .parent.name;
  }

  /*
   * Ürün doğrudan ana kategoriye
   * bağlıysa kendi kategori adı.
   */
  if (
    product.categoryRef?.name
  ) {
    return product.categoryRef
      .name;
  }

  /*
   * Eski kategori string alanı.
   */
  return product.category;
}

function hasBusinessHistory(
  counts: ProductHistoryCounts,
) {
  return Object.values(
    counts,
  ).some(
    (count) =>
      count > 0,
  );
}

async function main() {
  console.log(
    "\n======================================",
  );

  console.log(
    " ETKEN ÜRÜN KATALOĞU TEMİZLİĞİ V4",
  );

  console.log(
    "======================================\n",
  );

  console.log(
    APPLY_MODE
      ? "MOD: UYGULAMA"
      : "MOD: SADECE ÖN İZLEME",
  );

  /*
   * ==================================================
   * 1. MEVCUT KATALOĞU OKU
   * ==================================================
   */
  const products =
    await prisma.product.findMany({
      include: {
        categoryRef: {
          select: {
            name: true,

            parent: {
              select: {
                name: true,
              },
            },
          },
        },

        productBarcodes: {
          select: {
            barcode: true,
          },
        },

        productImageSources: {
          select: {
            sourceUrl: true,
            storageUrl: true,
          },
        },

        _count: {
          select: {
            warehouseStocks: true,
            orderItems: true,
            purchaseOrderItems: true,
            stockMovements: true,
            locationStocks: true,
            handlingUnitItems: true,
            pickingRecords: true,
            packingRecords: true,
            shippingUnitItems: true,
            dispatchLines: true,
            inventoryCountLines: true,
            waveDistributionLines: true,
          },
        },
      },

      orderBy: {
        id: "asc",
      },
    });

  console.log(
    `\nToplam mevcut ürün: ${products.length}`,
  );

  /*
   * ==================================================
   * 2. AVANSAS MARKALI ÜRÜNLER
   * ==================================================
   */
  const avansasProducts =
    products.filter(
      (product) =>
        containsAvansas(
          product.brand,
        ) ||
        containsAvansas(
          product.name,
        ),
    );

  console.log(
    "\n--------------------------------------",
  );

  console.log(
    "AVANSAS MARKALI / ADLI ÜRÜNLER",
  );

  console.log(
    "--------------------------------------",
  );

  console.log(
    `Adet: ${avansasProducts.length}`,
  );

  for (
    const product
    of avansasProducts
  ) {
    console.log(
      `${product.code} | ${product.brand} | ${product.name}`,
    );
  }

  /*
   * ==================================================
   * 3. BARKOD + GÖRSEL EKSİK ÜRÜNLER
   * ==================================================
   *
   * Kullanıcının istediği kural:
   *
   * Gerçek ProductBarcode yok
   * VE
   * görsel yok
   *
   * => katalogdan çıkar.
   */
  const incompleteProducts =
    products.filter(
      (product) => {
        const barcodeExists =
          hasRealBarcode(
            product.productBarcodes,
          );

        const imageExists =
          hasImage({
            imageUrl:
              product.imageUrl,

            productImageSources:
              product.productImageSources,
          });

        return (
          !barcodeExists &&
          !imageExists
        );
      },
    );

  console.log(
    "\n--------------------------------------",
  );

  console.log(
    "BARKODU VE GÖRSELİ OLMAYAN ÜRÜNLER",
  );

  console.log(
    "--------------------------------------",
  );

  console.log(
    `Adet: ${incompleteProducts.length}`,
  );

  /*
   * ==================================================
   * 4. TEMİZLENECEK ÜRÜNLERİ TEKİLLEŞTİR
   * ==================================================
   */
  const removalMap =
    new Map<
      number,
      (typeof products)[number]
    >();

  for (
    const product
    of [
      ...avansasProducts,
      ...incompleteProducts,
    ]
  ) {
    removalMap.set(
      product.id,
      product,
    );
  }

  const removalCandidates =
    Array.from(
      removalMap.values(),
    );

  /*
   * Geçmişi olmayan ürün:
   * fiziksel delete.
   */
  const deletable =
    removalCandidates.filter(
      (product) =>
        !hasBusinessHistory(
          product._count,
        ),
    );

  /*
   * Sipariş/stok geçmişi bulunan
   * master kayıtları fiziksel olarak
   * silinemez; geçmiş kayıtları
   * bozmamak için pasif yapılır.
   */
  const protectedProducts =
    removalCandidates.filter(
      (product) =>
        hasBusinessHistory(
          product._count,
        ),
    );

  console.log(
    "\n--------------------------------------",
  );

  console.log(
    "TEMİZLİK ÖZETİ",
  );

  console.log(
    "--------------------------------------",
  );

  console.log(
    `Toplam temizlenecek benzersiz ürün: ${removalCandidates.length}`,
  );

  console.log(
    `Fiziksel silinebilecek: ${deletable.length}`,
  );

  console.log(
    `İşlem geçmişi nedeniyle pasife alınacak: ${protectedProducts.length}`,
  );

  /*
   * ==================================================
   * 5. KOD NORMALİZASYONUNA GİRECEK ÜRÜNLER
   * ==================================================
   *
   * Silinecek ve pasife alınacak ürünler
   * kesinlikle yeni ürün kodu almaz.
   */
  const removalCandidateIds =
    new Set(
      removalCandidates.map(
        (product) =>
          product.id,
      ),
    );

  const productsForCodeNormalization =
    products.filter(
      (product) =>
        !removalCandidateIds.has(
          product.id,
        ),
    );

  /*
   * ==================================================
   * 6. MEVCUT TÜM ÜRÜN KODLARINDAN
   *    EN BÜYÜK NUMARALARI BUL
   * ==================================================
   *
   * Burada kategori eşleşmesine bakmıyoruz.
   *
   * Örneğin DB'de herhangi bir ürün
   * ETK-TEM-0107 kodunu kullanıyorsa,
   * yeni TEM ürünü 0107 alamaz.
   *
   * Önceki P2002 hatasının ana çözümü bu.
   */
  const highestNumberByPrefix =
    new Map<string, number>();

  for (
    const product
    of products
  ) {
    const match =
      product.code.match(
        STANDARD_CODE_REGEX,
      );

    if (!match) {
      continue;
    }

    const prefix =
      match[1];

    const number =
      Number(
        match[2],
      );

    const current =
      highestNumberByPrefix.get(
        prefix,
      ) ?? 0;

    if (
      number >
      current
    ) {
      highestNumberByPrefix.set(
        prefix,
        number,
      );
    }
  }

  /*
   * Mevcut bütün kodları occupied
   * olarak tutuyoruz.
   */
  const occupiedCodes =
    new Set(
      products.map(
        (product) =>
          product.code,
      ),
    );

  /*
   * Silinecek ürün kodlarını bile
   * burada başlangıçta dolu kabul ediyoruz.
   *
   * Böylece eski kodları hemen yeniden
   * kullanmayız; kod geçmişi daha temiz olur.
   */

  /*
   * ==================================================
   * 7. YENİ BENZERSİZ KOD ÜRETİCİ
   * ==================================================
   */
  function createNextCode(
    prefix: string,
  ) {
    let nextNumber =
      (
        highestNumberByPrefix.get(
          prefix,
        ) ?? 0
      ) + 1;

    while (true) {
      const candidate =
        `ETK-${prefix}-${String(
          nextNumber,
        ).padStart(
          4,
          "0",
        )}`;

      if (
        !occupiedCodes.has(
          candidate,
        )
      ) {
        highestNumberByPrefix.set(
          prefix,
          nextNumber,
        );

        occupiedCodes.add(
          candidate,
        );

        return candidate;
      }

      nextNumber += 1;
    }
  }

  /*
   * ==================================================
   * 8. KOD DÜZELTME PLANI
   * ==================================================
   */
  const renamePlan: Array<{
    id: number;
    oldCode: string;
    newCode: string;
    name: string;
    mainCategory: string;
  }> = [];

  for (
    const product
    of productsForCodeNormalization
  ) {
    const mainCategory =
      resolveMainCategory(
        product,
      );

    const expectedPrefix =
      PREFIX_BY_MAIN_CATEGORY[
        mainCategory
      ];

    if (!expectedPrefix) {
      console.log(
        `KOD ATLANACAK - ana kategori eşleşmedi: ${product.code} | ${mainCategory} | ${product.name}`,
      );

      continue;
    }

    const currentMatch =
      product.code.match(
        STANDARD_CODE_REGEX,
      );

    /*
     * Kod zaten ana kategori prefix'iyle
     * uyumluysa dokunma.
     */
    const codeAlreadyCorrect =
      Boolean(
        currentMatch &&
          currentMatch[1] ===
            expectedPrefix,
      );

    if (
      codeAlreadyCorrect
    ) {
      continue;
    }

    const newCode =
      createNextCode(
        expectedPrefix,
      );

    renamePlan.push({
      id: product.id,
      oldCode:
        product.code,
      newCode,
      name:
        product.name,
      mainCategory,
    });
  }

  console.log(
    "\n--------------------------------------",
  );

  console.log(
    "ÜRÜN KODU DÜZELTME PLANI",
  );

  console.log(
    "--------------------------------------",
  );

  console.log(
    `Değişecek ürün: ${renamePlan.length}`,
  );

  for (
    const item
    of renamePlan
  ) {
    console.log(
      `${item.oldCode} -> ${item.newCode} | ${item.mainCategory} | ${item.name}`,
    );
  }

  /*
   * ==================================================
   * 9. ÖN İZLEME MODU
   * ==================================================
   */
  if (!APPLY_MODE) {
    console.log(
      "\n======================================",
    );

    console.log(
      "ÖN İZLEME TAMAMLANDI.",
    );

    console.log(
      "Veritabanında hiçbir değişiklik yapılmadı.",
    );

    console.log(
      "Liste doğruysa --apply ile çalıştırın.",
    );

    console.log(
      "======================================\n",
    );

    return;
  }

  /*
   * ==================================================
   * 10. TÜM DEĞİŞİKLİKLER TEK TRANSACTION
   * ==================================================
   *
   * Bu kez:
   * - delete
   * - deactivate
   * - geçici kod
   * - gerçek kod
   *
   * aynı transaction içindedir.
   *
   * Bir hata olursa hepsi rollback olur.
   */
  await prisma.$transaction(
    async (tx) => {
      /*
       * 10.1 Fiziksel olarak
       * silinebilecek ürünler.
       */
      for (
        const product
        of deletable
      ) {
        await tx.product.delete({
          where: {
            id: product.id,
          },
        });

        console.log(
          `SİLİNDİ: ${product.code} | ${product.name}`,
        );
      }

      /*
       * 10.2 İşlem geçmişi olan
       * katalog dışı ürünler.
       */
      for (
        const product
        of protectedProducts
      ) {
        await tx.product.update({
          where: {
            id: product.id,
          },

          data: {
            isActive: false,
          },
        });

        console.log(
          `PASİF: ${product.code} | ${product.name}`,
        );
      }

      /*
       * 10.3 Kod değişecek ürünlere
       * önce benzersiz geçici kod.
       */
      for (
        const item
        of renamePlan
      ) {
        await tx.product.update({
          where: {
            id: item.id,
          },

          data: {
            code:
              `TMP-RECODE-${item.id}`,
          },
        });
      }

      /*
       * 10.4 Gerçek kategori kodları.
       */
      for (
        const item
        of renamePlan
      ) {
        await tx.product.update({
          where: {
            id: item.id,
          },

          data: {
            code:
              item.newCode,
          },
        });

        console.log(
          `KOD: ${item.oldCode} -> ${item.newCode}`,
        );
      }
    },
    {
      maxWait: 30000,
      timeout: 180000,
    },
  );

  /*
   * ==================================================
   * 11. İŞLEM SONRASI DOĞRULAMA
   * ==================================================
   */
  const finalProducts =
    await prisma.product.findMany({
      include: {
        categoryRef: {
          select: {
            name: true,

            parent: {
              select: {
                name: true,
              },
            },
          },
        },

        productBarcodes: {
          select: {
            barcode: true,
          },
        },

        productImageSources: {
          select: {
            sourceUrl: true,
            storageUrl: true,
          },
        },
      },
    });

  const remainingAvansas =
    finalProducts.filter(
      (product) =>
        product.isActive &&
        (
          containsAvansas(
            product.brand,
          ) ||
          containsAvansas(
            product.name,
          )
        ),
    );

  const remainingIncompleteActive =
    finalProducts.filter(
      (product) => {
        if (
          !product.isActive
        ) {
          return false;
        }

        const barcodeExists =
          hasRealBarcode(
            product.productBarcodes,
          );

        const imageExists =
          hasImage({
            imageUrl:
              product.imageUrl,

            productImageSources:
              product.productImageSources,
          });

        return (
          !barcodeExists &&
          !imageExists
        );
      },
    );

  const remainingWrongCodes =
    finalProducts.filter(
      (product) => {
        if (
          !product.isActive
        ) {
          return false;
        }

        const mainCategory =
          resolveMainCategory(
            product,
          );

        const expectedPrefix =
          PREFIX_BY_MAIN_CATEGORY[
            mainCategory
          ];

        if (!expectedPrefix) {
          return false;
        }

        const match =
          product.code.match(
            STANDARD_CODE_REGEX,
          );

        return !(
          match &&
          match[1] ===
            expectedPrefix
        );
      },
    );

  console.log(
    "\n--------------------------------------",
  );

  console.log(
    "SON KONTROL",
  );

  console.log(
    "--------------------------------------",
  );

  console.log(
    `Toplam kalan ürün: ${finalProducts.length}`,
  );

  console.log(
    `Aktif Avansas ürünü: ${remainingAvansas.length}`,
  );

  console.log(
    `Aktif barkod+görsel eksik ürün: ${remainingIncompleteActive.length}`,
  );

  console.log(
    `Aktif yanlış kategori kodlu ürün: ${remainingWrongCodes.length}`,
  );

  console.log(
    "\n======================================",
  );

  console.log(
    "KATALOG TEMİZLİĞİ TAMAMLANDI.",
  );

  console.log(
    "======================================\n",
  );
}

main()
  .catch((error) => {
    console.error(
      "\nKatalog temizliği başarısız:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });