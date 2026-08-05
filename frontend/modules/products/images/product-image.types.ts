export type ProductImageUploadStatus =
  | "idle"
  | "success"
  | "partial"
  | "error";

export type ProductImageUploadItemStatus =
  | "uploaded"
  | "product_not_found"
  | "invalid_file"
  | "upload_failed";

export type ProductImageUploadItem = {
  fileName: string;
  sku: string;
  status: ProductImageUploadItemStatus;
  message: string;
  imageUrl: string | null;
};

export type ProductImageUploadState = {
  status: ProductImageUploadStatus;
  message: string;
  totalFiles: number;
  uploadedCount: number;
  notFoundCount: number;
  invalidCount: number;
  failedCount: number;
  items: ProductImageUploadItem[];
};

export const INITIAL_PRODUCT_IMAGE_UPLOAD_STATE: ProductImageUploadState =
  {
    status: "idle",
    message: "",
    totalFiles: 0,
    uploadedCount: 0,
    notFoundCount: 0,
    invalidCount: 0,
    failedCount: 0,
    items: [],
  };