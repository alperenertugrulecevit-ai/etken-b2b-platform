import "server-only";

import { Prisma } from "@prisma/client";
import writeXlsxFile from "write-excel-file/node";

import { prisma } from "@/lib/prisma";
import type { ActiveWmsContext } from "@/modules/wms-context/types/wms-context.types";

export const REPORT_TIME_ZONE = "Europe/Istanbul";
export const REPORT_PAGE_SIZES = [25, 50, 100] as const;

export type PerformanceFilters = { from: Date; to: Date; waveId?: string; operatorId?: string };
export type ProductQueryFilters = { mode: "code" | "primaryBarcode" | "additionalBarcode" | "thm"; value: string; page?: number; pageSize?: number; includeReversed?: boolean };
export type DistributionFilters = { waveId: string; distributionId?: string; productId?: number };

type SummaryRow = { activeQuantity: bigint; activeTransactionCount: bigint; uniqueWaves: bigint; uniqueOperators: bigint; uniqueProducts: bigint; uniqueDistributions: bigint; uniqueHandlingUnits: bigint; firstOperation: Date | null; lastOperation: Date | null };

const scopeSql = (scope: ActiveWmsContext) => Prisma.sql`t."tenantId" = ${scope.tenantId} AND t."companyId" = ${scope.companyId} AND t."warehouseId" = ${scope.warehouseId}`;
const dateSql = (f: PerformanceFilters) => Prisma.sql`t."createdAt" >= ${f.from} AND t."createdAt" < ${f.to} ${f.waveId ? Prisma.sql`AND t."waveId" = ${f.waveId}` : Prisma.empty} ${f.operatorId ? Prisma.sql`AND t."operatorId" = ${f.operatorId}` : Prisma.empty}`;

export function formatIstanbul(value: Date | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { timeZone: REPORT_TIME_ZONE, dateStyle: "short", timeStyle: "medium" }).format(value) : "-";
}

export class ManualWaveReportingService {
  static async getPerformanceSummary(scope: ActiveWmsContext, filters: PerformanceFilters) {
    const [row] = await prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(t.quantity),0)::bigint AS "activeQuantity", COUNT(*)::bigint AS "activeTransactionCount",
        COUNT(DISTINCT t."waveId")::bigint AS "uniqueWaves", COUNT(DISTINCT t."operatorId")::bigint AS "uniqueOperators",
        COUNT(DISTINCT t."productId")::bigint AS "uniqueProducts", COUNT(DISTINCT t."distributionId")::bigint AS "uniqueDistributions", COUNT(DISTINCT t."handlingUnitId")::bigint AS "uniqueHandlingUnits",
        MIN(t."createdAt") AS "firstOperation", MAX(t."createdAt") AS "lastOperation"
      FROM "ManualSortingTransaction" t WHERE ${scopeSql(scope)} AND ${dateSql(filters)} AND t.status = 'ACTIVE'
    `);
    return { ...row, activeQuantity: Number(row.activeQuantity), activeTransactionCount: Number(row.activeTransactionCount), uniqueWaves: Number(row.uniqueWaves), uniqueOperators: Number(row.uniqueOperators), uniqueProducts: Number(row.uniqueProducts), uniqueDistributions: Number(row.uniqueDistributions), uniqueHandlingUnits: Number(row.uniqueHandlingUnits), averageUnitsPerTransaction: Number(row.activeTransactionCount) ? Number(row.activeQuantity) / Number(row.activeTransactionCount) : 0 };
  }

  static getHourlyPerformance(scope: ActiveWmsContext, filters: PerformanceFilters) {
    return prisma.$queryRaw<Array<{ localHour: Date; activeQuantity: bigint; reversedQuantity: bigint; activeTransactionCount: bigint; uniqueOperators: bigint; uniqueWaves: bigint; uniqueProducts: bigint }>>(Prisma.sql`
      SELECT date_trunc('hour', t."createdAt" AT TIME ZONE 'Europe/Istanbul') AS "localHour",
        COALESCE(SUM(t.quantity) FILTER (WHERE t.status='ACTIVE'),0)::bigint AS "activeQuantity",
        COALESCE(SUM(t.quantity) FILTER (WHERE t.status='REVERSED'),0)::bigint AS "reversedQuantity",
        COUNT(*) FILTER (WHERE t.status='ACTIVE')::bigint AS "activeTransactionCount",
        COUNT(DISTINCT t."operatorId") FILTER (WHERE t.status='ACTIVE')::bigint AS "uniqueOperators",
        COUNT(DISTINCT t."waveId") FILTER (WHERE t.status='ACTIVE')::bigint AS "uniqueWaves",
        COUNT(DISTINCT t."productId") FILTER (WHERE t.status='ACTIVE')::bigint AS "uniqueProducts"
      FROM "ManualSortingTransaction" t WHERE ${scopeSql(scope)} AND ${dateSql(filters)} GROUP BY 1 ORDER BY 1
    `);
  }

  static getOperatorPerformance(scope: ActiveWmsContext, filters: PerformanceFilters) {
    return prisma.$queryRaw<Array<{ operatorId: string; operatorName: string; activeQuantity: bigint; activeTransactionCount: bigint; uniqueWaves: bigint; uniqueProducts: bigint; uniqueHandlingUnits: bigint; firstOperation: Date; lastOperation: Date; elapsedSeconds: number }>>(Prisma.sql`
      SELECT t."operatorId", COALESCE(u."fullName",u.username) AS "operatorName", SUM(t.quantity)::bigint AS "activeQuantity", COUNT(*)::bigint AS "activeTransactionCount",
        COUNT(DISTINCT t."waveId")::bigint AS "uniqueWaves", COUNT(DISTINCT t."productId")::bigint AS "uniqueProducts", COUNT(DISTINCT t."handlingUnitId")::bigint AS "uniqueHandlingUnits",
        MIN(t."createdAt") AS "firstOperation", MAX(t."createdAt") AS "lastOperation", EXTRACT(EPOCH FROM MAX(t."createdAt")-MIN(t."createdAt"))::float AS "elapsedSeconds"
      FROM "ManualSortingTransaction" t JOIN "User" u ON u.id=t."operatorId"
      WHERE ${scopeSql(scope)} AND ${dateSql(filters)} AND t.status='ACTIVE' GROUP BY t."operatorId",u."fullName",u.username ORDER BY SUM(t.quantity) DESC
    `);
  }

  static async queryProductOperations(scope: ActiveWmsContext, filters: ProductQueryFilters) {
    const value = filters.value.trim();
    const pageSize = REPORT_PAGE_SIZES.includes((filters.pageSize ?? 50) as never) ? filters.pageSize ?? 50 : 50;
    const page = Math.max(1, filters.page ?? 1);
    let productId: number | undefined;
    let handlingUnitId: number | undefined;
    if (filters.mode === "thm") handlingUnitId = (await prisma.handlingUnit.findFirst({ where: { tenantId: scope.tenantId, companyId: scope.companyId, warehouseId: scope.warehouseId, barcode: value }, select: { id: true } }))?.id;
    else if (filters.mode === "additionalBarcode") productId = (await prisma.productBarcode.findFirst({ where: { tenantId: scope.tenantId, companyId: scope.companyId, barcode: value }, select: { productId: true } }))?.productId;
    else productId = (await prisma.product.findFirst({ where: { tenantId: scope.tenantId, companyId: scope.companyId, [filters.mode === "code" ? "code" : "barcode"]: value }, select: { id: true } }))?.id;
    if ((filters.mode === "thm" && !handlingUnitId) || (filters.mode !== "thm" && !productId)) return { rows: [], total: 0, page, pageSize, thmSummary: null };
    const filterSql = handlingUnitId ? Prisma.sql`AND (t."handlingUnitId"=${handlingUnitId} OR t."originalHandlingUnitId"=${handlingUnitId})` : Prisma.sql`AND t."productId"=${productId}`;
    const statusSql = filters.includeReversed ? Prisma.empty : Prisma.sql`AND t.status='ACTIVE'`;
    const [count] = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint count FROM "ManualSortingTransaction" t WHERE ${scopeSql(scope)} ${filterSql} ${statusSql}`);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT t.id,t.quantity,t.status,t."createdAt",t."reversedAt",t."reversalReason",p.code AS "productCode",p.barcode,p.name AS "productName",w."waveNo",
        d."distributionCode",d."customerCode",d."customerName",hu.barcode AS "thmBarcode",ohu.barcode AS "originalThmBarcode",
        COALESCE(u."fullName",u.username) AS operator,COALESCE(ru."fullName",ru.username) AS "reversedBy"
      FROM "ManualSortingTransaction" t JOIN "Product" p ON p.id=t."productId" JOIN "Wave" w ON w.id=t."waveId"
      JOIN "WaveDistribution" d ON d.id=t."distributionId" JOIN "HandlingUnit" hu ON hu.id=t."handlingUnitId" JOIN "HandlingUnit" ohu ON ohu.id=t."originalHandlingUnitId"
      JOIN "User" u ON u.id=t."operatorId" LEFT JOIN "User" ru ON ru.id=t."reversedById"
      WHERE ${scopeSql(scope)} ${filterSql} ${statusSql} ORDER BY t."createdAt" DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `);
    const thmSummary = handlingUnitId ? await this.getThmProductSummary(scope, handlingUnitId) : null;
    return { rows, total: Number(count.count), page, pageSize, thmSummary };
  }

  static async getThmProductSummary(scope: ActiveWmsContext, handlingUnitId: number) {
    const [row] = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT hu.barcode AS "thmBarcode",w."waveNo",d."distributionCode",d."customerName",COALESCE(SUM(t.quantity) FILTER(WHERE t.status='ACTIVE'),0)::bigint AS "activeQuantity",
        COUNT(*)::bigint AS "originalTransactionCount",COUNT(*) FILTER(WHERE t.status='ACTIVE')::bigint AS "activeTransactionCount",
        BOOL_OR(t."originalHandlingUnitId"<>t."handlingUnitId") AS "hasMergeHistory"
      FROM "ManualSortingTransaction" t JOIN "HandlingUnit" hu ON hu.id=${handlingUnitId} JOIN "Wave" w ON w.id=t."waveId" JOIN "WaveDistribution" d ON d.id=t."distributionId"
      WHERE ${scopeSql(scope)} AND (t."handlingUnitId"=${handlingUnitId} OR t."originalHandlingUnitId"=${handlingUnitId}) GROUP BY hu.barcode,w."waveNo",d."distributionCode",d."customerName" LIMIT 1`);
    return row ?? null;
  }

  static getWaveDistributionSummary(scope: ActiveWmsContext, filters: DistributionFilters) {
    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      WITH planned AS (SELECT l."distributionId",SUM(l."plannedQuantity")::bigint planned FROM "ManualSortingLine" l WHERE l."tenantId"=${scope.tenantId} AND l."companyId"=${scope.companyId} AND l."warehouseId"=${scope.warehouseId} AND l."waveId"=${filters.waveId} GROUP BY l."distributionId"),
      active AS (SELECT t."distributionId",SUM(t.quantity)::bigint distributed,COUNT(DISTINCT t."handlingUnitId")::bigint thms,MAX(t."createdAt") last_at FROM "ManualSortingTransaction" t WHERE ${scopeSql(scope)} AND t."waveId"=${filters.waveId} AND t.status='ACTIVE' GROUP BY t."distributionId")
      SELECT p.priority AS "priorityRank",d.id AS "distributionId",COALESCE(d."customerCode",d."distributionCode") AS "storeCode",d."customerName",planned,COALESCE(distributed,0)::bigint AS distributed,
        GREATEST(planned-COALESCE(distributed,0),0)::bigint AS remaining,CASE WHEN planned=0 THEN 100 ELSE LEAST(100,ROUND(COALESCE(distributed,0)*100.0/planned,2)) END AS completion,
        COALESCE(thms,0)::bigint AS "activeThmCount",last_at AS "lastOperation"
      FROM planned JOIN "WaveDistribution" d ON d.id=planned."distributionId" JOIN (SELECT "distributionId","priorityRank" priority FROM "ManualSortingTargetPriority" WHERE "tenantId"=${scope.tenantId} AND "companyId"=${scope.companyId} AND "warehouseId"=${scope.warehouseId} AND "waveId"=${filters.waveId}) p ON p."distributionId"=d.id LEFT JOIN active ON active."distributionId"=d.id
      WHERE (${filters.distributionId ?? null}::text IS NULL OR d.id=${filters.distributionId ?? null}) ORDER BY p.priority`);
  }

  static getWaveDistributionDetail(scope: ActiveWmsContext, filters: DistributionFilters) {
    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT p.id AS "productId",p.code AS "productCode",p.name AS "productName",l."distributionId",l."plannedQuantity"::bigint planned,
        COALESCE(SUM(t.quantity) FILTER(WHERE t.status='ACTIVE'),0)::bigint distributed,GREATEST(l."plannedQuantity"-COALESCE(SUM(t.quantity) FILTER(WHERE t.status='ACTIVE'),0),0)::bigint remaining,
        COUNT(DISTINCT t."handlingUnitId") FILTER(WHERE t.status='ACTIVE')::bigint AS "thmCount",STRING_AGG(DISTINCT hu.barcode,', ') FILTER(WHERE t.status='ACTIVE') AS "thmBarcodes"
      FROM "ManualSortingLine" l JOIN "Product" p ON p.id=l."productId" LEFT JOIN "ManualSortingTransaction" t ON t."sortingLineId"=l.id LEFT JOIN "HandlingUnit" hu ON hu.id=t."handlingUnitId"
      WHERE l."tenantId"=${scope.tenantId} AND l."companyId"=${scope.companyId} AND l."warehouseId"=${scope.warehouseId} AND l."waveId"=${filters.waveId}
        AND (${filters.distributionId ?? null}::text IS NULL OR l."distributionId"=${filters.distributionId ?? null}) AND (${filters.productId ?? null}::int IS NULL OR l."productId"=${filters.productId ?? null})
      GROUP BY p.id,p.code,p.name,l."distributionId",l."plannedQuantity" ORDER BY p.code`);
  }

  static async exportProductQuery(scope: ActiveWmsContext, filters: ProductQueryFilters) {
    const result = await this.queryProductOperations(scope, { ...filters, page: 1, pageSize: 100 });
    const exportRows = [...result.rows];
    for (let page = 2; exportRows.length < result.total; page += 1) {
      const next = await this.queryProductOperations(scope, { ...filters, page, pageSize: 100 });
      exportRows.push(...next.rows);
      if (!next.rows.length) break;
    }
    const headers = ["Ürün Kodu","Barkod","Ürün Adı","Dalga No","Mağaza","THM Barkodu","Orijinal THM","Durum","Miktar","Operatör","İşlem Tarihi","Geri Alma Tarihi","Geri Alan","Geri Alma Nedeni"];
    const data = [headers.map(value => ({ value, fontWeight: "bold" as const })), ...exportRows.map((r) => [r.productCode,r.barcode,r.productName,r.waveNo,r.customerName,r.thmBarcode,r.originalThmBarcode,r.status,r.quantity,r.operator,formatIstanbul(r.createdAt as Date),formatIstanbul(r.reversedAt as Date | null),r.reversedBy,r.reversalReason].map(value => ({ value: value == null ? "" : String(value) })) )];
    return writeXlsxFile(data).toBuffer();
  }

  static async exportDistributionSummary(scope: ActiveWmsContext, filters: DistributionFilters) {
    const [summary, detail] = await Promise.all([this.getWaveDistributionSummary(scope, filters), this.getWaveDistributionDetail(scope, filters)]);
    const rows = (header: string[], values: unknown[][]) => [header.map(value => ({ value, fontWeight: "bold" as const })), ...values.map(row => row.map(value => ({ value: value == null ? "" : String(value) })) )];
    return writeXlsxFile([{ data: rows(["Öncelik","Mağaza Kodu","Müşteri","Planlanan","Dağıtılan","Kalan","Tamamlanma %","Aktif THM","Son İşlem"],summary.map(r=>[r.priorityRank,r.storeCode,r.customerName,r.planned,r.distributed,r.remaining,r.completion,r.activeThmCount,formatIstanbul(r.lastOperation as Date|null)])), sheet: "Mağaza Özeti" }, { data: rows(["Ürün Kodu","Ürün","Planlanan","Dağıtılan","Kalan","THM Sayısı","THM Barkodları"],detail.map(r=>[r.productCode,r.productName,r.planned,r.distributed,r.remaining,r.thmCount,r.thmBarcodes])), sheet: "Ürün Detayı" }]).toBuffer();
  }
}
