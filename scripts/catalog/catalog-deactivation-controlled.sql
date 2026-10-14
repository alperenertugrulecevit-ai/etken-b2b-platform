-- Controlled, reversible deactivation of ONLY unlinked, zero-stock non-OFIS26 products.
-- NOT executed against production. Run ONLY after operational approval and audit.
-- This script is deliberately conservative: ANY productId reference in a non-exempt
-- table, including historical rows, stops the operation.
-- Prerequisite: verified private DB backup and reviewed catalog-safety-audit.sql.
-- Run in psql with: -X -v ON_ERROR_STOP=1 -v confirm_catalog_deactivation=YES
\if :{?confirm_catalog_deactivation}
\else
\echo 'Missing explicit confirmation variable; aborting'
\quit 3
\endif
SELECT CASE WHEN :'confirm_catalog_deactivation' = 'YES' THEN 1 ELSE 1/0 END;

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Serialize concurrent catalog operations. Other writers must honor this lock
-- or be caught by row locks and guard checks.
SELECT pg_advisory_xact_lock(612341, 20261014);
LOCK TABLE public."Product", public."CompetitorProduct", public."CompetitorSite"
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE catalog_deactivation_targets ON COMMIT DROP AS
SELECT p.id, p.code, p.barcode
FROM public."Product" p
WHERE p."isActive" = true
  AND p.stock = 0 AND p."reservedStock" = 0
  AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id = cp."competitorSiteId"
    WHERE cp."productId" = p.id AND cs.code = 'OFIS26'
  );

DO $$
DECLARE
  total_count int;
  protected_count int;
  target_count int;
  risky_count int;
  r record;
  linked_count bigint;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public."Product";
  SELECT COUNT(DISTINCT p.id) INTO protected_count
  FROM public."Product" p
  JOIN public."CompetitorProduct" cp ON cp."productId"=p.id
  JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
  WHERE cs.code='OFIS26' AND p."isActive";
  SELECT COUNT(*) INTO target_count FROM catalog_deactivation_targets;
  SELECT COUNT(*) INTO risky_count FROM public."Product" p
  WHERE p."isActive"
    AND (p.stock <> 0 OR p."reservedStock" <> 0)
    AND NOT EXISTS (
      SELECT 1 FROM public."CompetitorProduct" cp
      JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
      WHERE cp."productId"=p.id AND cs.code='OFIS26'
    );
  IF total_count <> 915 OR protected_count <> 784
     OR target_count <> 125 OR risky_count <> 0 THEN
    RAISE EXCEPTION 'Counts changed: total %, OFIS26 %, targets %, risky %',
      total_count, protected_count, target_count, risky_count;
  END IF;

  -- Historical references block by design. Review and explicitly adapt only
  -- after verifying the operational status of each referencing record.
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name='productId'
      AND table_name NOT IN ('Product','CompetitorProduct')
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I.%I x JOIN catalog_deactivation_targets t ON x.%I=t.id',
      r.table_schema, r.table_name, r.column_name
    ) INTO linked_count;
    IF linked_count <> 0 THEN
      RAISE EXCEPTION 'Blocked: %.% has % linked rows', r.table_schema, r.table_name, linked_count;
    END IF;
  END LOOP;

  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name IN ('productCode','productBarcode')
  LOOP
    IF r.column_name = 'productCode' THEN
      EXECUTE format(
        'SELECT COUNT(*) FROM %I.%I x JOIN catalog_deactivation_targets t ON x.%I=t.code',
        r.table_schema, r.table_name, r.column_name
      ) INTO linked_count;
    ELSE
      EXECUTE format(
        'SELECT COUNT(*) FROM %I.%I x JOIN catalog_deactivation_targets t ON x.%I=t.barcode',
        r.table_schema, r.table_name, r.column_name
      ) INTO linked_count;
    END IF;
    IF linked_count <> 0 THEN
      RAISE EXCEPTION 'Blocked: %.% has % code/barcode matches', r.table_schema, r.table_name, linked_count;
    END IF;
  END LOOP;
END $$;

-- Persist a reversible snapshot in the same transaction.
CREATE TABLE IF NOT EXISTS public."CatalogDeactivationAudit" (
  "batchId" text NOT NULL,
  "productId" integer NOT NULL,
  "productCode" text NOT NULL,
  "oldIsActive" boolean NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("batchId", "productId")
);
INSERT INTO public."CatalogDeactivationAudit"
  ("batchId","productId","productCode","oldIsActive")
SELECT 'catalog_20261014_non_ofis26', id, code, true
FROM catalog_deactivation_targets;

UPDATE public."Product" p SET "isActive" = false
FROM catalog_deactivation_targets t
WHERE p.id=t.id AND p."isActive"=true
  AND p.stock=0 AND p."reservedStock"=0
  AND NOT EXISTS (
    SELECT 1 FROM public."CompetitorProduct" cp
    JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
    WHERE cp."productId"=p.id AND cs.code='OFIS26'
  );

DO $$
DECLARE deactivated int; protected_active int;
BEGIN
  SELECT COUNT(*) INTO deactivated
  FROM public."CatalogDeactivationAudit" a
  JOIN public."Product" p ON p.id=a."productId"
  WHERE a."batchId"='catalog_20261014_non_ofis26' AND NOT p."isActive";
  SELECT COUNT(DISTINCT p.id) INTO protected_active
  FROM public."Product" p
  JOIN public."CompetitorProduct" cp ON cp."productId"=p.id
  JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId"
  WHERE cs.code='OFIS26' AND p."isActive";
  IF deactivated <> 125 OR protected_active <> 784 THEN
    RAISE EXCEPTION 'Postcondition failed: deactivated %, OFIS26 active %',
      deactivated, protected_active;
  END IF;
END $$;
COMMIT;

-- This only toggles isActive. Sync services can reactivate later unless separately guarded.
