import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import net from "node:net";

import type {
  CompetitorProductSearchCandidate,
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

function tokenize(value: string): string[] {
  const ignoredTerms = new Set([
    "ve",
    "ile",
    "icin",
    "için",
    "adet",
    "paket",
    "urun",
    "ürün",
    "beyaz",
  ]);

  return normalizeSearchText(value)
    .split(" ")
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length >= 2 &&
        !ignoredTerms.has(term),
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

  const matchedTerms = new Set<string>();

  let earnedPoints = 0;
  let possiblePoints = 0;

  for (const term of brandTerms) {
    possiblePoints += 20;

    if (candidateText.includes(term)) {
      earnedPoints += 20;
      matchedTerms.add(term);
    }
  }

  for (const term of nameTerms) {
    possiblePoints += 8;

    if (candidateText.includes(term)) {
      earnedPoints += 8;
      matchedTerms.add(term);
    }
  }

  const normalizedCode =
    normalizeSearchText(productCode);

  if (normalizedCode) {
    possiblePoints += 15;

    if (candidateText.includes(normalizedCode)) {
      earnedPoints += 15;
      matchedTerms.add(productCode);
    }
  }

  const normalizedBarcode =
    normalizeSearchText(productBarcode);

  if (normalizedBarcode) {
    possiblePoints += 30;

    if (
      candidateText.includes(
        normalizedBarcode,
      )
    ) {
      earnedPoints += 30;
      matchedTerms.add(productBarcode);
    }
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
      (earnedPoints / possiblePoints) *
        100,
    ),
  );

  return {
    score,
    matchedTerms:
      Array.from(matchedTerms),
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

  if (productBarcode.trim()) {
    parts.push(productBarcode);
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

          const candidate = {
            title,
            productUrl:
              normalizedUrl,

            score:
              scoreResult.score,

            matchedTerms:
              scoreResult.matchedTerms,
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
            (left, right) =>
              right.score -
              left.score,
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