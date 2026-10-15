-- Safe simulation ONLY. Does not persist any change (always ROLLBACK).
-- Requires a live production connection, but must be run by an authorized operator.
-- Never change ROLLBACK to COMMIT without reviewing the audit output and open tasks.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TEMP TABLE catalog_candidate_snapshot ON COMMIT DROP AS
SELECT p.id, p.code, p.barcode, p."isActive" AS previous_is_active
FROM public."Product" p
WHERE p."isActive"
  AND p.stock = 0
  AND p."reservedStock" = 0
  AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
    WHERE cp."productId"=p.id AND cs.code='OFIS26'
  );

-- Strict guard against changes since the last verified snapshot.
DO $$
DECLARE
  total_products integer;
  protected_count integer;
  candidate_count integer;
  risky_count integer;
BEGIN
  SELECT COUNT(*) INTO total_products FROM public."Product";
  SELECT COUNT(DISTINCT p.id) INTO protected_count
  FROM public."Product" p
  JOIN public."CompetitorProduct" cp ON cp."productId"=p.id
  JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
  WHERE cs.code='OFIS26' AND p."isActive";
  SELECT COUNT(*) INTO candidate_count FROM catalog_candidate_snapshot;
  SELECT COUNT(*) INTO risky_count
  FROM public."Product" p
  WHERE p."isActive" AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
    WHERE cp."productId"=p.id AND cs.code='OFIS26'
  ) AND (p.stock <> 0 OR p."reservedStock" <> 0);
  IF total_products <> 915 OR protected_count <> 784
     OR candidate_count <> 125 OR risky_count <> 0 THEN
    RAISE EXCEPTION 'Catalog drift: products=%, protected=%, candidates=%, stock_risks=%',
      total_products, protected_count, candidate_count, risky_count;
  END IF;
END $$;

-- Simulation demonstrates the candidate set and how many rows WOULD be updated.
-- No product data is changed by this script.
SELECT COUNT(*) AS eligible_for_review
FROM catalog_candidate_snapshot;

SELECT id, code, barcode, previous_is_active
FROM catalog_candidate_snapshot ORDER BY id;

ROLLBACK;
