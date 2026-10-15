/**
 * Catalog activation rules used by the Excel importer.
 * An import must not override an existing product's activation state.
 */
export function shouldActivateNewImportedProduct(price: number | null): boolean {
  return price !== null && Number.isFinite(price) && price > 0;
}
