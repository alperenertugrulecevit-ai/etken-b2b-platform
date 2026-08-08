import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import net from "node:net";

import type {
  CompetitorProductSearchCandidate,
  CompetitorProductSearchConfidence,
  CompetitorProductSearchResult,
} from "./competitor-product-search.types";

const REQUEST_TIMEOUT_MS = 20_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; EtkenOfficeProductMatcher/1.0; +https://etkenofis.com)";

type CompetitorProductSearchInput = {
  productCode: string;
  productName: string;
  productBrand: string;
  productBarcode: string;

  competitorBaseUrl: string;
  searchUrlTemplate: string;
  productUrlPattern: string | null;
  resultLimit: number;
};

function normalizeHost(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
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
    first === 0 ||
    first === 10 ||
    first === 127 ||
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
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return true;
}

async function validateRemoteUrl(
  requestedUrl: URL,
  baseUrl: URL,
): Promise<void> {
  if (
    requestedUrl.protocol !== "https:" &&
    requestedUrl.protocol !== "http:"
  ) {
    throw new Error(
      "Arama adresi HTTP veya HTTPS olmalıdır.",
    );
  }

  if (
    normalizeHost(requestedUrl.hostname) !==
    normalizeHost(baseUrl.hostname)
  ) {
    throw new Error(
      "Arama adresi tanımlı rakip siteyle eşleşmiyor.",
    );
  }

  const addresses = await lookup(
    requestedUrl.hostname,
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

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_PRODUCT_TERMS = new Set([
  "ve",
  "ile",
  "icin",
  "için",
  "adet",
  "paket",
  "urun",
  "ürün",
  "beyaz",
  "siyah",
  "seffaf",
  "şeffaf",
  "dokme",
  "dökme",
  "cay",
  "çay",
  "cayi",
  "çayı",
  "film",
  "mikron",
  "gr",
  "gram",
  "g",
  "kg",
  "ml",
  "cl",
  "lt",
  "l",
  "mm",
  "cm",
  "m",
]);

const UNIT_TERMS = new Set([
  "g",
  "gr",
  "gram",
  "kg",
  "ml",
  "cl",
  "l",
  "lt",
  "mm",
  "cm",
  "m",
]);

type MeasurementDimension =
  | "MASS"
  | "VOLUME"
  | "LENGTH"
  | "CAPACITY_OZ";

type NormalizedMeasurement = {
  dimension: MeasurementDimension;
  value: number;
  raw: string;
};

function tokenize(value: string): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length >= 2 &&
        !GENERIC_PRODUCT_TERMS.has(term),
    );
}

function isTemporaryBarcode(
  value: string,
): boolean {
  const normalized =
    value
      .trim()
      .toLocaleUpperCase("en-US");

  return (
    normalized === "" ||
    normalized.startsWith("TMP-") ||
    normalized.startsWith("TEMP-") ||
    normalized.startsWith("TEST-")
  );
}

function getSearchBarcode(
  value: string,
): string {
  return isTemporaryBarcode(value)
    ? ""
    : value.trim();
}

function normalizeDecimal(
  value: string,
): number | null {
  const parsed = Number(
    value.replace(",", "."),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeMeasurement(
  numericValue: number,
  unit: string,
  raw: string,
): NormalizedMeasurement | null {
  const normalizedUnit =
    unit
      .toLocaleLowerCase("tr-TR")
      .trim();

  if (
    normalizedUnit === "g" ||
    normalizedUnit === "gr" ||
    normalizedUnit === "gram"
  ) {
    return {
      dimension: "MASS",
      value: numericValue,
      raw,
    };
  }

  if (normalizedUnit === "kg") {
    return {
      dimension: "MASS",
      value: numericValue * 1000,
      raw,
    };
  }

  if (
  normalizedUnit === "oz"
) {
  return {
    dimension: "CAPACITY_OZ",
    value: numericValue,
    raw,
  };
}

  if (normalizedUnit === "ml") {
    return {
      dimension: "VOLUME",
      value: numericValue,
      raw,
    };
  }

  if (normalizedUnit === "cl") {
    return {
      dimension: "VOLUME",
      value: numericValue * 10,
      raw,
    };
  }

  if (
    normalizedUnit === "l" ||
    normalizedUnit === "lt"
  ) {
    return {
      dimension: "VOLUME",
      value: numericValue * 1000,
      raw,
    };
  }

  if (normalizedUnit === "mm") {
    return {
      dimension: "LENGTH",
      value: numericValue,
      raw,
    };
  }

  if (normalizedUnit === "cm") {
    return {
      dimension: "LENGTH",
      value: numericValue * 10,
      raw,
    };
  }

  if (normalizedUnit === "m") {
    return {
      dimension: "LENGTH",
      value: numericValue * 1000,
      raw,
    };
  }

  return null;
}

function extractMeasurements(
  value: string,
): NormalizedMeasurement[] {
  const normalized =
    value.toLocaleLowerCase("tr-TR");

const pattern =
  /(\d+(?:[.,]\d+)?)\s*(kg|gram|gr|g|ml|cl|lt|l|mm|cm|m|oz)\b/giu;

  const measurements:
    NormalizedMeasurement[] = [];

  for (
    const match of
    normalized.matchAll(pattern)
  ) {
    const numericValue =
      normalizeDecimal(match[1]);

    if (numericValue === null) {
      continue;
    }

    const measurement =
      normalizeMeasurement(
        numericValue,
        match[2],
        match[0],
      );

    if (measurement) {
      measurements.push(measurement);
    }
  }

  return measurements;
}

function uniqueMeasurementValues(
  measurements: NormalizedMeasurement[],
  dimension: MeasurementDimension,
): number[] {
  return Array.from(
    new Set(
      measurements
        .filter(
          (item) =>
            item.dimension ===
            dimension,
        )
        .map(
          (item) =>
            Math.round(
              item.value * 1000,
            ) / 1000,
        ),
    ),
  ).sort(
    (left, right) =>
      left - right,
  );
}

function sameNumberSet(
  left: number[],
  right: number[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (value, index) =>
      Math.abs(
        value - right[index],
      ) < 0.001,
  );
}

function extractPackageCount(
  value: string,
): number | null {
  const normalized =
    value
      .toLocaleLowerCase("tr-TR")
      .replace(/[’']/g, "'");

  const patterns = [
    /\b(\d+)\s*['-]?\s*(?:li|lı|lu|lü)\b/u,
    /\bx\s*(\d+)\s*(?:paket|adet|koli)?\b/u,
    /\b(\d+)\s*x\s*(?:paket|adet|koli)\b/u,
    /\b(\d+)\s*(?:paket|adet)\b/u,
  ];

  for (const pattern of patterns) {
    const match =
      normalized.match(pattern);

    if (!match) {
      continue;
    }

    const count =
      Number(match[1]);

    if (
      Number.isInteger(count) &&
      count > 0
    ) {
      return count;
    }
  }

  return null;
}

function extractIdentityTerms({
  productName,
  productBrand,
}: {
  productName: string;
  productBrand: string;
}): string[] {
  const brandTerms =
    new Set(
      normalizeSearchText(
        productBrand,
      )
        .split(" ")
        .filter(Boolean),
    );

  return normalizeSearchText(
    productName,
  )
    .split(" ")
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length >= 2 &&
        !GENERIC_PRODUCT_TERMS.has(
          term,
        ) &&
        !UNIT_TERMS.has(term) &&
        !/^\d+(?:[.,]\d+)?$/u.test(
          term,
        ) &&
        !brandTerms.has(term),
    );
}

function calculateCandidateScore({
  candidateTitle,
  productName,
  productBrand,
  productCode,
  productBarcode,
}: {
  candidateTitle: string;
  productName: string;
  productBrand: string;
  productCode: string;
  productBarcode: string;
}): {
  score: number;
  matchedTerms: string[];
} {
  const candidateText =
    normalizeSearchText(candidateTitle);

  const nameTerms = tokenize(productName);
  const brandTerms = tokenize(productBrand);

  const matchedTerms =
    new Set<string>();

  let earnedPoints = 0;
  let possiblePoints = 0;

  for (const term of brandTerms) {
    possiblePoints += 25;

    if (candidateText.includes(term)) {
      earnedPoints += 25;
      matchedTerms.add(term);
    }
  }

  for (const term of nameTerms) {
    possiblePoints += 12;

    if (candidateText.includes(term)) {
      earnedPoints += 12;
      matchedTerms.add(term);
    }
  }

  const normalizedCode =
    normalizeSearchText(productCode);

  if (
    normalizedCode &&
    candidateText.includes(
      normalizedCode,
    )
  ) {
    earnedPoints += 10;
    possiblePoints += 10;
    matchedTerms.add(productCode);
  }

  const usableBarcode =
    getSearchBarcode(productBarcode);

  const normalizedBarcode =
    normalizeSearchText(
      usableBarcode,
    );

  if (
    normalizedBarcode &&
    candidateText.includes(
      normalizedBarcode,
    )
  ) {
    earnedPoints += 35;
    possiblePoints += 35;
    matchedTerms.add(usableBarcode);
  }

  if (possiblePoints <= 0) {
    return {
      score: 0,
      matchedTerms: [],
    };
  }

  const score = Math.min(
    100,
    Math.round(
      (earnedPoints /
        possiblePoints) *
        100,
    ),
  );

  return {
    score,
    matchedTerms:
      Array.from(matchedTerms),
  };
}

const PRODUCT_TYPE_CONFLICT_TERMS = [
  "dispenser",
  "makine",
  "makinesi",
  "cihaz",
  "aparat",
  "stand",
  "refill",
];

function findUnexpectedProductTypeTerms({
  productName,
  candidateTitle,
}: {
  productName: string;
  candidateTitle: string;
}): string[] {
  const sourceText =
    normalizeSearchText(
      productName,
    );

  const candidateText =
    normalizeSearchText(
      candidateTitle,
    );

  return PRODUCT_TYPE_CONFLICT_TERMS.filter(
    (term) =>
      candidateText.includes(term) &&
      !sourceText.includes(term),
  );
}

function evaluateVariantMatch({
  productName,
  productBrand,
  candidateTitle,
  lexicalScore,
}: {
  productName: string;
  productBrand: string;
  candidateTitle: string;
  lexicalScore: number;
}): {
  confidence: CompetitorProductSearchConfidence;
  variantMatched: boolean;
  rejectionReasons: string[];
  adjustedScore: number;
} {
  const rejectionReasons: string[] = [];

  const sourceMeasurements =
    extractMeasurements(productName);

  const candidateMeasurements =
    extractMeasurements(candidateTitle);

  for (
    const dimension of [
      "MASS",
      "VOLUME",
      "LENGTH",
      "CAPACITY_OZ",
    ] as const
  ) {
    const sourceValues =
      uniqueMeasurementValues(
        sourceMeasurements,
        dimension,
      );

    if (sourceValues.length === 0) {
      continue;
    }

    const candidateValues =
      uniqueMeasurementValues(
        candidateMeasurements,
        dimension,
      );

    if (candidateValues.length === 0) {
      rejectionReasons.push(
        `${dimension === "MASS"
          ? "Gramaj"
          : dimension === "VOLUME"
            ? "Hacim"
            : dimension === "CAPACITY_OZ"
              ? "Oz kapasitesi"
            : "Ölçü"} bilgisi adayda bulunamadı.`,
      );
      continue;
    }

    if (
      !sameNumberSet(
        sourceValues,
        candidateValues,
      )
    ) {
      rejectionReasons.push(
        `${dimension === "MASS"
          ? "Gramaj"
          : dimension === "VOLUME"
            ? "Hacim"
            : dimension === "CAPACITY_OZ"
              ? "Oz kapasitesi"
            : "Ölçü"} uyuşmuyor.`,
      );
    }
  }

  const sourcePackageCount =
    extractPackageCount(productName);

  const candidatePackageCount =
    extractPackageCount(candidateTitle);

  if (sourcePackageCount !== null) {
    if (
      candidatePackageCount !== null &&
      candidatePackageCount !==
        sourcePackageCount
    ) {
      rejectionReasons.push(
        `Paket adedi uyuşmuyor (${sourcePackageCount} ≠ ${candidatePackageCount}).`,
      );
    }
  } else if (
    candidatePackageCount !== null &&
    candidatePackageCount > 1
  ) {
    rejectionReasons.push(
      `Aday çoklu paket içeriyor (${candidatePackageCount} adet/paket).`,
    );
  }

const candidateText =
  normalizeSearchText(candidateTitle);

const unexpectedProductTypeTerms =
  findUnexpectedProductTypeTerms({
    productName,
    candidateTitle,
  });

if (
  unexpectedProductTypeTerms.length >
  0
) {
  rejectionReasons.push(
    `Ürün tipi uyuşmuyor. Adayda kaynak üründe olmayan ifade var: ${unexpectedProductTypeTerms.join(
      ", ",
    )}.`,
  );
}

const identityTerms =
  extractIdentityTerms({
    productName,
    productBrand,
  });

  const missingIdentityTerms =
    identityTerms.filter(
      (term) =>
        !candidateText.includes(term),
    );

  if (
    identityTerms.length > 0 &&
    missingIdentityTerms.length > 0
  ) {
    rejectionReasons.push(
      `Ürün seri/model ifadesi uyuşmuyor: ${missingIdentityTerms.join(
        ", ",
      )}.`,
    );
  }

const hardMismatch =
  rejectionReasons.some(
    (reason) =>
      reason.includes("uyuşmuyor") ||
      reason.includes("çoklu paket") ||
      reason.includes(
        "Ürün tipi uyuşmuyor",
      ),
  );

  if (hardMismatch) {
    return {
      confidence: "REJECTED",
      variantMatched: false,
      rejectionReasons,
      adjustedScore:
        Math.min(lexicalScore, 25),
    };
  }

  if (rejectionReasons.length > 0) {
    return {
      confidence: "REVIEW",
      variantMatched: false,
      rejectionReasons,
      adjustedScore:
        Math.min(lexicalScore, 69),
    };
  }

  if (lexicalScore >= 80) {
    return {
      confidence: "HIGH",
      variantMatched: true,
      rejectionReasons: [],
      adjustedScore:
        Math.max(lexicalScore, 90),
    };
  }

  return {
    confidence: "REVIEW",
    variantMatched: true,
    rejectionReasons: [
      "Metin benzerliği otomatik eşleştirme için yeterince yüksek değil.",
    ],
    adjustedScore: lexicalScore,
  };
}

function buildSearchQuery({
  productBrand,
  productName,
  productBarcode,
}: {
  productBrand: string;
  productName: string;
  productBarcode: string;
}): string {
  const parts = [
    productBrand,
    productName,
  ];

  const usableBarcode =
    getSearchBarcode(productBarcode);

  if (usableBarcode) {
    parts.push(usableBarcode);
  }

  return cleanText(parts.join(" "));
}

function buildSearchUrl(
  searchUrlTemplate: string,
  query: string,
): URL {
  if (
    !searchUrlTemplate.includes(
      "{query}",
    )
  ) {
    throw new Error(
      "Rakip sitenin arama URL şablonunda {query} alanı bulunmuyor.",
    );
  }

  const urlValue =
    searchUrlTemplate.replace(
      "{query}",
      encodeURIComponent(query),
    );

  return new URL(urlValue);
}

function normalizeCandidateUrl(
  href: string,
  searchUrl: URL,
  baseUrl: URL,
): URL | null {
  try {
    const candidateUrl = new URL(
      href,
      searchUrl,
    );

    candidateUrl.hash = "";

    if (
      candidateUrl.protocol !== "https:" &&
      candidateUrl.protocol !== "http:"
    ) {
      return null;
    }

    if (
      normalizeHost(
        candidateUrl.hostname,
      ) !==
      normalizeHost(baseUrl.hostname)
    ) {
      return null;
    }

    return candidateUrl;
  } catch {
    return null;
  }
}

function matchesProductPattern(
  productUrl: string,
  productUrlPattern: string | null,
): boolean {
  if (!productUrlPattern?.trim()) {
    return true;
  }

  return productUrl
    .toLocaleLowerCase("tr-TR")
    .includes(
      productUrlPattern
        .trim()
        .toLocaleLowerCase("tr-TR"),
    );
}

import type { Element } from "domhandler";
function extractCandidateTitle(
  $: cheerio.CheerioAPI,
  element: Element,
): string {
    
  const link = $(element);

  const title =
    cleanText(link.attr("title") ?? "") ||
    cleanText(
      link.attr("aria-label") ?? "",
    ) ||
    cleanText(link.text());

  if (title.length >= 4) {
    return title;
  }

  const parentText = cleanText(
    link
      .closest(
        "article,li,.product,.product-item,.product-card",
      )
      .first()
      .text(),
  );

  return parentText || title;
}

export class CompetitorProductSearchService {
  static async search(
    input: CompetitorProductSearchInput,
  ): Promise<CompetitorProductSearchResult> {
    try {
      const baseUrl = new URL(
        input.competitorBaseUrl,
      );

      const query = buildSearchQuery({
        productBrand:
          input.productBrand,

        productName:
          input.productName,

        productBarcode:
          input.productBarcode,
      });

      const searchUrl = buildSearchUrl(
        input.searchUrlTemplate,
        query,
      );

      await validateRemoteUrl(
        searchUrl,
        baseUrl,
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
          searchUrl,
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
        return {
          success: false,

          message:
            `Rakip site arama isteğini engelledi. HTTP ${response.status}.`,

          searchUrl:
            searchUrl.toString(),

          candidates: [],
        };
      }

      if (!response.ok) {
        return {
          success: false,

          message:
            `Rakip site HTTP ${response.status} yanıtı verdi.`,

          searchUrl:
            searchUrl.toString(),

          candidates: [],
        };
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
        return {
          success: false,

          message:
            "Rakip site HTML olmayan bir yanıt verdi.",

          searchUrl:
            searchUrl.toString(),

          candidates: [],
        };
      }

      const html =
        await response.text();

      const $ = cheerio.load(html);

      const candidateMap =
        new Map<
          string,
          CompetitorProductSearchCandidate
        >();

      $("a[href]").each(
        (_, element) => {
          const href =
            $(element).attr("href");

          if (!href) {
            return;
          }

          const candidateUrl =
            normalizeCandidateUrl(
              href,
              searchUrl,
              baseUrl,
            );

          if (!candidateUrl) {
            return;
          }

          if (
            !matchesProductPattern(
              candidateUrl.pathname,
              input.productUrlPattern,
            )
          ) {
            return;
          }

          const title =
            extractCandidateTitle(
              $,
              element,
            );

          if (title.length < 4) {
            return;
          }

          const scoreResult =
            calculateCandidateScore({
              candidateTitle: title,

              productName:
                input.productName,

              productBrand:
                input.productBrand,

              productCode:
                input.productCode,

              productBarcode:
                input.productBarcode,
            });

          if (scoreResult.score <= 0) {
            return;
          }

          const normalizedUrl =
            candidateUrl.toString();

          const existing =
            candidateMap.get(
              normalizedUrl,
            );

          const variantResult =
            evaluateVariantMatch({
              productName:
                input.productName,

              productBrand:
                input.productBrand,

              candidateTitle:
                title,

              lexicalScore:
                scoreResult.score,
            });

          const candidate:
            CompetitorProductSearchCandidate =
            {
              title,

              productUrl:
                normalizedUrl,

              score:
                variantResult.adjustedScore,

              matchedTerms:
                scoreResult.matchedTerms,

              confidence:
                variantResult.confidence,

              variantMatched:
                variantResult.variantMatched,

              rejectionReasons:
                variantResult.rejectionReasons,
            };

          if (
            !existing ||
            candidate.score >
              existing.score
          ) {
            candidateMap.set(
              normalizedUrl,
              candidate,
            );
          }
        },
      );

      const candidates =
        Array.from(
          candidateMap.values(),
        )
          .sort(
            (left, right) => {
              const confidenceRank = {
                HIGH: 3,
                REVIEW: 2,
                REJECTED: 1,
              } as const;

              const rankDifference =
                confidenceRank[
                  right.confidence
                ] -
                confidenceRank[
                  left.confidence
                ];

              if (rankDifference !== 0) {
                return rankDifference;
              }

              return (
                right.score -
                left.score
              );
            },
          )
          .slice(
            0,
            Math.max(
              1,
              Math.min(
                input.resultLimit,
                50,
              ),
            ),
          );

      if (candidates.length === 0) {
        return {
          success: false,

          message:
            "Arama sonuçlarında ürün adayı bulunamadı. Arama URL şablonu veya ürün bağlantı deseni kontrol edilmelidir.",

          searchUrl:
            searchUrl.toString(),

          candidates: [],
        };
      }

      return {
        success: true,

        message:
          `${candidates.length} aday ürün bulundu.`,

        searchUrl:
          searchUrl.toString(),

        candidates,
      };
    } catch (error) {
      console.error(
        "Competitor product search failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? "Rakip site araması zaman aşımına uğradı."
            : error.message
          : "Ürün adayları aranırken bilinmeyen bir hata oluştu.";

      return {
        success: false,
        message,
        searchUrl: null,
        candidates: [],
      };
    }
  }
}