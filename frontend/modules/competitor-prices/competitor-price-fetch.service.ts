import {
  CompetitorPriceFetchStatus,
  CompetitorStockStatus,
} from "@prisma/client";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import net from "node:net";

import type {
  CompetitorPriceFetchInput,
  CompetitorPriceFetchResult,
} from "./competitor-price-fetch.types";

const REQUEST_TIMEOUT_MS = 20_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; EtkenOfficePriceMonitor/1.0; +https://etkenofis.com)";

type JsonRecord = Record<string, unknown>;

type ExtractedOffer = {
  productName: string | null;
  price: number | null;
  rawPriceText: string | null;
  currency: string;
  stockStatus: CompetitorStockStatus;
};

function normalizeHost(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/^www\./, "");
}

function isPrivateIpv4(address: string): boolean {
  const parts = address
    .split(".")
    .map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 &&
      second >= 16 &&
      second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isUnsafeAddress(address: string): boolean {
  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }

  if (ipVersion === 6) {
    const normalized =
      address.toLocaleLowerCase("en-US");

    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return true;
}

async function validateRemoteUrl(
  productUrl: URL,
  competitorBaseUrl: URL,
): Promise<void> {
  if (
    productUrl.protocol !== "https:" &&
    productUrl.protocol !== "http:"
  ) {
    throw new Error(
      "Rakip ürün adresi HTTP veya HTTPS olmalıdır.",
    );
  }

  if (
    normalizeHost(productUrl.hostname) !==
    normalizeHost(competitorBaseUrl.hostname)
  ) {
    throw new Error(
      "Rakip ürün adresi tanımlı rakip siteyle eşleşmiyor.",
    );
  }

  const addresses = await lookup(
    productUrl.hostname,
    {
      all: true,
      verbatim: true,
    },
  );

  if (
    addresses.length === 0 ||
    addresses.some((item) =>
      isUnsafeAddress(item.address),
    )
  ) {
    throw new Error(
      "Rakip site güvenli bir genel internet adresine yönlenmiyor.",
    );
  }
}

function cleanText(
  value: string | null | undefined,
): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(
  value: unknown,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  let normalized = value
    .replace(/\u00a0/g, " ")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!normalized) {
    return null;
  }

  const commaIndex =
    normalized.lastIndexOf(",");

  const dotIndex =
    normalized.lastIndexOf(".");

  if (
    commaIndex >= 0 &&
    dotIndex >= 0
  ) {
    if (commaIndex > dotIndex) {
      normalized = normalized
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      normalized =
        normalized.replace(/,/g, "");
    }
  } else if (commaIndex >= 0) {
    const decimalLength =
      normalized.length -
      commaIndex -
      1;

    normalized =
      decimalLength === 2
        ? normalized
            .replace(/\./g, "")
            .replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (dotIndex >= 0) {
    const decimalLength =
      normalized.length -
      dotIndex -
      1;

    if (decimalLength !== 2) {
      normalized =
        normalized.replace(/\./g, "");
    }
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : null;
}

function normalizeCurrency(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "TRY";
  }

  const normalized = value
    .trim()
    .toLocaleUpperCase("en-US");

  if (
    normalized === "TL" ||
    normalized === "₺" ||
    normalized === "TRY"
  ) {
    return "TRY";
  }

  return normalized || "TRY";
}

function normalizeAvailability(
  value: unknown,
): CompetitorStockStatus {
  if (typeof value !== "string") {
    return CompetitorStockStatus.UNKNOWN;
  }

  const normalized = value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü]/g, "");

  if (
    normalized.includes("instock") ||
    normalized.includes("stokta") ||
    normalized.includes("available")
  ) {
    return CompetitorStockStatus.IN_STOCK;
  }

  if (
    normalized.includes("outofstock") ||
    normalized.includes("stoktayok") ||
    normalized.includes("tukendi") ||
    normalized.includes("unavailable")
  ) {
    return CompetitorStockStatus.OUT_OF_STOCK;
  }

  if (
    normalized.includes("preorder") ||
    normalized.includes("onsiparis")
  ) {
    return CompetitorStockStatus.PREORDER;
  }

  return CompetitorStockStatus.UNKNOWN;
}

function asRecord(
  value: unknown,
): JsonRecord | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as JsonRecord;
  }

  return null;
}

function flattenJsonLd(
  value: unknown,
): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap(
      flattenJsonLd,
    );
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  const graph = record["@graph"];

  if (Array.isArray(graph)) {
    return [
      record,
      ...graph.flatMap(flattenJsonLd),
    ];
  }

  return [record];
}

function hasSchemaType(
  record: JsonRecord,
  expectedType: string,
): boolean {
  const typeValue = record["@type"];

  if (typeof typeValue === "string") {
    return (
      typeValue.toLocaleLowerCase(
        "en-US",
      ) ===
      expectedType.toLocaleLowerCase(
        "en-US",
      )
    );
  }

  if (Array.isArray(typeValue)) {
    return typeValue.some(
      (item) =>
        typeof item === "string" &&
        item.toLocaleLowerCase(
          "en-US",
        ) ===
          expectedType.toLocaleLowerCase(
            "en-US",
          ),
    );
  }

  return false;
}

function extractOfferRecord(
  productRecord: JsonRecord,
): JsonRecord | null {
  const offers = productRecord.offers;

  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const record = asRecord(offer);

      if (record) {
        return record;
      }
    }

    return null;
  }

  return asRecord(offers);
}

function extractJsonLdOffer(
  $: cheerio.CheerioAPI,
): ExtractedOffer | null {
  const records: JsonRecord[] = [];

  $(
    'script[type="application/ld+json"]',
  ).each((_, element) => {
    const rawValue = $(element).html();

    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(
        rawValue,
      ) as unknown;

      records.push(
        ...flattenJsonLd(parsed),
      );
    } catch {
      // Geçersiz JSON-LD blokları atlanır.
    }
  });

  for (const product of records) {
    if (
      !hasSchemaType(
        product,
        "Product",
      )
    ) {
      continue;
    }

    const offer =
      extractOfferRecord(product);

    if (!offer) {
      continue;
    }

    const rawPrice =
      offer.price ??
      offer.lowPrice ??
      offer.highPrice;

    const price = parsePrice(rawPrice);

    if (price === null) {
      continue;
    }

    return {
      productName:
        typeof product.name === "string"
          ? cleanText(product.name)
          : null,

      price,

      rawPriceText:
        typeof rawPrice === "string" ||
        typeof rawPrice === "number"
          ? String(rawPrice)
          : null,

      currency: normalizeCurrency(
        offer.priceCurrency,
      ),

      stockStatus:
        normalizeAvailability(
          offer.availability,
        ),
    };
  }

  return null;
}

function readMetaContent(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const value = cleanText(
      $(selector)
        .first()
        .attr("content"),
    );

    if (value) {
      return value;
    }
  }

  return null;
}

function extractMetaOffer(
  $: cheerio.CheerioAPI,
): ExtractedOffer | null {
  const rawPrice = readMetaContent(
    $,
    [
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[itemprop="price"]',
      '[itemprop="offers"] meta[itemprop="price"]',
    ],
  );

  const price = parsePrice(rawPrice);

  if (price === null) {
    return null;
  }

  const productName =
    readMetaContent($, [
      'meta[property="og:title"]',
      'meta[name="title"]',
    ]) ||
    cleanText($("h1").first().text()) ||
    null;

  const currency =
    readMetaContent($, [
      'meta[property="product:price:currency"]',
      'meta[property="og:price:currency"]',
      'meta[itemprop="priceCurrency"]',
    ]) ?? "TRY";

  const availability =
    readMetaContent($, [
      'meta[property="product:availability"]',
      'link[itemprop="availability"]',
    ]);

  return {
    productName,
    price,
    rawPriceText: rawPrice,
    currency:
      normalizeCurrency(currency),
    stockStatus:
      normalizeAvailability(
        availability,
      ),
  };
}

function extractHtmlOffer(
  $: cheerio.CheerioAPI,
): ExtractedOffer | null {
  const selectors = [
    '[itemprop="price"]',
    '[data-price]',
    ".product-price",
    ".product__price",
    ".price-current",
    ".current-price",
    ".sale-price",
    ".price",
  ];

  for (const selector of selectors) {
    const element = $(selector).first();

    if (element.length === 0) {
      continue;
    }

    const rawPrice =
      cleanText(
        element.attr("content"),
      ) ||
      cleanText(
        element.attr("data-price"),
      ) ||
      cleanText(element.text());

    const price = parsePrice(rawPrice);

    if (price === null) {
      continue;
    }

    const bodyText = cleanText(
      $("body").text(),
    );

    return {
      productName:
        cleanText(
          $("h1").first().text(),
        ) || null,

      price,
      rawPriceText: rawPrice,
      currency:
        rawPrice.includes("€")
          ? "EUR"
          : rawPrice.includes("$")
            ? "USD"
            : "TRY",

      stockStatus:
        normalizeAvailability(
          bodyText,
        ),
    };
  }

  return null;
}

function calculatePrices(
  observedPrice: number,
  vatRate: number | null,
): {
  priceExclVat: number | null;
  priceInclVat: number;
} {
  if (
    vatRate === null ||
    vatRate < 0
  ) {
    return {
      priceExclVat: null,
      priceInclVat: observedPrice,
    };
  }

  const priceExclVat =
    observedPrice /
    (1 + vatRate / 100);

  return {
    priceExclVat:
      Math.round(
        priceExclVat * 100,
      ) / 100,

    priceInclVat:
      Math.round(
        observedPrice * 100,
      ) / 100,
  };
}

function errorResult(
  status: CompetitorPriceFetchStatus,
  message: string,
): CompetitorPriceFetchResult {
  return {
    fetchStatus: status,

    productName: null,

    priceExclVat: null,
    priceInclVat: null,

    currency: "TRY",
    vatRate: null,

    stockStatus:
      CompetitorStockStatus.UNKNOWN,

    rawPriceText: null,
    errorMessage: message,

    checkedAt: new Date(),
  };
}

export class CompetitorPriceFetchService {
  static async fetchPrice(
    input: CompetitorPriceFetchInput,
  ): Promise<CompetitorPriceFetchResult> {
    try {
      const productUrl = new URL(
        input.productUrl,
      );

      const competitorBaseUrl = new URL(
        input.competitorBaseUrl,
      );

      await validateRemoteUrl(
        productUrl,
        competitorBaseUrl,
      );

      const controller =
        new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      let response: Response;

      try {
        response = await fetch(
          productUrl,
          {
            method: "GET",

            headers: {
              "user-agent": USER_AGENT,
              accept:
                "text/html,application/xhtml+xml",

              "accept-language":
                "tr-TR,tr;q=0.9,en;q=0.7",
            },

            redirect: "follow",
            cache: "no-store",

            signal:
              controller.signal,
          },
        );
      } finally {
        clearTimeout(timeout);
      }

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 429
      ) {
        return errorResult(
          CompetitorPriceFetchStatus.BLOCKED,
          `Rakip site isteği engelledi. HTTP ${response.status}.`,
        );
      }

      if (response.status === 404) {
        return errorResult(
          CompetitorPriceFetchStatus.PRODUCT_NOT_FOUND,
          "Rakip ürün sayfası bulunamadı.",
        );
      }

      if (!response.ok) {
        return errorResult(
          CompetitorPriceFetchStatus.INVALID_RESPONSE,
          `Rakip site HTTP ${response.status} yanıtı verdi.`,
        );
      }

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      if (
        !contentType
          .toLocaleLowerCase("en-US")
          .includes("text/html")
      ) {
        return errorResult(
          CompetitorPriceFetchStatus.INVALID_RESPONSE,
          "Rakip site HTML olmayan bir yanıt verdi.",
        );
      }

      const html =
        await response.text();

      const $ = cheerio.load(html);

      const extractedOffer =
        extractJsonLdOffer($) ??
        extractMetaOffer($) ??
        extractHtmlOffer($);

      if (!extractedOffer) {
        return errorResult(
          CompetitorPriceFetchStatus.PRICE_NOT_FOUND,
          "Ürün sayfasında okunabilir fiyat bilgisi bulunamadı.",
        );
      }

      if (extractedOffer.price === null) {
  return errorResult(
    CompetitorPriceFetchStatus.PRICE_NOT_FOUND,
    "Ürün fiyatı okunamadı.",
  );
}

      const calculatedPrices =
        calculatePrices(
          extractedOffer.price,
          input.vatRate,
        );

      return {
        fetchStatus:
          CompetitorPriceFetchStatus.SUCCESS,

        productName:
          extractedOffer.productName,

        priceExclVat:
          calculatedPrices.priceExclVat,

        priceInclVat:
          calculatedPrices.priceInclVat,

        currency:
          extractedOffer.currency,

        vatRate: input.vatRate,

        stockStatus:
          extractedOffer.stockStatus,

        rawPriceText:
          extractedOffer.rawPriceText,

        errorMessage: null,

        checkedAt: new Date(),
      };
    } catch (error) {
      console.error(
        "Competitor price fetch failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.name ===
            "AbortError"
            ? "Rakip site isteği zaman aşımına uğradı."
            : error.message
          : "Fiyat okunurken bilinmeyen bir hata oluştu.";

      return errorResult(
        CompetitorPriceFetchStatus.ERROR,
        message,
      );
    }
  }
}