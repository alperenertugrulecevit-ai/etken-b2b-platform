import {
  CompetitorStockStatus,
} from "@prisma/client";
import * as cheerio from "cheerio";

import { prisma } from "../lib/prisma";
import { ProductImageStorageService } from "../modules/products/images/product-image-storage.service";

const APPLY_MODE =
  process.argv.includes("--apply");

const START_URL =
  "https://www.ofis26.com/";

const OFIS26_SITE_CODE =
  "OFIS26";

const NEW_SKU_START_NUMBER =
  1000;

const EXPECTED_PRODUCT_COUNT =
  784;

const PRICE_MULTIPLIER =
  1.20;

const REQUEST_TIMEOUT_MS =
  20_000;

const REQUEST_DELAY_MS =
  120;

const IMAGE_DELAY_MS =
  75;

const USER_AGENT =
  "Mozilla/5.0 (compatible; EtkenOfficeCatalogResume/1.0; +https://etkenofis.com)";

const PARENT_CATEGORY_NAMES =
  new Set([
    "Kalem ve Yazı Gereçleri",
    "Masaüstü Gereçler",
    "Dosya ve Arşivleme",
    "Kağıt Ürünleri",
  ]);

type CategoryItem = {
  name: string;
  url: string;
};

type ProductListItem = {
  productId: number;
  variantId: number | null;
  name: string | null;
  brand: string | null;
  stockCode: string | null;
  url: string;
  categories: Set<string>;
};

type LiveProduct = {
  productId: number;
  name: string;
  brand: string;
  stockCode: string | null;
  sourceBarcode: string | null;
  barcode: string;
  priceInclVat: number;
  priceExclVat: number;
  etkenPrice: number;
  vatRate: number;
  stockAmount: number;
  imageUrl: string | null;
  productUrl: string;
  categories: string[];
  targetCategory: string;
  targetParentCategory: string | null;
  etkenCode: string;
};

function cleanText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value ?? ""
  )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function wait(
  ms: number,
) {
  return new Promise<void>(
    (resolve) =>
      setTimeout(
        resolve,
        ms,
      ),
  );
}

function slugify(
  value: string,
): string {
  return value
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

async function fetchHtml(
  url: string,
): Promise<string> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            "user-agent":
              USER_AGENT,

            accept:
              "text/html,application/xhtml+xml",

            "accept-language":
              "tr-TR,tr;q=0.9,en;q=0.7",
          },

          redirect:
            "follow",

          cache:
            "no-store",

          signal:
            controller.signal,
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `${url} HTTP ${response.status}`,
      );
    }

    return await response.text();
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

async function downloadImage(
  imageUrl: string,
): Promise<Buffer> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const response =
      await fetch(
        imageUrl,
        {
          headers: {
            "user-agent":
              USER_AGENT,

            accept:
              "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },

          redirect:
            "follow",

          signal:
            controller.signal,
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Görsel HTTP ${response.status}`,
      );
    }

    const buffer =
      await response.arrayBuffer();

    return Buffer.from(
      buffer,
    );
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

function normalizeUrl(
  href: string,
  baseUrl: string,
): string | null {
  try {
    const url =
      new URL(
        href,
        baseUrl,
      );

    url.hash =
      "";

    if (
      url.hostname !==
        "www.ofis26.com" &&
      url.hostname !==
        "ofis26.com"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function discoverCategories(): Promise<CategoryItem[]> {
  const html =
    await fetchHtml(
      START_URL,
    );

  const $ =
    cheerio.load(
      html,
    );

  const officeAnchor =
    $("a")
      .filter(
        (
          _,
          element,
        ) =>
          cleanText(
            $(element).text(),
          )
            .toLocaleLowerCase(
              "tr-TR",
            ) ===
          "ofis kırtasiye",
      )
      .first();

  if (
    officeAnchor.length ===
    0
  ) {
    throw new Error(
      "Ofis Kırtasiye menüsü bulunamadı.",
    );
  }

  let container =
    officeAnchor.parent();

  for (
    let depth = 0;
    depth < 6;
    depth += 1
  ) {
    if (
      container.find(
        "a",
      ).length >=
      10
    ) {
      break;
    }

    container =
      container.parent();
  }

  const categories =
    new Map<
      string,
      CategoryItem
    >();

  container
    .find(
      "a",
    )
    .each(
      (
        _,
        element,
      ) => {
        const name =
          cleanText(
            $(element).text(),
          );

        const href =
          cleanText(
            $(element).attr(
              "href",
            ),
          );

        if (
          !name ||
          !href
        ) {
          return;
        }

        if (
          name
            .toLocaleLowerCase(
              "tr-TR",
            ) ===
          "ofis kırtasiye"
        ) {
          return;
        }

        const url =
          normalizeUrl(
            href,
            START_URL,
          );

        if (!url) {
          return;
        }

        categories.set(
          url,
          {
            name,
            url,
          },
        );
      },
    );

  return Array.from(
    categories.values(),
  );
}

function getMaxPage(
  html: string,
): number {
  const $ =
    cheerio.load(
      html,
    );

  let maxPage =
    1;

  $("a[href]").each(
    (
      _,
      element,
    ) => {
      const href =
        $(element).attr(
          "href",
        );

      if (!href) {
        return;
      }

      const match =
        href.match(
          /[?&]sayfa=(\d+)/i,
        );

      if (!match) {
        return;
      }

      const page =
        Number(
          match[1],
        );

      if (
        Number.isFinite(
          page,
        ) &&
        page >
          maxPage
      ) {
        maxPage =
          page;
      }
    },
  );

  return maxPage;
}

function extractProductLinks(
  html: string,
  pageUrl: string,
  categoryName: string,
): ProductListItem[] {
  const $ =
    cheerio.load(
      html,
    );

  const result =
    new Map<
      number,
      ProductListItem
    >();

  $(
    ".productDetail[data-id]",
  ).each(
    (
      _,
      element,
    ) => {
      const detail =
        $(element);

      const productId =
        Number(
          detail.attr(
            "data-id",
          ),
        );

      if (
        !Number.isInteger(
          productId,
        ) ||
        productId <=
          0
      ) {
        return;
      }

      let href =
        detail
          .find(
            `.productName.detailUrl[data-id="${productId}"] a[href]`,
          )
          .first()
          .attr(
            "href",
          );

      if (!href) {
        href =
          detail
            .find(
              `a.detailUrl[data-id="${productId}"][href]`,
            )
            .first()
            .attr(
              "href",
            );
      }

      if (!href) {
        return;
      }

      const url =
        normalizeUrl(
          href,
          pageUrl,
        );

      if (!url) {
        return;
      }

      result.set(
        productId,
        {
          productId,

          variantId:
            Number(
              detail.attr(
                "data-variant-id",
              ),
            ) ||
            null,

          name:
            cleanText(
              detail
                .find(
                  ".productName a",
                )
                .first()
                .text(),
            ) ||
            null,

          brand:
            cleanText(
              detail
                .find(
                  ".productMarka",
                )
                .first()
                .text(),
            ) ||
            null,

          stockCode:
            cleanText(
              detail
                .find(
                  ".productStokKodu",
                )
                .first()
                .text(),
            ) ||
            null,

          url,

          categories:
            new Set([
              categoryName,
            ]),
        },
      );
    },
  );

  return Array.from(
    result.values(),
  );
}

function extractBalancedJsonObject(
  html: string,
  marker: string,
): string | null {
  const markerIndex =
    html.indexOf(
      marker,
    );

  if (
    markerIndex <
    0
  ) {
    return null;
  }

  const start =
    html.indexOf(
      "{",
      markerIndex,
    );

  if (
    start <
    0
  ) {
    return null;
  }

  let depth =
    0;

  let inString =
    false;

  let escaped =
    false;

  for (
    let index =
      start;
    index <
    html.length;
    index += 1
  ) {
    const char =
      html[
        index
      ];

    if (
      inString
    ) {
      if (
        escaped
      ) {
        escaped =
          false;

        continue;
      }

      if (
        char ===
        "\\"
      ) {
        escaped =
          true;

        continue;
      }

      if (
        char ===
        '"'
      ) {
        inString =
          false;
      }

      continue;
    }

    if (
      char ===
      '"'
    ) {
      inString =
        true;

      continue;
    }

    if (
      char ===
      "{"
    ) {
      depth += 1;
    }

    if (
      char ===
      "}"
    ) {
      depth -= 1;

      if (
        depth ===
        0
      ) {
        return html.slice(
          start,
          index + 1,
        );
      }
    }
  }

  return null;
}

function isValidGtin(
  value:
    | string
    | null,
): boolean {
  const barcode =
    cleanText(
      value,
    );

  if (
    !/^\d+$/.test(
      barcode,
    )
  ) {
    return false;
  }

  if (
    ![
      8,
      12,
      13,
      14,
    ].includes(
      barcode.length,
    )
  ) {
    return false;
  }

  const digits =
    barcode
      .split(
        "",
      )
      .map(
        Number,
      );

  const checkDigit =
    digits.pop();

  if (
    checkDigit ===
    undefined
  ) {
    return false;
  }

  let sum =
    0;

  for (
    let index =
      digits.length - 1,
      pos =
        1;
    index >=
    0;
    index -=
      1,
      pos +=
        1
  ) {
    sum +=
      digits[
        index
      ] *
      (
        pos %
          2 ===
        1
          ? 3
          : 1
      );
  }

  return (
    (
      10 -
      (
        sum %
        10
      )
    ) %
      10 ===
    checkDigit
  );
}

function selectTargetCategory(
  categories: string[],
) {
  const specific =
    categories.filter(
      (category) =>
        !PARENT_CATEGORY_NAMES.has(
          category,
        ),
    );

  const targetCategory =
    specific[0] ??
    categories[0] ??
    "Diğer";

  const parentCategory =
    categories.find(
      (category) =>
        PARENT_CATEGORY_NAMES.has(
          category,
        ),
    ) ??
    null;

  return {
    targetCategory,

    parentCategory:
      parentCategory ===
      targetCategory
        ? null
        : parentCategory,
  };
}

function parseProductDetail(
  html: string,
  item: ProductListItem,
) {
  const raw =
    extractBalancedJsonObject(
      html,
      "var productDetailModel =",
    );

  if (!raw) {
    return null;
  }

  try {
    const model =
      JSON.parse(
        raw,
      ) as {
        productId?: number;

        productName?: string;

        productPriceKDVIncluded?:
          number;

        product?: {
          urunAdi?: string;

          stokKodu?: string;

          barkod?: string;

          stokAdedi?: number;

          kdvOrani?: number;

          aktif?: boolean;

          anaUrun?: boolean;

          spotResimBuyukYolu?: string;

          spotResimYolu?: string;
        };
      };

    const source =
      model.product;

    if (
      !source ||
      source.aktif ===
        false ||
      source.anaUrun ===
        false
    ) {
      return null;
    }

    const priceInclVat =
      typeof model
        .productPriceKDVIncluded ===
        "number"
        ? Number(
            model
              .productPriceKDVIncluded
              .toFixed(
                2,
              ),
          )
        : null;

    const stockAmount =
      typeof source
        .stokAdedi ===
        "number"
        ? Math.max(
            0,
            Math.floor(
              source
                .stokAdedi,
            ),
          )
        : null;

    if (
      priceInclVat ===
        null ||
      priceInclVat <=
        0 ||
      stockAmount ===
        null ||
      stockAmount <=
        0
    ) {
      return null;
    }

    const vatRate =
      typeof source
        .kdvOrani ===
        "number"
        ? Math.round(
            source
              .kdvOrani,
          )
        : 20;

    const categories =
      Array.from(
        item.categories,
      );

    const {
      targetCategory,
      parentCategory,
    } =
      selectTargetCategory(
        categories,
      );

    return {
      productId:
        model.productId ??
        item.productId,

      name:
        cleanText(
          model.productName ??
            source.urunAdi,
        ),

      brand:
        item.brand ??
        "Markasız",

      stockCode:
        cleanText(
          source.stokKodu,
        ) ||
        item.stockCode,

      sourceBarcode:
        cleanText(
          source.barkod,
        ) ||
        null,

      priceInclVat,

      priceExclVat:
        Number(
          (
            priceInclVat /
            (
              1 +
              vatRate /
                100
            )
          ).toFixed(
            4,
          ),
        ),

      etkenPrice:
        Number(
          (
            priceInclVat *
            PRICE_MULTIPLIER
          ).toFixed(
            2,
          ),
        ),

      vatRate,

      stockAmount,

      imageUrl:
        cleanText(
          source
            .spotResimBuyukYolu ??
            source
              .spotResimYolu,
        ) ||
        null,

      productUrl:
        item.url,

      categories,

      targetCategory,

      targetParentCategory:
        parentCategory,
    };
  } catch {
    return null;
  }
}

async function crawlProducts(): Promise<LiveProduct[]> {
  const categories =
    await discoverCategories();

  const map =
    new Map<
      number,
      ProductListItem
    >();

  for (
    const category
    of categories
  ) {
    const firstHtml =
      await fetchHtml(
        category.url,
      );

    const maxPage =
      getMaxPage(
        firstHtml,
      );

    for (
      let page = 1;
      page <=
      maxPage;
      page += 1
    ) {
      const pageUrl =
        page ===
        1
          ? category.url
          : `${category.url}?sayfa=${page}`;

      const html =
        page ===
        1
          ? firstHtml
          : await fetchHtml(
              pageUrl,
            );

      const found =
        extractProductLinks(
          html,
          pageUrl,
          category.name,
        );

      for (
        const item
        of found
      ) {
        const existing =
          map.get(
            item.productId,
          );

        if (
          existing
        ) {
          for (
            const categoryName
            of item.categories
          ) {
            existing.categories.add(
              categoryName,
            );
          }
        } else {
          map.set(
            item.productId,
            item,
          );
        }
      }

      await wait(
        REQUEST_DELAY_MS,
      );
    }
  }

  const raw:
    any[] =
    [];

  const items =
    Array.from(
      map.values(),
    );

  for (
    let index = 0;
    index <
    items.length;
    index +=
      1
  ) {
    try {
      const html =
        await fetchHtml(
          items[
            index
          ].url,
        );

      const product =
        parseProductDetail(
          html,
          items[
            index
          ],
        );

      if (
        product
      ) {
        raw.push(
          product,
        );
      }
    } catch {
      // Tek ürün hatası kataloğun tamamını durdurmaz.
    }

    if (
      (index + 1) %
        100 ===
      0
    ) {
      console.log(
        `Detay ${index + 1}/${items.length}`,
      );
    }

    await wait(
      REQUEST_DELAY_MS,
    );
  }

  raw.sort(
    (
      a,
      b,
    ) =>
      a.productId -
      b.productId,
  );

  const barcodeGroups =
    new Map<
      string,
      number
    >();

  for (
    const product
    of raw
  ) {
    if (
      isValidGtin(
        product.sourceBarcode,
      )
    ) {
      barcodeGroups.set(
        product.sourceBarcode,
        (
          barcodeGroups.get(
            product.sourceBarcode,
          ) ??
          0
        ) +
          1,
      );
    }
  }

  const products:
    LiveProduct[] =
    raw.map(
      (
        product,
        index,
      ) => {
        const etkenCode =
          `ETK-KRT-${String(
            NEW_SKU_START_NUMBER +
              index,
          ).padStart(
            4,
            "0",
          )}`;

        const useRealBarcode =
          isValidGtin(
            product.sourceBarcode,
          ) &&
          barcodeGroups.get(
            product.sourceBarcode,
          ) ===
            1;

        return {
          ...product,

          etkenCode,

          barcode:
            useRealBarcode
              ? product.sourceBarcode
              : `TMP-OFIS26-${product.productId}`,
        };
      },
    );

  return products;
}

async function ensureCategory(
  categoryName: string,
  parentName:
    | string
    | null,
): Promise<number> {
  const main =
    await prisma.category
      .findFirstOrThrow({
        where: {
          name:
            "Ofis Kırtasiye",

          parentId:
            null,
        },
      });

  let parentId =
    main.id;

  if (
    parentName
  ) {
    let parent =
      await prisma.category
        .findFirst({
          where: {
            name:
              parentName,
          },
        });

    if (!parent) {
      parent =
        await prisma.category
          .create({
            data: {
              name:
                parentName,

              slug:
                `ofis-kirtasiye-${slugify(
                  parentName,
                )}`,

              parentId:
                main.id,

              isActive:
                true,
            },
          });
    }

    parentId =
      parent.id;
  }

  let category =
    await prisma.category
      .findFirst({
        where: {
          name:
            categoryName,
        },
      });

  if (!category) {
    category =
      await prisma.category
        .create({
          data: {
            name:
              categoryName,

            slug:
              parentName
                ? `ofis-kirtasiye-${slugify(
                    parentName,
                  )}-${slugify(
                    categoryName,
                  )}`
                : `ofis-kirtasiye-${slugify(
                    categoryName,
                  )}`,

            parentId,

            isActive:
              true,
          },
        });
  }

  return category.id;
}

async function createMissingMapping(
  product: LiveProduct,
  databaseProductId: number,
  siteId: number,
) {
  const existing =
    await prisma.competitorProduct
      .findFirst({
        where: {
          competitorSiteId:
            siteId,

          productId:
            databaseProductId,
        },
      });

  if (
    existing
  ) {
    return false;
  }

  await prisma.competitorProduct
    .create({
      data: {
        productId:
          databaseProductId,

        competitorSiteId:
          siteId,

        competitorSku:
          String(
            product.productId,
          ),

        competitorName:
          product.name,

        productUrl:
          product.productUrl,

        vatRate:
          product.vatRate,

        isActive:
          true,

        lastPriceExclVat:
          product.priceExclVat,

        lastPriceInclVat:
          product.priceInclVat,

        lastCurrency:
          "TRY",

        lastStockStatus:
          CompetitorStockStatus.IN_STOCK,

        lastCheckedAt:
          new Date(),

        lastSuccessAt:
          new Date(),

        lastError:
          null,
      },
    });

  return true;
}

async function syncImage(
  product: LiveProduct,
  productId: number,
) {
  if (
    !product.imageUrl
  ) {
    return false;
  }

  const existing =
    await prisma.productImageSource
      .findFirst({
        where: {
          productId,

          sourceUrl:
            product.imageUrl,
        },
      });

  if (
    existing
  ) {
    return true;
  }

  try {
    const buffer =
      await downloadImage(
        product.imageUrl,
      );

    const storageUrl =
      await ProductImageStorageService
        .store(
          product.etkenCode,
          buffer,
        );

    await prisma.$transaction([
      prisma.productImageSource.create({
        data: {
          productId,

          sourceType:
            "SUPPLIER",

          sourceSite:
            OFIS26_SITE_CODE,

          sourcePageUrl:
            product.productUrl,

          sourceUrl:
            product.imageUrl,

          storageUrl,

          isPrimary:
            true,

          isVerified:
            true,

          verificationCount:
            1,

          sortOrder:
            0,
        },
      }),

      prisma.product.update({
        where: {
          id:
            productId,
        },

        data: {
          imageUrl:
            storageUrl,
        },
      }),
    ]);

    return true;
  } catch (
    error
  ) {
    console.error(
      `GÖRSEL HATA | ${product.etkenCode}`,
    );

    return false;
  }
}

async function main() {
  console.log(
    "\n==============================================",
  );

  console.log(
    " OFIS26 KATALOG RESUME",
  );

  console.log(
    "==============================================\n",
  );

  console.log(
    APPLY_MODE
      ? "MOD: UYGULAMA"
      : "MOD: SADECE ÖN İZLEME",
  );

  const products =
    await crawlProducts();

  if (
    products.length !==
    EXPECTED_PRODUCT_COUNT
  ) {
    throw new Error(
      `Canlı katalog ${products.length} ürün döndürdü. Beklenen ${EXPECTED_PRODUCT_COUNT}. Resume durduruldu.`,
    );
  }

  const site =
    await prisma.competitorSite
      .findFirstOrThrow({
        where: {
          code:
            OFIS26_SITE_CODE,

          isActive:
            true,
        },
      });

  const existing =
    await prisma.product.findMany({
      where: {
        code: {
          gte:
            "ETK-KRT-1000",

          lte:
            "ETK-KRT-1783",
        },
      },

      select: {
        id:
          true,

        code:
          true,
      },
    });

  const existingByCode =
    new Map(
      existing.map(
        (product) => [
          product.code,
          product,
        ],
      ),
    );

  const missing =
    products.filter(
      (product) =>
        !existingByCode.has(
          product.etkenCode,
        ),
    );

  console.log(
    "\n----------------------------------------------",
  );

  console.log(
    "RESUME PLANI",
  );

  console.log(
    "----------------------------------------------",
  );

  console.log(
    `Canlı katalog: ${products.length}`,
  );

  console.log(
    `Mevcut ürün: ${existing.length}`,
  );

  console.log(
    `Eksik ürün: ${missing.length}`,
  );

  console.log(
    `İlk eksik: ${missing[0]?.etkenCode ?? "-"}`,
  );

  console.log(
    `Son eksik: ${missing.at(-1)?.etkenCode ?? "-"}`,
  );

  let missingMappings =
    0;

  for (
    const product
    of products
  ) {
    const dbProduct =
      existingByCode.get(
        product.etkenCode,
      );

    if (
      !dbProduct
    ) {
      continue;
    }

    const mapping =
      await prisma.competitorProduct
        .findFirst({
          where: {
            productId:
              dbProduct.id,

            competitorSiteId:
              site.id,
          },

          select: {
            id:
              true,
          },
        });

    if (
      !mapping
    ) {
      missingMappings +=
        1;

      console.log(
        `EKSİK MAPPING | ${product.etkenCode} | ${product.name}`,
      );
    }
  }

  console.log(
    `Eksik mapping: ${missingMappings}`,
  );

  if (
    !APPLY_MODE
  ) {
    console.log(
      "\nÖN İZLEME TAMAMLANDI.",
    );

    console.log(
      "Henüz --apply çalıştırılmadı.",
    );

    return;
  }

  let mappingCreated =
    0;

  let productCreated =
    0;

  let imageSuccess =
    0;

  let imageFailed =
    0;

  /*
   * Önce mevcut ürünlerin eksik
   * mapping'lerini tamamla.
   */
  for (
    const product
    of products
  ) {
    const dbProduct =
      existingByCode.get(
        product.etkenCode,
      );

    if (
      !dbProduct
    ) {
      continue;
    }

    const created =
      await createMissingMapping(
        product,
        dbProduct.id,
        site.id,
      );

    if (
      created
    ) {
      mappingCreated +=
        1;
    }
  }

  /*
   * Sonra eksik ürünleri oluştur.
   */
  for (
    let index = 0;
    index <
    missing.length;
    index +=
      1
  ) {
    const product =
      missing[
        index
      ];

    const categoryId =
      await ensureCategory(
        product.targetCategory,
        product.targetParentCategory,
      );

    const created =
      await prisma.product
        .create({
          data: {
            code:
              product.etkenCode,

            barcode:
              product.barcode,

            name:
              product.name,

            brand:
              product.brand,

            category:
              product.targetCategory,

            categoryId,

            supplier:
              "Ofis26",

            imageUrl:
              product.imageUrl,

            price:
              product.etkenPrice,

            stock:
              product.stockAmount,

            reservedStock:
              0,

            vat:
              product.vatRate,

            ownStock:
              false,

            isActive:
              true,
          },
        });

    await createMissingMapping(
      product,
      created.id,
      site.id,
    );

    productCreated +=
      1;

    const imageOk =
      await syncImage(
        product,
        created.id,
      );

    if (
      imageOk
    ) {
      imageSuccess +=
        1;
    } else {
      imageFailed +=
        1;
    }

    if (
      (index + 1) %
        20 ===
      0
    ) {
      console.log(
        `Resume ürün: ${index + 1}/${missing.length}`,
      );
    }

    await wait(
      IMAGE_DELAY_MS,
    );
  }

  const finalProducts =
    await prisma.product
      .findMany({
        where: {
          code: {
            gte:
              "ETK-KRT-1000",

            lte:
              "ETK-KRT-1783",
          },
        },

        select: {
          id:
            true,

          code:
            true,

          stock:
            true,

          price:
            true,

          imageUrl:
            true,

          competitorProducts: {
            where: {
              competitorSiteId:
                site.id,
            },

            select: {
              id:
                true,
            },
          },
        },
      });

  console.log(
    "\n==============================================",
  );

  console.log(
    "RESUME SONUCU",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Yeni oluşturulan ürün: ${productCreated}`,
  );

  console.log(
    `Tamamlanan eski mapping: ${mappingCreated}`,
  );

  console.log(
    `Görsel başarılı: ${imageSuccess}`,
  );

  console.log(
    `Görsel hata: ${imageFailed}`,
  );

  console.log(
    `Toplam ürün: ${finalProducts.length}`,
  );

  console.log(
    `Toplam mapping: ${
      finalProducts.reduce(
        (
          total,
          product,
        ) =>
          total +
          product
            .competitorProducts
            .length,
        0,
      )
    }`,
  );

  console.log(
    `Stok > 0: ${
      finalProducts.filter(
        (product) =>
          product.stock >
          0,
      ).length
    }`,
  );

  console.log(
    `Fiyat > 0: ${
      finalProducts.filter(
        (product) =>
          product.price >
          0,
      ).length
    }`,
  );

  console.log(
    `Görselli: ${
      finalProducts.filter(
        (product) =>
          Boolean(
            product.imageUrl,
          ),
      ).length
    }`,
  );
}

main()
  .catch(
    (error) => {
      console.error(
        "\nResume başarısız:",
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