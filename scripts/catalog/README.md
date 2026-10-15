# Etken catalog transition — controlled rollout

## Confirmed from production read-only checks (2026-10-14)
- 915 Product rows; 784 linked to OFIS26 and active.
- 131 not linked to OFIS26: 125 active, 6 inactive.
- All 125 active non-OFIS26 products had zero `Product.stock` and `Product.reservedStock` in the last check.
- No linked `OrderItem` or `PurchaseOrderItem` rows were found for those candidates.
- No linked `PickingRecord`, `HandlingUnitItem`, `ShippingHandlingUnitItem`, `WarehouseLocationStock`, or `WarehouseProductStock` rows were found.
- Backup: `etken_katalog_oncesi_20261014_174235.dump` in private Cloud Storage, size 101098498 bytes, local and cloud SHA-256 identical. A test restore has NOT been performed.
- These observations can become stale; repeat checks immediately before any write.

## Review before deactivation
1. Run `scripts/catalog/catalog-safety-audit.sql` on the production DB in a controlled, authenticated environment (not via a publicly reachable endpoint).
2. Review **all** productId references, not just the five WMS tables. Historical references are not automatically blockers, but open tasks are.
3. Review productCode/productBarcode-only references and status columns; a zero productId count is not sufficient.
4. Check for background supplier syncs that might reactivate products.
5. Confirm protected OFIS26 set and candidate counts on the same transaction snapshot.
6. Prepare a reversible ID/code/isActive snapshot and use a single guarded transaction. No DELETE. Abort if expected counts or stock/reservations change.
7. Confirm storefront, WMS, and sync behavior after deactivation.

## Zırhlı 161-row staging — NOT production-ready
- Source: Android catalog snapshot; 161 rows, 20% markup in the source's price units.
- Missing verified manufacturer barcode, tax treatment, stock availability, product ID and image usage rights.
- `Product.price` in Etken is **VAT-exclusive**. Do not write VAT-inclusive supplier prices into it without resolving tax treatment.
- Temporary source keys are **not** manufacturer barcodes or stable supplier SKUs.
- Do not auto-activate products with unknown stock or publish unlicensed images.
- No supplier-authorized live price feed exists; do not implement six-hour automated scraping as if it were an official integration.
- Avoid creating separate carton price tiers; preserve the captured sale-unit label.
- Verify category mapping and uniqueness against the live Product table before import.

## Deployment status
This branch includes read-only audits, a rollback-only simulation, a **manual write-capable SQL draft** (catalog-deactivation-controlled.sql), a manual restore draft, and an Excel importer activation fix with unit tests. The write-capable scripts have **not** been executed or production-validated. No production database writes, deployments, or product imports have been executed from this branch. Review PRODUCTION-CHECKLIST.md before considering any write.
