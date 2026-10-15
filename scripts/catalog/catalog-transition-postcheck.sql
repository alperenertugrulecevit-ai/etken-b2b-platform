-- Read-only post-transition verification; safe to rerun.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH protected AS (
 SELECT DISTINCT p.id FROM public."Product" p
 JOIN public."CompetitorProduct" cp ON cp."productId"=p.id
 JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
 WHERE cs.code='OFIS26'
), batch AS (
 SELECT a."productId",a."productCode" FROM public."CatalogTransitionAudit" a
 WHERE a."batchId"='catalog_20261015_legacy'
)
SELECT (SELECT COUNT(*) FROM public."Product") AS total_products,
 (SELECT COUNT(*) FROM public."Product" WHERE "isActive") AS active_products,
 (SELECT COUNT(*) FROM public."Product" WHERE NOT "isActive") AS inactive_products,
 (SELECT COUNT(*) FROM protected) AS ofis26_mapped,
 (SELECT COUNT(*) FROM protected q JOIN public."Product" p ON p.id=q.id WHERE p."isActive") AS ofis26_active,
 (SELECT COUNT(*) FROM batch) AS batch_size,
 (SELECT COUNT(*) FROM batch b JOIN public."Product" p ON p.id=b."productId" AND p.code=b."productCode" WHERE NOT p."isActive") AS batch_inactive,
 (SELECT COUNT(*) FROM batch b JOIN public."CompetitorProduct" cp ON cp."productId"=b."productId" WHERE cp."isActive") AS batch_active_mappings,
 (SELECT COUNT(*) FROM batch b JOIN public."Product" p ON p.id=b."productId" WHERE p.stock<>0 OR p."reservedStock"<>0) AS batch_stock_risks,
 (SELECT COUNT(*) FROM batch b JOIN protected q ON q.id=b."productId") AS batch_ofis26_collisions;
-- Mapping states before the transition were not recorded per mapping.
-- This breakdown is diagnostic only; it must not be used to blindly restore mappings.
SELECT cs.code AS competitor_site, cp."isActive" AS current_mapping_active, count(*) AS mapping_count
FROM public."CatalogTransitionAudit" a
JOIN public."CompetitorProduct" cp ON cp."productId"=a."productId"
JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
WHERE a."batchId"='catalog_20261015_legacy'
GROUP BY cs.code, cp."isActive"
ORDER BY cs.code, cp."isActive";
ROLLBACK;
