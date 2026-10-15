-- Etken catalog safety audit (read-only). No UPDATE/DELETE/INSERT.
-- Execute with psql -X -v ON_ERROR_STOP=1 -f this-file.sql
-- Protect all products linked to OFIS26, even if the competitor link is inactive.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT
  COUNT(*) FILTER (WHERE ofis26) AS protected_ofis26,
  COUNT(*) FILTER (WHERE NOT ofis26 AND "isActive") AS active_non_ofis26,
  COUNT(*) FILTER (WHERE NOT ofis26 AND "isActive" AND stock <> 0) AS stock_risk,
  COUNT(*) FILTER (WHERE NOT ofis26 AND "isActive" AND "reservedStock" <> 0) AS reservation_risk
FROM (
  SELECT p.*, EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
    WHERE cp."productId"=p.id AND cs.code='OFIS26'
  ) AS ofis26
  FROM public."Product" p
) x;

-- Discover ALL direct productId references, not just five WMS tables.
-- Counts include historical rows; any nonzero count needs status-level review.
DO $$
DECLARE
  r record;
  total bigint;
  distinct_products bigint;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name='productId'
      AND table_name NOT IN ('Product', 'CompetitorProduct')
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'SELECT COUNT(*), COUNT(DISTINCT p.id)
       FROM %I.%I t JOIN public."Product" p ON p.id=t.%I
       WHERE p."isActive" AND NOT EXISTS (
         SELECT 1 FROM public."CompetitorProduct" cp
         JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
         WHERE cp."productId"=p.id AND cs.code=''OFIS26''
       )',
      r.table_schema, r.table_name, r.column_name
    ) INTO total, distinct_products;
    IF total > 0 THEN
      RAISE NOTICE '%: % linked rows, % distinct candidate products',
        r.table_name, total, distinct_products;
    END IF;
  END LOOP;
END $$;

-- Code/barcode-only references must be reviewed separately before any production mutation.
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name IN ('productCode','productBarcode')
ORDER BY table_name, column_name;

ROLLBACK;
