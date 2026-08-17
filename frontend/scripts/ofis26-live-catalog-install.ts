import {
  CompetitorStockStatus,
} from "@prisma/client";
import * as cheerio from "cheerio";

import { prisma } from "../lib/prisma";
import { ProductImageStorageService } from "../modules/products/images/product-image-storage.service";

const APPLY_MODE =
  process.argv.includes("--apply");

const BASE_URL =
  "https://www.ofis26.com";

const START_URL =
  "https://www.ofis26.com/";

const OFIS26_SITE_CODE =
  "OFIS26";

const MAIN_CATEGORY_NAME =
  "Ofis Kırtasiye";

const OLD_SKU_START =
  "ETK-KRT-0200";

const OLD_SKU_END =
  "ETK-KRT-0474";

const NEW_SKU_START_NUMBER =
  1000;

const PRICE_MULTIPLIER =
  1.20;

const REQUEST_TIMEOUT_MS =
  20_000;

const REQUEST_DELAY_MS =
  120;

const IMAGE_DELAY_MS =
  75;

const USER_AGENT =
  "Mozilla/5.0 (compatible; EtkenOfficeCatalogCrawler/1.0; +https://etkenofis.com)";

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

type Ofis26Product = {
  productId: number;
  variantId: number | null;

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

type CategoryPlan = {
  name: string;
  parentName: string | null;
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
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
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
    .replaceAll(
      "ı",
      "i",
    )
    .replaceAll(
      "ş",
      "s",
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
          method:
            "GET",

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
          method:
            "GET",

          headers: {
            "user-agent":
              USER_AGENT,

            accept:
              "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
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

    const contentType =
      response.headers
        .get(
          "content-type",
        )
        ?.toLowerCase() ??
      "";

    if (
      !contentType.startsWith(
        "image/",
      )
    ) {
      throw new Error(
        "Görsel URL image/* döndürmedi.",
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

function looksLikeUtilityUrl(
  value: string,
): boolean {
  const lower =
    value.toLocaleLowerCase(
      "tr-TR",
    );

  return (
    lower.includes(
      "/uyegiris",
    ) ||
    lower.includes(
      "/uyeol",
    ) ||
    lower.includes(
      "/sepet",
    ) ||
    lower.includes(
      "/iletisim",
    ) ||
    lower.includes(
      "/hakkimizda",
    ) ||
    lower.includes(
      "/arama",
    )
  );
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
          name.toLocaleLowerCase(
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

        if (
          !url ||
          looksLikeUtilityUrl(
            url,
          )
        ) {
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
  ).sort(
    (
      a,
      b,
    ) =>
      a.name.localeCompare(
        b.name,
        "tr",
      ),
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

      if (
        !href
      ) {
        return;
      }

      const match =
        href.match(
          /[?&]sayfa=(\d+)/i,
        );

      if (
        !match
      ) {
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

  const products =
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

      const variantIdRaw =
        detail.attr(
          "data-variant-id",
        );

      const variantId =
        variantIdRaw
          ? Number(
              variantIdRaw,
            )
          : null;

      let href =
        detail
          .find(
            `.productName.detailUrl[data-id="${productId}"] a[href]`,
          )
          .first()
          .attr(
            "href",
          );

      if (
        !href
      ) {
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

      if (
        !href
      ) {
        const item =
          detail.closest(
            ".productItem",
          );

        href =
          item
            .find(
              `a.detailUrl[data-id="${productId}"][href]`,
            )
            .first()
            .attr(
              "href",
            );
      }

      if (
        !href
      ) {
        return;
      }

      const url =
        normalizeUrl(
          href,
          pageUrl,
        );

      if (
        !url
      ) {
        return;
      }

      products.set(
        productId,
        {
          productId,

          variantId:
            variantId !==
              null &&
            Number.isInteger(
              variantId,
            )
              ? variantId
              : null,

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
    products.values(),
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
      markerIndex +
        marker.length,
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
      depth +=
        1;

      continue;
    }

    if (
      char ===
      "}"
    ) {
      depth -=
        1;

      if (
        depth ===
        0
      ) {
        return html.slice(
          start,
          index +
            1,
        );
      }
    }
  }

  return null;
}

function isValidGtin(
  value:
    | string
    | null
    | undefined,
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

  /*
   * GTIN checksum:
   * sağdan başlayarak 3 / 1.
   */
  for (
    let index =
      digits.length -
      1,
      position =
        1;
    index >=
    0;
    index -=
      1,
      position +=
        1
  ) {
    sum +=
      digits[
        index
      ] *
      (
        position %
          2 ===
        1
          ? 3
          : 1
      );
  }

  const expected =
    (
      10 -
      (
        sum %
        10
      )
    ) %
    10;

  return (
    expected ===
    checkDigit
  );
}

function selectTargetCategory(
  categories: string[],
): {
  targetCategory: string;
  parentCategory: string | null;
} {
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
      targetCategory ===
      parentCategory
        ? null
        : parentCategory,
  };
}

function calculatePriceExclVat(
  priceInclVat: number,
  vatRate: number,
): number {
  return Number(
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
  );
}

function parseProductDetail(
  html: string,
  item: ProductListItem,
): Omit<
  Ofis26Product,
  "barcode" |
  "etkenCode"
> | null {
  const raw =
    extractBalancedJsonObject(
      html,
      "var productDetailModel =",
    );

  if (
    !raw
  ) {
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
          id?: number;

          urunAdi?: string;

          stokKodu?: string;

          barkod?: string;

          stokAdedi?: number;

          kdvOrani?: number;

          aktif?: boolean;

          anaUrun?: boolean;

          spotResimBuyukYolu?: string;

          spotResimYolu?: string;

          spotResimThumbYolu?: string;
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

    const name =
      cleanText(
        model.productName ??
          source.urunAdi,
      );

    if (
      !name
    ) {
      return null;
    }

    const priceInclVat =
      typeof model
        .productPriceKDVIncluded ===
        "number" &&
      Number.isFinite(
        model
          .productPriceKDVIncluded,
      )
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
        "number" &&
      Number.isFinite(
        source
          .stokAdedi,
      )
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
        "number" &&
      Number.isFinite(
        source.kdvOrani,
      )
        ? Math.round(
            source.kdvOrani,
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

      variantId:
        typeof source
          .id ===
          "number"
          ? source.id
          : item.variantId,

      name,

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
        calculatePriceExclVat(
          priceInclVat,
          vatRate,
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
              .spotResimYolu ??
            source
              .spotResimThumbYolu,
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

async function crawlLiveCatalog() {
  const categories =
    await discoverCategories();

  console.log(
    `Kategori bağlantısı: ${categories.length}`,
  );

  const productMap =
    new Map<
      number,
      ProductListItem
    >();

  let categoryHttpErrors =
    0;

  for (
    let categoryIndex =
      0;
    categoryIndex <
    categories.length;
    categoryIndex +=
      1
  ) {
    const category =
      categories[
        categoryIndex
      ];

    try {
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
        page +=
          1
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
            productMap.get(
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
            productMap.set(
              item.productId,
              item,
            );
          }
        }

        await wait(
          REQUEST_DELAY_MS,
        );
      }

      console.log(
        `${categoryIndex + 1}/${categories.length} | ${category.name} | tekil=${productMap.size}`,
      );
    } catch (
      error
    ) {
      categoryHttpErrors +=
        1;

      console.log(
        `KATEGORİ HATA | ${category.name} | ${
          error instanceof
          Error
            ? error.message
            : "Bilinmeyen hata"
        }`,
      );
    }
  }

  const discovered =
    Array.from(
      productMap.values(),
    );

  console.log(
    `Tekil Ofis26 productId: ${discovered.length}`,
  );

  const rawProducts:
    Omit<
      Ofis26Product,
      "barcode" |
      "etkenCode"
    >[] =
    [];

  let productHttpErrors =
    0;

  let parseOrFiltered =
    0;

  for (
    let index = 0;
    index <
    discovered.length;
    index +=
      1
  ) {
    const item =
      discovered[
        index
      ];

    try {
      const html =
        await fetchHtml(
          item.url,
        );

      const product =
        parseProductDetail(
          html,
          item,
        );

      if (
        product
      ) {
        rawProducts.push(
          product,
        );
      } else {
        parseOrFiltered +=
          1;
      }
    } catch (
      error
    ) {
      productHttpErrors +=
        1;

      console.log(
        `ÜRÜN HTTP HATA | ${item.productId} | ${item.url}`,
      );
    }

    if (
      (index + 1) %
        100 ===
      0
    ) {
      console.log(
        `Detay ${index + 1}/${discovered.length}`,
      );
    }

    await wait(
      REQUEST_DELAY_MS,
    );
  }

  /*
   * Önce geçerli GTIN adaylarını
   * sayıyoruz.
   */
  const validBarcodeGroups =
    new Map<
      string,
      number[]
    >();

  for (
    const product
    of rawProducts
  ) {
    if (
      !isValidGtin(
        product.sourceBarcode,
      )
    ) {
      continue;
    }

    const barcode =
      product.sourceBarcode!;

    const list =
      validBarcodeGroups.get(
        barcode,
      ) ??
      [];

    list.push(
      product.productId,
    );

    validBarcodeGroups.set(
      barcode,
      list,
    );
  }

  const duplicatedBarcodes =
    new Set(
      Array.from(
        validBarcodeGroups.entries(),
      )
        .filter(
          (
            [
              _,
              productIds,
            ],
          ) =>
            productIds.length >
            1,
        )
        .map(
          (
            [
              barcode,
            ],
          ) =>
            barcode,
        ),
    );

  const products:
    Ofis26Product[] =
    rawProducts
      .sort(
        (
          a,
          b,
        ) =>
          a.productId -
          b.productId,
      )
      .map(
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
            Boolean(
              product.sourceBarcode,
            ) &&
            isValidGtin(
              product.sourceBarcode,
            ) &&
            !duplicatedBarcodes.has(
              product.sourceBarcode!,
            );

          const barcode =
            useRealBarcode
              ? product.sourceBarcode!
              : `TMP-OFIS26-${product.productId}`;

          return {
            ...product,

            etkenCode,

            barcode,
          };
        },
      );

  return {
    categories,
    products,

    categoryHttpErrors,
    productHttpErrors,
    parseOrFiltered,

    duplicatedBarcodes,
  };
}

function buildCategoryPlans(
  products: Ofis26Product[],
): CategoryPlan[] {
  const plans =
    new Map<
      string,
      CategoryPlan
    >();

  for (
    const parent
    of PARENT_CATEGORY_NAMES
  ) {
    plans.set(
      parent,
      {
        name:
          parent,

        parentName:
          null,
      },
    );
  }

  for (
    const product
    of products
  ) {
    const category =
      product.targetCategory;

    if (
      PARENT_CATEGORY_NAMES.has(
        category,
      )
    ) {
      plans.set(
        category,
        {
          name:
            category,

          parentName:
            null,
        },
      );

      continue;
    }

    plans.set(
      category,
      {
        name:
          category,

        parentName:
          product.targetParentCategory,
      },
    );
  }

  return Array.from(
    plans.values(),
  ).sort(
    (
      a,
      b,
    ) => {
      if (
        a.parentName ===
          null &&
        b.parentName !==
          null
      ) {
        return -1;
      }

      if (
        a.parentName !==
          null &&
        b.parentName ===
          null
      ) {
        return 1;
      }

      return a.name.localeCompare(
        b.name,
        "tr",
      );
    },
  );
}

async function ensureCategoryTree(
  plans: CategoryPlan[],
) {
  const mainCategory =
    await prisma.category
      .findFirst({
        where: {
          name:
            MAIN_CATEGORY_NAME,

          parentId:
            null,
        },
      });

  if (
    !mainCategory
  ) {
    throw new Error(
      "Ana 'Ofis Kırtasiye' kategorisi bulunamadı.",
    );
  }

  const categoryIds =
    new Map<
      string,
      number
    >();

  /*
   * Önce parent gruplar.
   */
  for (
    const plan
    of plans.filter(
      (item) =>
        item.parentName ===
        null,
    )
  ) {
    let category =
      await prisma.category
        .findFirst({
          where: {
            name:
              plan.name,
          },
        });

    const slug =
      `ofis-kirtasiye-${slugify(
        plan.name,
      )}`;

    if (
      category
    ) {
      category =
        await prisma.category
          .update({
            where: {
              id:
                category.id,
            },

            data: {
              parentId:
                mainCategory.id,

              isActive:
                true,
            },
          });
    } else {
      category =
        await prisma.category
          .create({
            data: {
              name:
                plan.name,

              slug,

              parentId:
                mainCategory.id,

              isActive:
                true,
            },
          });
    }

    categoryIds.set(
      plan.name,
      category.id,
    );
  }

  /*
   * Sonra leaf kategoriler.
   */
  for (
    const plan
    of plans.filter(
      (item) =>
        item.parentName !==
        null,
    )
  ) {
    const parentId =
      plan.parentName
        ? categoryIds.get(
            plan.parentName,
          )
        : mainCategory.id;

    if (
      !parentId
    ) {
      throw new Error(
        `Parent kategori bulunamadı: ${plan.name} -> ${plan.parentName}`,
      );
    }

    let category =
      await prisma.category
        .findFirst({
          where: {
            name:
              plan.name,
          },
        });

    const slug =
      `ofis-kirtasiye-${slugify(
        plan.parentName ??
          "",
      )}-${slugify(
        plan.name,
      )}`;

    if (
      category
    ) {
      category =
        await prisma.category
          .update({
            where: {
              id:
                category.id,
            },

            data: {
              parentId,

              isActive:
                true,
            },
          });
    } else {
      category =
        await prisma.category
          .create({
            data: {
              name:
                plan.name,

              slug,

              parentId,

              isActive:
                true,
            },
          });
    }

    categoryIds.set(
      plan.name,
      category.id,
    );
  }

  /*
   * Eğer ürün direkt Ofis Kırtasiye
   * altında kalacaksa burada ana ID'yi
   * de referans olarak tutabiliriz.
   */
  categoryIds.set(
    MAIN_CATEGORY_NAME,
    mainCategory.id,
  );

  return {
    mainCategory,

    categoryIds,
  };
}

async function cleanupOldCatalog(
  oldProductIds: number[],
) {
  if (
    oldProductIds.length ===
    0
  ) {
    return;
  }

  /*
   * Explicit temizlik.
   * Product ilişkilerinin çoğu zaten
   * cascade olsa da kontrollü gidiyoruz.
   */
  await prisma.productImageSource.deleteMany({
    where: {
      productId: {
        in:
          oldProductIds,
      },
    },
  });

  await prisma.productBarcode.deleteMany({
    where: {
      productId: {
        in:
          oldProductIds,
      },
    },
  });

  await prisma.competitorProduct.deleteMany({
    where: {
      productId: {
        in:
          oldProductIds,
      },
    },
  });

  await prisma.product.deleteMany({
    where: {
      id: {
        in:
          oldProductIds,
      },
    },
  });
}

async function installProducts(
  products: Ofis26Product[],
  categoryIds: Map<
    string,
    number
  >,
) {
  const site =
    await prisma.competitorSite
      .findFirst({
        where: {
          code:
            OFIS26_SITE_CODE,

          isActive:
            true,
        },
      });

  if (
    !site
  ) {
    throw new Error(
      "OFIS26 CompetitorSite bulunamadı.",
    );
  }

  const now =
    new Date();

  let created =
    0;

  for (
    const product
    of products
  ) {
    const categoryId =
      categoryIds.get(
        product.targetCategory,
      );

    if (
      !categoryId
    ) {
      throw new Error(
        `Kategori ID bulunamadı: ${product.targetCategory}`,
      );
    }

    const createdProduct =
      await prisma.product.create({
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

          /*
           * Görsel birazdan kendi
           * storage'ımıza kopyalanacak.
           * O zamana kadar kaynak URL.
           */
          imageUrl:
            product.imageUrl,

          price:
            product.etkenPrice,

          /*
           * Ofis26'nin verdiği canlı
           * stok sinyalini aynen tutuyoruz.
           */
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

    await prisma.competitorProduct.create({
      data: {
        productId:
          createdProduct.id,

        competitorSiteId:
          site.id,

        /*
         * Asıl tedarikçi kimliği:
         * Ofis26 productId.
         */
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
          now,

        lastSuccessAt:
          now,

        lastError:
          null,
      },
    });

    created +=
      1;

    if (
      created %
        100 ===
      0
    ) {
      console.log(
        `DB ürün oluşturma: ${created}/${products.length}`,
      );
    }
  }

  return created;
}

async function syncImages(
  products: Ofis26Product[],
) {
  let success =
    0;

  let failed =
    0;

  for (
    let index =
      0;
    index <
    products.length;
    index +=
      1
  ) {
    const source =
      products[
        index
      ];

    if (
      !source.imageUrl
    ) {
      failed +=
        1;

      continue;
    }

    try {
      const product =
        await prisma.product
          .findUniqueOrThrow({
            where: {
              code:
                source.etkenCode,
            },

            select: {
              id:
                true,

              code:
                true,
            },
          });

      const imageBuffer =
        await downloadImage(
          source.imageUrl,
        );

      const storageUrl =
        await ProductImageStorageService
          .store(
            product.code,
            imageBuffer,
          );

      await prisma.$transaction([
        prisma.productImageSource.create({
          data: {
            productId:
              product.id,

            sourceType:
              "SUPPLIER",

            sourceSite:
              OFIS26_SITE_CODE,

            sourcePageUrl:
              source.productUrl,

            sourceUrl:
              source.imageUrl,

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
              product.id,
          },

          data: {
            imageUrl:
              storageUrl,
          },
        }),
      ]);

      success +=
        1;
    } catch (
      error
    ) {
      failed +=
        1;

      console.error(
        `GÖRSEL HATA | ${source.etkenCode} | ${source.productId} | ${
          error instanceof
          Error
            ? error.message
            : "Bilinmeyen hata"
        }`,
      );
    }

    if (
      (index + 1) %
        50 ===
      0
    ) {
      console.log(
        `Görsel: ${index + 1}/${products.length} | başarılı=${success} | hata=${failed}`,
      );
    }

    await wait(
      IMAGE_DELAY_MS,
    );
  }

  return {
    success,
    failed,
  };
}

async function main() {
  console.log(
    "\n==============================================",
  );

  console.log(
    " OFIS26 CANLI KATALOG KURULUMU",
  );

  console.log(
    "==============================================\n",
  );

  console.log(
    APPLY_MODE
      ? "MOD: UYGULAMA"
      : "MOD: SADECE ÖN İZLEME",
  );

  /*
   * Eski katalog güvenlik kontrolü.
   */
  const oldProducts =
    await prisma.product.findMany({
      where: {
        code: {
          gte:
            OLD_SKU_START,

          lte:
            OLD_SKU_END,
        },
      },

      select: {
        id:
          true,

        code:
          true,

        _count: {
          select: {
            orderItems:
              true,

            stockMovements:
              true,

            purchaseOrderItems:
              true,
          },
        },
      },

      orderBy: {
        code:
          "asc",
      },
    });

  const protectedOld =
    oldProducts.filter(
      (product) =>
        product._count
          .orderItems >
          0 ||
        product._count
          .stockMovements >
          0 ||
        product._count
          .purchaseOrderItems >
          0,
    );

  console.log(
    `Eski katalog: ${oldProducts.length}`,
  );

  console.log(
    `Geçmişli eski ürün: ${protectedOld.length}`,
  );

  if (
    protectedOld.length >
    0
  ) {
    throw new Error(
      "Eski katalogda işlem geçmişi oluşmuş. Fiziksel silme durduruldu.",
    );
  }

  /*
   * Yeni SKU aralığı boş mu?
   */
  const existingNewSkuProducts =
    await prisma.product.count({
      where: {
        code: {
          gte:
            "ETK-KRT-1000",

          lte:
            "ETK-KRT-1999",
        },
      },
    });

  if (
    existingNewSkuProducts >
    0
  ) {
    throw new Error(
      `ETK-KRT-1000..1999 aralığında ${existingNewSkuProducts} mevcut ürün var. Kurulum durduruldu.`,
    );
  }

  console.log(
    "\nOfis26 canlı katalog yeniden taranıyor...\n",
  );

  const crawl =
    await crawlLiveCatalog();

  const products =
    crawl.products;

  /*
   * Güvenlik eşikleri.
   */
  if (
    products.length <
    700
  ) {
    throw new Error(
      `Canlı stoklu ürün sayısı beklenenden düşük: ${products.length}. Kurulum durduruldu.`,
    );
  }

  if (
    crawl.categoryHttpErrors >
      2 ||
    crawl.productHttpErrors >
      5
  ) {
    throw new Error(
      "Ofis26 taramasında beklenenden fazla HTTP hatası oluştu. Kurulum durduruldu.",
    );
  }

  const urlCount =
    new Set(
      products.map(
        (product) =>
          product.productUrl,
      ),
    ).size;

  const sourceIdCount =
    new Set(
      products.map(
        (product) =>
          product.productId,
      ),
    ).size;

  if (
    urlCount !==
      products.length ||
    sourceIdCount !==
      products.length
  ) {
    throw new Error(
      "Canlı katalogda productId veya URL çakışması var. Kurulum durduruldu.",
    );
  }

  const categoryPlans =
    buildCategoryPlans(
      products,
    );

  const realBarcodeCount =
    products.filter(
      (product) =>
        !product.barcode.startsWith(
          "TMP-OFIS26-",
        ),
    ).length;

  const tempBarcodeCount =
    products.length -
    realBarcodeCount;

  console.log(
    "\n==============================================",
  );

  console.log(
    "SON KURULUM PLANI",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Eski silinecek ürün: ${oldProducts.length}`,
  );

  console.log(
    `Yeni kurulacak ürün: ${products.length}`,
  );

  console.log(
    `Kategori planı: ${categoryPlans.length}`,
  );

  console.log(
    `Gerçek GTIN barkod: ${realBarcodeCount}`,
  );

  console.log(
    `Geçici barkod: ${tempBarcodeCount}`,
  );

  console.log(
    `Tekil Ofis26 productId: ${sourceIdCount}`,
  );

  console.log(
    `Tekil Ofis26 URL: ${urlCount}`,
  );

  console.log(
    `SKU: ${products[0]?.etkenCode} -> ${products.at(-1)?.etkenCode}`,
  );

  console.log(
    `Kategori HTTP hata: ${crawl.categoryHttpErrors}`,
  );

  console.log(
    `Ürün HTTP hata: ${crawl.productHttpErrors}`,
  );

  console.log(
    `Stok/fiyat dışı veya parse dışı: ${crawl.parseOrFiltered}`,
  );

  if (
    !APPLY_MODE
  ) {
    console.log(
      "\n==============================================",
    );

    console.log(
      "ÖN İZLEME TAMAMLANDI.",
    );

    console.log(
      "Veritabanında hiçbir değişiklik yapılmadı.",
    );

    console.log(
      "Sonuç doğruysa --apply kullanılabilir.",
    );

    console.log(
      "==============================================\n",
    );

    return;
  }

  /*
   * APPLY
   */
  console.log(
    "\n----------------------------------------------",
  );

  console.log(
    "1. ESKİ KATALOG TEMİZLENİYOR",
  );

  console.log(
    "----------------------------------------------",
  );

  await cleanupOldCatalog(
    oldProducts.map(
      (product) =>
        product.id,
    ),
  );

  console.log(
    `Silinen eski ürün: ${oldProducts.length}`,
  );

  console.log(
    "\n----------------------------------------------",
  );

  console.log(
    "2. KATEGORİ AĞACI HAZIRLANIYOR",
  );

  console.log(
    "----------------------------------------------",
  );

  const {
    categoryIds,
  } =
    await ensureCategoryTree(
      categoryPlans,
    );

  console.log(
    `Kategori hazır: ${categoryIds.size}`,
  );

  console.log(
    "\n----------------------------------------------",
  );

  console.log(
    "3. ÜRÜNLER VE OFIS26 MAPPING'LERİ OLUŞTURULUYOR",
  );

  console.log(
    "----------------------------------------------",
  );

  const created =
    await installProducts(
      products,
      categoryIds,
    );

  console.log(
    `Oluşturulan ürün: ${created}`,
  );

  console.log(
    "\n----------------------------------------------",
  );

  console.log(
    "4. GÖRSELLER ETKEN STORAGE'A KOPYALANIYOR",
  );

  console.log(
    "----------------------------------------------",
  );

  const imageResult =
    await syncImages(
      products,
    );

  /*
   * Son DB doğrulaması.
   */
  const installedProducts =
    await prisma.product.findMany({
      where: {
        code: {
          gte:
            products[0]
              .etkenCode,

          lte:
            products.at(
              -1,
            )!
              .etkenCode,
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
            competitorSite: {
              code:
                OFIS26_SITE_CODE,
            },
          },

          select: {
            competitorSku:
              true,

            productUrl:
              true,
          },
        },
      },
    });

  const mappingCount =
    installedProducts.reduce(
      (
        total,
        product,
      ) =>
        total +
        product
          .competitorProducts
          .length,
      0,
    );

  const withStoredImage =
    installedProducts.filter(
      (product) =>
        Boolean(
          product.imageUrl,
        ),
    ).length;

  console.log(
    "\n==============================================",
  );

  console.log(
    "KURULUM SONUCU",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Ürün: ${installedProducts.length}`,
  );

  console.log(
    `Ofis26 mapping: ${mappingCount}`,
  );

  console.log(
    `Görsel başarılı: ${imageResult.success}`,
  );

  console.log(
    `Görsel hata: ${imageResult.failed}`,
  );

  console.log(
    `imageUrl dolu: ${withStoredImage}`,
  );

  console.log(
    `Stok > 0: ${
      installedProducts.filter(
        (product) =>
          product.stock >
          0,
      ).length
    }`,
  );

  console.log(
    `Fiyat > 0: ${
      installedProducts.filter(
        (product) =>
          product.price >
          0,
      ).length
    }`,
  );

  console.log(
    "\n==============================================",
  );

  console.log(
    "OFIS26 CANLI KATALOG KURULUMU TAMAMLANDI.",
  );

  console.log(
    "==============================================\n",
  );
}

main()
  .catch(
    (error) => {
      console.error(
        "\nOfis26 canlı katalog kurulumu başarısız:",
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