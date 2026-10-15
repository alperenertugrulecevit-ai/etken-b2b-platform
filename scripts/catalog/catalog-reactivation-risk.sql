-- Read-only preflight for catalog reactivation and supplier mapping.
-- Excel import updates preserve existing isActive; newly created products are
-- activated only when their imported price is positive and finite.
-- OFIS26 supplier sync still sets isActive=true for its mapped products.
-- This query does not prove which other scheduled jobs can change product state.
BEGIN TRANSACTION READ ONLY;

SELECT
  COUNT(*) FILTER (WHERE p."isActive") AS active_products,
  COUNT(*) FILTER (WHERE NOT p."isActive") AS inactive_products,
  COUNT(*) FILTER (WHERE p."isActive" AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
    WHERE cp."productId"=p.id AND cs.code='OFIS26'
  )) AS active_non_ofis26
FROM public."Product" p;

-- Show all supplier-site mappings for the 125 non-OFIS26 candidates.
-- Existing mapping to another source may be an automatic reactivation risk.
SELECT cs.code AS supplier_site,
       COUNT(DISTINCT p.id) AS candidate_products,
       COUNT(*) FILTER (WHERE cp."isActive") AS active_mappings
FROM public."Product" p
JOIN public."CompetitorProduct" cp ON cp."productId"=p.id
JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
WHERE p."isActive"
  AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" x
    JOIN public."CompetitorSite" s ON s.id=x."competitorSiteId"
    WHERE x."productId"=p.id AND s.code='OFIS26'
  )
GROUP BY cs.code
ORDER BY candidate_products DESC, cs.code;

-- Candidate products whose supplier string suggests a live integration
-- (human review; strings are not proof of an automated sync).
SELECT p.id, p.code, p.supplier
FROM public."Product" p
WHERE p."isActive"
  AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
    WHERE cp."productId"=p.id AND cs.code='OFIS26'
  )
ORDER BY p.supplier, p.id;

ROLLBACK;
