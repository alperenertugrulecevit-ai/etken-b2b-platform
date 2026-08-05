export type ProductImportStatus =
  | "idle"
  | "success"
  | "error";

export type ProductImportRowError = {
  rowNumber: number;
  code: string;
  productName: string;
  message: string;
};

export type ProductImportState = {
  status: ProductImportStatus;
  message: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: ProductImportRowError[];
};

export type ParsedProductImportRow = {
  rowNumber: number;
  code: string;
  brand: string;
  name: string;
  mainCategory: string;
  subCategory: string;
  salesUnit: string;
  packageInfo: string;
  price: number | null;
  stock: number | null;
  supplier: string | null;
  barcode: string | null;
};

export const INITIAL_PRODUCT_IMPORT_STATE: ProductImportState = {
  status: "idle",
  message: "",
  totalRows: 0,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  errors: [],
};