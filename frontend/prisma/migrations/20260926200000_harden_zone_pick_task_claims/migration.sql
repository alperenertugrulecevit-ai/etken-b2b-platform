CREATE UNIQUE INDEX "ZonePickTask_one_active_per_user" ON "ZonePickTask"("claimedByUserId") WHERE "claimedByUserId" IS NOT NULL AND "status" IN ('CLAIMED','IN_PROGRESS');
CREATE UNIQUE INDEX "ZonePickTask_direct_order_zone_unique" ON "ZonePickTask"("orderId","zoneId") WHERE "waveId" IS NULL;
