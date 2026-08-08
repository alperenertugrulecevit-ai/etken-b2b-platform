import * as cheerio from "cheerio";

import type {
  ProductEnrichmentBarcodeCandidate,
  ProductEnrichmentImageCandidate,
  ProductEnrichmentResult,
} from "./product-enrichment.types";

const REQUEST_TIMEOUT_MS = 20_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; EtkenOfficeProductEnrichment/1.0; +https://etkenofis.com)";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBarcode(
  value: string,
): string | null {
  const digits = value.replace(/\D+/g, "");

  if (![8, 12, 13, 14].includes(digits.length)) {
    return null;
  }

  return digits;
}

function detectBarcodeType(
  barcode: string,
): ProductEnrichmentBarcodeCandidate["type"] {
  switch (barcode.length) {
    case 8:
      return "EAN8";

    case 12:
      return "UPC";

    case 13:
      return "EAN13";

    case 14:
      return "GTIN";

    default:
      return "OTHER";
  }
}

function addBarcode(
  target: Map<
    string,
    ProductEnrichmentBarcodeCandidate
  >,
  rawValue: unknown,
  source: ProductEnrichmentBarcodeCandidate["source"],
): void {
  if (
    typeof rawValue !== "string" &&
    typeof rawValue !== "number"
  ) {
    return;
  }

  const normalized = normalizeBarcode(
    String(rawValue),
  );

  if (!normalized) {
    return;
  }

  if (!target.has(normalized)) {
    target.set(normalized, {
      value: normalized,
      type: detectBarcodeType(normalized),
      source,
    });
  }
}

function normalizeImageUrl(
  rawValue: string,
  pageUrl: URL,
): string | null {
  try {
    const url = new URL(
      rawValue.trim(),
      pageUrl,
    );

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function addImage(
  target: Map<
    string,
    ProductEnrichmentImageCandidate
  >,
  rawValue: unknown,
  pageUrl: URL,
  source: ProductEnrichmentImageCandidate["source"],
  isPrimary: boolean,
): void {
  if (typeof rawValue !== "string") {
    return;
  }

  const normalized = normalizeImageUrl(
    rawValue,
    pageUrl,
  );

  if (!normalized) {
    return;
  }

  const lowerUrl =
    normalized.toLocaleLowerCase("en-US");

  /*
   * Genel HTML taramasından logo, ikon,
   * kategori bannerı vb. gelmesini engeller.
   */
  if (
    source === "html" &&
    (
      lowerUrl.endsWith(".svg") ||
      lowerUrl.includes("/icons/") ||
      lowerUrl.includes("logo") ||
      lowerUrl.includes("banner") ||
      lowerUrl.includes("/category/") ||
      lowerUrl.includes("/kategori/")
    )
  ) {
    return;
  }

  const existing = target.get(normalized);

  if (!existing) {
    target.set(normalized, {
      url: normalized,
      source,
      isPrimary,
    });

    return;
  }

  if (
    isPrimary &&
    !existing.isPrimary
  ) {
    target.set(normalized, {
      ...existing,
      isPrimary: true,
    });
  }
}

function parsePrice(
  rawValue: unknown,
): number | null {
  if (
    typeof rawValue === "number" &&
    Number.isFinite(rawValue)
  ) {
    return rawValue;
  }

  if (typeof rawValue !== "string") {
    return null;
  }

  const normalized = rawValue
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!normalized) {
    return null;
  }

  let numericText = normalized;

  if (
    numericText.includes(",") &&
    numericText.includes(".")
  ) {
    if (
      numericText.lastIndexOf(",") >
      numericText.lastIndexOf(".")
    ) {
      numericText = numericText
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      numericText =
        numericText.replace(/,/g, "");
    }
  } else if (numericText.includes(",")) {
    numericText =
      numericText.replace(",", ".");
  }

  const parsed = Number(numericText);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function detectStockStatus(
  value: unknown,
): ProductEnrichmentResult["stockStatus"] {
  if (typeof value !== "string") {
    return "UNKNOWN";
  }

  const normalized =
    value.toLocaleLowerCase("tr-TR");

  if (
    normalized.includes("outofstock") ||
    normalized.includes("out_of_stock") ||
    normalized.includes("stokta yok") ||
    normalized.includes("tükendi")
  ) {
    return "OUT_OF_STOCK";
  }

  if (
    normalized.includes("preorder") ||
    normalized.includes("ön sipariş")
  ) {
    return "PREORDER";
  }

  if (
    normalized.includes("instock") ||
    normalized.includes("in_stock") ||
    normalized.includes("stokta") ||
    normalized.includes("mevcut")
  ) {
    return "IN_STOCK";
  }

  return "UNKNOWN";
}

function readJsonLdValues(
  node: unknown,
  visitor: (
    value: Record<string, unknown>,
  ) => void,
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      readJsonLdValues(item, visitor);
    }

    return;
  }

  if (
    !node ||
    typeof node !== "object"
  ) {
    return;
  }

  const record =
    node as Record<string, unknown>;

  visitor(record);

  const graph = record["@graph"];

  if (graph) {
    readJsonLdValues(graph, visitor);
  }
}

function extractAvansasDetails(
  $: cheerio.CheerioAPI,
  pageUrl: URL,
  barcodes: Map<
    string,
    ProductEnrichmentBarcodeCandidate
  >,
  images: Map<
    string,
    ProductEnrichmentImageCandidate
  >,
): {
  sku: string | null;
  stockStatus:
    ProductEnrichmentResult["stockStatus"];
} {
  let sku: string | null = null;

  let stockStatus:
    ProductEnrichmentResult["stockStatus"] =
      "UNKNOWN";

  /*
   * Avansas ürün bilgi alanı:
   *
   * <dt>Ürün Kodu :</dt>
   * <dd>60952</dd>
   *
   * <dt>Ürün Barkodu :</dt>
   * <dd>8690105001952</dd>
   */
  $("dt").each((_, element) => {
    const label = cleanText(
      $(element).text(),
    );

    const value = cleanText(
      $(element)
        .next("dd")
        .text(),
    );

    if (!value) {
      return;
    }

    if (
      /^ürün\s+barkodu\s*:?$/iu.test(
        label,
      )
    ) {
      addBarcode(
        barcodes,
        value,
        "html",
      );

      return;
    }

    if (
      /^ürün\s+kodu\s*:?$/iu.test(
        label,
      )
    ) {
      sku = value;
    }
  });

  /*
   * Avansas product-meta bloğu.
   */
  $("script.product-meta").each(
    (_, element) => {
      const rawJson =
        $(element).text().trim();

      if (!rawJson) {
        return;
      }

      try {
        const data =
          JSON.parse(rawJson) as Record<
            string,
            unknown
          >;

        if (
          !sku &&
          (
            typeof data.item_id ===
              "string" ||
            typeof data.item_id ===
              "number"
          )
        ) {
          sku = cleanText(
            String(data.item_id),
          );
        }

        if (
          stockStatus === "UNKNOWN"
        ) {
          stockStatus =
            detectStockStatus(
              data.stock_status,
            );
        }

        if (
          typeof data.item_image_url ===
          "string"
        ) {
          addImage(
            images,
            data.item_image_url,
            pageUrl,
            "html",
            true,
          );
        }
      } catch {
        // Geçersiz product-meta bloğunu atla.
      }
    },
  );

  /*
   * Avansas yüksek çözünürlüklü
   * ürün görsellerini window.productMediaList
   * içinde zoomImage olarak yayınlıyor.
   */
  const html = $.html();

  const zoomImagePattern =
    /zoomImage\s*:\s*["']([^"']+)["']/giu;

  let imageIndex = 0;

  for (
    const match of
    html.matchAll(zoomImagePattern)
  ) {
    const imageUrl = match[1];

    if (!imageUrl) {
      continue;
    }

    addImage(
      images,
      imageUrl,
      pageUrl,
      "html",
      imageIndex === 0,
    );

    imageIndex += 1;
  }

  /*
   * initialProductDetailPageData içindeki
   * stok durumunu da yedek kaynak olarak oku.
   */
  if (stockStatus === "UNKNOWN") {
    const stockMatch =
      html.match(
        /stockLevelStatus\s*:\s*["']([^"']+)["']/iu,
      );

    if (stockMatch?.[1]) {
      stockStatus =
        detectStockStatus(
          stockMatch[1],
        );
    }
  }

  return {
    sku,
    stockStatus,
  };
}

export class ProductEnrichmentService {
  static async enrichFromUrl(
    rawUrl: string,
  ): Promise<ProductEnrichmentResult> {
    const pageUrl = new URL(rawUrl);

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(
        pageUrl,
        {
          method: "GET",

          headers: {
            "user-agent":
              USER_AGENT,

            accept:
              "text/html,application/xhtml+xml",

            "accept-language":
              "tr-TR,tr;q=0.9,en;q=0.7",
          },

          redirect: "follow",

          cache: "no-store",

          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return {
          success: false,

          message:
            `Ürün sayfası HTTP ${response.status} yanıtı verdi.`,

          sourceUrl:
            pageUrl.toString(),

          productName: null,
          sku: null,
          mpn: null,

          priceInclVat: null,
          currency: null,

          stockStatus:
            "UNKNOWN",

          barcodes: [],
          images: [],

          rawPriceText: null,
        };
      }

      const html =
        await response.text();

      const $ = cheerio.load(html);

      const barcodes =
        new Map<
          string,
          ProductEnrichmentBarcodeCandidate
        >();

      const images =
        new Map<
          string,
          ProductEnrichmentImageCandidate
        >();

      let productName:
        | string
        | null = null;

      let sku:
        | string
        | null = null;

      let mpn:
        | string
        | null = null;

      let priceInclVat:
        | number
        | null = null;

      let rawPriceText:
        | string
        | null = null;

      let currency:
        | string
        | null = null;

      let stockStatus:
        ProductEnrichmentResult["stockStatus"] =
          "UNKNOWN";

      /*
       * 1. JSON-LD
       */
      $(
        'script[type="application/ld+json"]',
      ).each((_, element) => {
        const rawJson =
          $(element).text();

        if (!rawJson.trim()) {
          return;
        }

        try {
          const parsed =
            JSON.parse(rawJson);

          readJsonLdValues(
            parsed,
            (record) => {
              const typeValue =
                record["@type"];

              const typeText =
                Array.isArray(typeValue)
                  ? typeValue.join(" ")
                  : String(
                      typeValue ?? "",
                    );

              if (
                !typeText
                  .toLocaleLowerCase(
                    "en-US",
                  )
                  .includes("product")
              ) {
                return;
              }

              if (
                !productName &&
                typeof record.name ===
                  "string"
              ) {
                productName =
                  cleanText(record.name);
              }

              if (
                !sku &&
                (
                  typeof record.sku ===
                    "string" ||
                  typeof record.sku ===
                    "number"
                )
              ) {
                sku = cleanText(
                  String(record.sku),
                );
              }

              if (
                !mpn &&
                (
                  typeof record.mpn ===
                    "string" ||
                  typeof record.mpn ===
                    "number"
                )
              ) {
                mpn = cleanText(
                  String(record.mpn),
                );
              }

              addBarcode(
                barcodes,
                record.gtin,
                "json-ld",
              );

              addBarcode(
                barcodes,
                record.gtin8,
                "json-ld",
              );

              addBarcode(
                barcodes,
                record.gtin12,
                "json-ld",
              );

              addBarcode(
                barcodes,
                record.gtin13,
                "json-ld",
              );

              addBarcode(
                barcodes,
                record.gtin14,
                "json-ld",
              );

              const imageValue =
                record.image;

              if (
                typeof imageValue ===
                "string"
              ) {
                addImage(
                  images,
                  imageValue,
                  pageUrl,
                  "json-ld",
                  true,
                );
              } else if (
                Array.isArray(imageValue)
              ) {
                imageValue.forEach(
                  (image, index) => {
                    addImage(
                      images,
                      image,
                      pageUrl,
                      "json-ld",
                      index === 0,
                    );
                  },
                );
              }

              const offers =
                record.offers;

              const offerList =
                Array.isArray(offers)
                  ? offers
                  : offers
                    ? [offers]
                    : [];

              for (
                const offer of
                offerList
              ) {
                if (
                  !offer ||
                  typeof offer !==
                    "object"
                ) {
                  continue;
                }

                const offerRecord =
                  offer as Record<
                    string,
                    unknown
                  >;

                if (
                  priceInclVat === null
                ) {
                  priceInclVat =
                    parsePrice(
                      offerRecord.price,
                    );

                  if (
                    offerRecord.price !==
                    undefined
                  ) {
                    rawPriceText =
                      String(
                        offerRecord.price,
                      );
                  }
                }

                if (
                  !currency &&
                  typeof offerRecord.priceCurrency ===
                    "string"
                ) {
                  currency =
                    offerRecord.priceCurrency;
                }

                if (
                  stockStatus ===
                  "UNKNOWN"
                ) {
                  stockStatus =
                    detectStockStatus(
                      offerRecord.availability,
                    );
                }
              }
            },
          );
        } catch {
          // Geçersiz JSON-LD bloklarını atla.
        }
      });

      /*
       * 2. Siteye özel okuyucular
       */
      const host =
        pageUrl.hostname
          .toLocaleLowerCase("en-US")
          .replace(/^www\./, "");

      if (
        host === "avansas.com" ||
        host.endsWith(".avansas.com")
      ) {
        const avansas =
          extractAvansasDetails(
            $,
            pageUrl,
            barcodes,
            images,
          );

        if (avansas.sku) {
          sku = avansas.sku;
        }

        if (
          avansas.stockStatus !==
          "UNKNOWN"
        ) {
          stockStatus =
            avansas.stockStatus;
        }
      }

      /*
       * 3. Genel ürün adı
       */
      if (!productName) {
        productName =
          cleanText(
            $(
              'meta[property="og:title"]',
            ).attr("content") ?? "",
          ) ||
          cleanText(
            $("h1")
              .first()
              .text(),
          ) ||
          null;
      }

      /*
       * 4. Open Graph ana görsel
       */
      const ogImage =
        $(
          'meta[property="og:image"]',
        ).attr("content");

      if (ogImage) {
        addImage(
          images,
          ogImage,
          pageUrl,
          "open-graph",
          images.size === 0,
        );
      }

      /*
       * 5. Genel HTML barkod alanları
       *
       * Önce dt/dd, th/td gibi semantik
       * özellik tablolarını okumaya çalış.
       */
      $("dt").each((_, element) => {
        const label = cleanText(
          $(element).text(),
        );

        const value = cleanText(
          $(element)
            .next("dd")
            .text(),
        );

        if (
          /^(?:ürün\s+)?(?:barkodu?|ean(?:-?13)?|gtin(?:-?13|-?14)?)\s*:?$/iu.test(
            label,
          )
        ) {
          addBarcode(
            barcodes,
            value,
            "html",
          );
        }
      });

      $("tr").each((_, element) => {
        const cells =
          $(element)
            .find("th,td")
            .toArray();

        if (cells.length < 2) {
          return;
        }

        const label = cleanText(
          $(cells[0]).text(),
        );

        const value = cleanText(
          $(cells[1]).text(),
        );

        if (
          /^(?:ürün\s+)?(?:barkodu?|ean(?:-?13)?|gtin(?:-?13|-?14)?)\s*:?$/iu.test(
            label,
          )
        ) {
          addBarcode(
            barcodes,
            value,
            "html",
          );
        }
      });

      /*
       * 6. Son çare olarak metin regex'i.
       * "Ürün Kodu" barkod değildir ve
       * özellikle burada aranmaz.
       */
      const bodyText =
        cleanText(
          $("body").text(),
        );

      const barcodePatterns = [
        /(?:ean(?:-?13)?|gtin(?:-?13|-?14)?|ürün\s+barkodu|urun\s+barkodu)\s*[:\-]?\s*(\d{8,14})/giu,
      ];

      for (
        const pattern of
        barcodePatterns
      ) {
        for (
          const match of
          bodyText.matchAll(pattern)
        ) {
          addBarcode(
            barcodes,
            match[1],
            "html",
          );
        }
      }

      /*
       * 7. Genel fiyat fallback
       */
      if (priceInclVat === null) {
        const metaPrice =
          $(
            'meta[property="product:price:amount"]',
          ).attr("content");

        priceInclVat =
          parsePrice(metaPrice);

        if (metaPrice) {
          rawPriceText =
            metaPrice;
        }
      }

      if (!currency) {
        currency =
          $(
            'meta[property="product:price:currency"]',
          ).attr("content") ??
          null;
      }

      /*
       * 8. Genel görsel fallback.
       *
       * Siteye özel veya JSON-LD/OpenGraph
       * görseli hiç bulunamadıysa çalışır.
       */
      if (images.size === 0) {
        $("img[src]").each(
          (_, element) => {
            const src =
              $(element).attr("src");

            if (!src) {
              return;
            }

            const alt =
              cleanText(
                $(element).attr(
                  "alt",
                ) ?? "",
              );

            if (
              alt.length < 3 &&
              !src
                .toLocaleLowerCase(
                  "en-US",
                )
                .includes("product")
            ) {
              return;
            }

            addImage(
              images,
              src,
              pageUrl,
              "html",
              false,
            );
          },
        );
      }

      return {
        success: true,

        message:
          "Ürün sayfası başarıyla analiz edildi.",

        sourceUrl:
          pageUrl.toString(),

        productName,
        sku,
        mpn,

        priceInclVat,
        currency,

        stockStatus,

        barcodes:
          Array.from(
            barcodes.values(),
          ),

        images:
          Array.from(
            images.values(),
          ),

        rawPriceText,
      };
    } catch (error) {
      return {
        success: false,

        message:
          error instanceof Error
            ? error.name ===
                "AbortError"
              ? "Ürün sayfası isteği zaman aşımına uğradı."
              : error.message
            : "Ürün sayfası analiz edilirken bilinmeyen bir hata oluştu.",

        sourceUrl: rawUrl,

        productName: null,
        sku: null,
        mpn: null,

        priceInclVat: null,
        currency: null,

        stockStatus:
          "UNKNOWN",

        barcodes: [],
        images: [],

        rawPriceText: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}