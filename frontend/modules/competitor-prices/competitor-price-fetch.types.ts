import type {
  CompetitorPriceFetchStatus,
  CompetitorStockStatus,
} from "@prisma/client";

export type CompetitorPriceFetchResult = {
  fetchStatus: CompetitorPriceFetchStatus;

  productName: string | null;

  priceExclVat: number | null;
  priceInclVat: number | null;

  currency: string;
  vatRate: number | null;

  stockStatus: CompetitorStockStatus;

  rawPriceText: string | null;
  errorMessage: string | null;

  checkedAt: Date;
};

export type CompetitorPriceFetchInput = {
  productUrl: string;
  competitorBaseUrl: string;
  vatRate: number | null;
};