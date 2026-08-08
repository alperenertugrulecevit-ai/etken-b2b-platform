"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { BarcodeRecoveryBulkService } from "@/modules/product-enrichment/barcode-recovery-bulk.service";
import { ProductAutoMatchBulkService } from "@/modules/product-enrichment/product-auto-match-bulk.service";
import { ProductEnrichmentBulkService } from "@/modules/product-enrichment/product-enrichment-bulk.service";

export async function runProductEnrichmentBatch(
  formData: FormData,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const rawBatchSize =
    formData.get("batchSize");

  const requestedBatchSize =
    typeof rawBatchSize === "string"
      ? Number(rawBatchSize)
      : 10;

  const batchSize =
    requestedBatchSize === 25
      ? 25
      : requestedBatchSize === 10
        ? 10
        : 1;

  const result =
    await ProductEnrichmentBulkService.runBatch(
      batchSize,
    );

  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/products/enrichment",
  );

  const query =
    new URLSearchParams({
      mode:
        "enrichment",

      processed:
        String(
          result.processedCount,
        ),

      success:
        String(
          result.successCount,
        ),

      partial:
        String(
          result.partialCount,
        ),

      noBarcode:
        String(
          result.noBarcodeCount,
        ),

      noImage:
        String(
          result.noImageCount,
        ),

      errors:
        String(
          result.errorCount,
        ),

      remaining:
        String(
          result.remainingCount,
        ),
    });

  redirect(
    `/admin/products/enrichment?${query.toString()}`,
  );
}

export async function runProductAutoMatchBatch(
  formData: FormData,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const rawBatchSize =
    formData.get("batchSize");

  const requestedBatchSize =
    typeof rawBatchSize === "string"
      ? Number(rawBatchSize)
      : 1;

  const batchSize =
    requestedBatchSize === 25
      ? 25
      : requestedBatchSize === 10
        ? 10
        : requestedBatchSize === 5
          ? 5
          : 1;

  const result =
    await ProductAutoMatchBulkService.runBatch(
      batchSize,
    );

  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/products/enrichment",
  );

  revalidatePath(
    "/admin/competitor-prices",
  );

  revalidatePath(
    "/admin/competitor-prices/mappings",
  );

  const query =
    new URLSearchParams({
      mode:
        "automatch",

      autoProcessed:
        String(
          result.processedProducts,
        ),

      autoMatched:
        String(
          result.autoMatchedCount,
        ),

      autoReview:
        String(
          result.reviewCount,
        ),

      autoNoMatch:
        String(
          result.noMatchCount,
        ),

      autoSearchError:
        String(
          result.searchErrorCount,
        ),

      autoErrors:
        String(
          result.errorCount,
        ),

      autoRemaining:
        String(
          result.remainingProductCount,
        ),
    });

  redirect(
    `/admin/products/enrichment?${query.toString()}`,
  );
}

export async function runBarcodeRecoveryBatch(
  formData: FormData,
): Promise<void> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const rawBatchSize =
    formData.get("batchSize");

  const requestedBatchSize =
    typeof rawBatchSize === "string"
      ? Number(rawBatchSize)
      : 1;

  const batchSize =
    requestedBatchSize === 25
      ? 25
      : requestedBatchSize === 10
        ? 10
        : requestedBatchSize === 5
          ? 5
          : 1;

  const result =
    await BarcodeRecoveryBulkService.runBatch(
      batchSize,
    );

  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/admin/products/enrichment",
  );

  const query =
    new URLSearchParams({
      mode:
        "barcodeRecovery",

      barcodeProcessed:
        String(
          result.processedCount,
        ),

      barcodeSuccess:
        String(
          result.successCount,
        ),

      barcodeReview:
        String(
          result.reviewCount,
        ),

      barcodeNoCandidate:
        String(
          result.noCandidateCount,
        ),

      barcodeNoBarcode:
        String(
          result.noBarcodeCount,
        ),

      barcodeErrors:
        String(
          result.errorCount,
        ),

      barcodeRemaining:
        String(
          result.remainingCount,
        ),
    });

  redirect(
    `/admin/products/enrichment?${query.toString()}`,
  );
}