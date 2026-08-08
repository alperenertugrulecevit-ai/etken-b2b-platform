export type ProductEnrichmentBarcodeCandidate = {
  value: string;
  type:
    | "EAN13"
    | "EAN8"
    | "UPC"
    | "GTIN"
    | "MANUFACTURER"
    | "UNIT"
    | "PACKAGE"
    | "CASE"
    | "SUPPLIER"
    | "OTHER";

  source:
    | "json-ld"
    | "html"
    | "meta"
    | "attribute"
    | "unknown";
};

export type ProductEnrichmentImageCandidate = {
  url: string;
  source:
    | "json-ld"
    | "open-graph"
    | "html"
    | "unknown";

  isPrimary: boolean;
};

export type ProductEnrichmentResult = {
  success: boolean;
  message: string;

  sourceUrl: string;

  productName: string | null;
  sku: string | null;
  mpn: string | null;

  priceInclVat: number | null;
  currency: string | null;

  stockStatus:
    | "UNKNOWN"
    | "IN_STOCK"
    | "OUT_OF_STOCK"
    | "PREORDER";

  barcodes: ProductEnrichmentBarcodeCandidate[];

  images: ProductEnrichmentImageCandidate[];

  rawPriceText: string | null;
};