/*
  WaveOrder ile Order arasında gerçek veritabanı ilişkisi kurulur.

  Güvenli geçiş sırası:
  1. orderId nullable olarak eklenir.
  2. Mevcut kayıtlar orderNumber üzerinden eşleştirilir.
  3. Eşleşmeyen kayıt varsa migration durdurulur.
  4. orderId zorunlu hale getirilir.
  5. Foreign key, unique constraint ve indexler oluşturulur.
*/

ALTER TABLE "WaveOrder"
ADD COLUMN "orderId" INTEGER;

/*
  Mevcut WaveOrder kayıtlarını Order tablosuyla
  orderNumber üzerinden eşleştir.
*/
UPDATE "WaveOrder" AS wo
SET "orderId" = o."id"
FROM "Order" AS o
WHERE wo."orderNumber" = o."orderNumber";

/*
  Eşleşmeyen kayıt varsa migration güvenli şekilde durur.
*/
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unmatched_count
  FROM "WaveOrder"
  WHERE "orderId" IS NULL;

  IF unmatched_count > 0 THEN
    RAISE EXCEPTION
      'Migration durduruldu: % adet WaveOrder kaydı Order tablosuyla eşleştirilemedi.',
      unmatched_count;
  END IF;
END $$;

/*
  Eski benzersizlik kuralını kaldır.
  Prisma tarafından üretilen constraint adı mevcut şemada
  genellikle WaveOrder_waveId_orderNumber_key biçimindedir.
*/
ALTER TABLE "WaveOrder"
DROP CONSTRAINT IF EXISTS "WaveOrder_waveId_orderNumber_key";

/*
  orderId artık zorunludur.
*/
ALTER TABLE "WaveOrder"
ALTER COLUMN "orderId" SET NOT NULL;

/*
  Aynı sipariş aynı Wave'e yalnızca bir kez eklenebilir.
*/
ALTER TABLE "WaveOrder"
ADD CONSTRAINT "wave_order_unique"
UNIQUE ("waveId", "orderId");

/*
  Order ilişkisi.
  Sipariş Wave'e bağlıyken silinemez.
*/
ALTER TABLE "WaveOrder"
ADD CONSTRAINT "WaveOrder_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "Order"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

/*
  Sipariş bazlı sorgular için index.
*/
CREATE INDEX "WaveOrder_orderId_idx"
ON "WaveOrder"("orderId");