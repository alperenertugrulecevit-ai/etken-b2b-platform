-- Restore a previously audited deactivation batch.
-- Must be reviewed against current stock, orders, and supplier state before use.
-- Never run automatically. Requires explicit batch and approval.
-- Usage: psql -X -v ON_ERROR_STOP=1 -v confirm_catalog_restore=YES -f script.sql
\if :{?confirm_catalog_restore}
\else
\echo 'Missing explicit restore confirmation; aborting'
\quit 3
\endif
SELECT CASE WHEN :'confirm_catalog_restore' = 'YES' THEN 1 ELSE 1/0 END;
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(612341, 20261014);
LOCK TABLE public."Product" IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE audit_count int; matched_count int;
BEGIN
  SELECT COUNT(*) INTO audit_count
  FROM public."CatalogDeactivationAudit"
  WHERE "batchId"='catalog_20261014_non_ofis26';
  SELECT COUNT(*) INTO matched_count
  FROM public."CatalogDeactivationAudit" a
  JOIN public."Product" p ON p.id=a."productId" AND p.code=a."productCode"
  WHERE a."batchId"='catalog_20261014_non_ofis26';
  IF audit_count<>125 OR matched_count<>125 THEN
    RAISE EXCEPTION 'Restore aborted: audit % / matched % (expected 125)',
      audit_count, matched_count;
  END IF;
END $$;

UPDATE public."Product" p
SET "isActive"=a."oldIsActive"
FROM public."CatalogDeactivationAudit" a
WHERE a."batchId"='catalog_20261014_non_ofis26'
  AND p.id=a."productId" AND p.code=a."productCode";

DO $$
DECLARE restored_count int;
BEGIN
  SELECT COUNT(*) INTO restored_count
  FROM public."CatalogDeactivationAudit" a
  JOIN public."Product" p ON p.id=a."productId"
  WHERE a."batchId"='catalog_20261014_non_ofis26'
    AND p."isActive"=a."oldIsActive";
  IF restored_count<>125 THEN
    RAISE EXCEPTION 'Restore verification failed: %', restored_count;
  END IF;
END $$;
COMMIT;
