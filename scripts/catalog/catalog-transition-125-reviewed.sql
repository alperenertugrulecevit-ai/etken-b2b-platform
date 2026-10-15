-- Etken controlled catalog transition: 125 legacy products, preserve 784 OFIS26.
-- Run only with explicit confirmation, after private backup validation.
-- No historical rows deleted. ZIRHLI import deliberately excluded pending VAT/barcodes.
\if :{?confirm_catalog_transition}
\else
\echo 'ABORT: use -v confirm_catalog_transition=YES'
\quit 3
\endif
SELECT 1 / CASE WHEN :'confirm_catalog_transition' = 'YES' THEN 1 ELSE 0 END;
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(612341,20261014);
LOCK TABLE public."Product", public."CompetitorProduct", public."CompetitorSite" IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE etken_targets ON COMMIT DROP AS
SELECT p.id,p.code,p.barcode
FROM public."Product" p
WHERE p."isActive" AND p.stock=0 AND p."reservedStock"=0
AND NOT EXISTS (SELECT 1 FROM public."CompetitorProduct" cp JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId" WHERE cp."productId"=p.id AND cs.code='OFIS26');
DO $$
DECLARE n integer; protected integer; active_legacy integer; r record; cnt bigint;
BEGIN
 SELECT COUNT(*) INTO n FROM public."Product";
 SELECT COUNT(DISTINCT p.id) INTO protected FROM public."Product" p JOIN public."CompetitorProduct" cp ON cp."productId"=p.id JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId" WHERE cs.code='OFIS26' AND p."isActive";
 SELECT COUNT(*) INTO active_legacy FROM public."Product" p WHERE p."isActive" AND NOT EXISTS(SELECT 1 FROM public."CompetitorProduct" cp JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId" WHERE cp."productId"=p.id AND cs.code='OFIS26');
 IF n<>915 OR protected<>784 OR active_legacy<>125 OR (SELECT COUNT(*) FROM etken_targets)<>125 THEN
  RAISE EXCEPTION 'Inventory drift: total %, protected %, active legacy %, eligible %',n,protected,active_legacy,(SELECT COUNT(*) FROM etken_targets);
 END IF;
 -- Only these five explicitly audited metadata/history tables may have productId links.
 FOR r IN SELECT table_schema,table_name,column_name FROM information_schema.columns
 WHERE table_schema='public' AND column_name='productId'
 AND table_name NOT IN ('Product','CompetitorProduct','BarcodeRecoveryAttempt','ProductBarcode','ProductCompetitorCandidateDecision','ProductCompetitorMatchAttempt','ProductImageSource')
 LOOP
  EXECUTE format('SELECT COUNT(*) FROM %I.%I x JOIN etken_targets t ON x.%I=t.id',r.table_schema,r.table_name,r.column_name) INTO cnt;
  IF cnt<>0 THEN RAISE EXCEPTION 'Unexpected productId reference: %.% %',r.table_name,r.column_name,cnt; END IF;
 END LOOP;
 FOR r IN SELECT table_schema,table_name,column_name FROM information_schema.columns
 WHERE table_schema='public' AND column_name IN ('productCode','productBarcode') AND table_name<>'Product'
 LOOP
  EXECUTE format('SELECT COUNT(*) FROM %I.%I x JOIN etken_targets t ON x.%I=t.%I',r.table_schema,r.table_name,r.column_name,CASE WHEN r.column_name='productCode' THEN 'code' ELSE 'barcode' END) INTO cnt;
  IF cnt<>0 THEN RAISE EXCEPTION 'Unexpected code/barcode reference: %.% %',r.table_name,r.column_name,cnt; END IF;
 END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS public."CatalogTransitionAudit" (
 "batchId" text NOT NULL, "productId" integer NOT NULL, "productCode" text NOT NULL,
 "oldIsActive" boolean NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("batchId","productId")
);
INSERT INTO public."CatalogTransitionAudit"("batchId","productId","productCode","oldIsActive")
SELECT 'catalog_20261015_legacy',id,code,true FROM etken_targets;
-- Disable only non-OFIS26 mappings of targets; leave OFIS26 untouched.
UPDATE public."CompetitorProduct" cp SET "isActive"=false
FROM etken_targets t WHERE cp."productId"=t.id AND cp."isActive";
UPDATE public."Product" p SET "isActive"=false
FROM etken_targets t WHERE p.id=t.id AND p."isActive" AND p.stock=0 AND p."reservedStock"=0;
DO $$
DECLARE protected integer; inactive integer; mappings integer;
BEGIN
 SELECT COUNT(DISTINCT p.id) INTO protected FROM public."Product" p JOIN public."CompetitorProduct" cp ON cp."productId"=p.id JOIN public."CompetitorSite" cs ON cs.id=cp."competitorSiteId" WHERE cs.code='OFIS26' AND p."isActive";
 SELECT COUNT(*) INTO inactive FROM etken_targets t JOIN public."Product" p ON p.id=t.id WHERE NOT p."isActive";
 SELECT COUNT(*) INTO mappings FROM etken_targets t JOIN public."CompetitorProduct" cp ON cp."productId"=t.id WHERE cp."isActive";
 IF protected<>784 OR inactive<>125 OR mappings<>0 THEN
  RAISE EXCEPTION 'Postcondition failure: OFIS26 %, inactive %, active mappings %',protected,inactive,mappings;
 END IF;
END $$;
COMMIT;
SELECT COUNT(*) FILTER (WHERE "isActive") AS active_products,COUNT(*) FILTER (WHERE NOT "isActive") AS inactive_products FROM public."Product";
