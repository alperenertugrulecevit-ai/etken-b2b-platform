export type DataImportType =
  | "PRODUCT"
  | "SUPPLIER"
  | "CUSTOMER"
  | "PURCHASE_ORDER"
  | "SALES_ORDER";

export type DataImportMode =
  | "CREATE_ONLY"
  | "UPSERT";

export type DataImportStatus =
  | "VALIDATING"
  | "READY"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export type DataImportRowStatus =
  | "VALID"
  | "INVALID"
  | "IMPORTED"
  | "UPDATED"
  | "SKIPPED"
  | "FAILED";

export type ImportCellValue =
  | string
  | number
  | boolean
  | null;

export type ParsedImportRow = {
  sheetName: string;
  rowNumber: number;
  values: ImportCellValue[];
};

export type ParsedImportSheet = {
  name: string;
  rows: ParsedImportRow[];
};

export type ParsedImportWorkbook = {
  fileName: string;
  fileSize: number;
  fileHash: string;
  sheetNames: string[];
  sheets: ParsedImportSheet[];
  totalDataRows: number;
};
