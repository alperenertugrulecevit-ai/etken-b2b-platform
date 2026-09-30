import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ManualWaveReportingService } from "@/modules/manual-wave/services/manual-wave-reporting.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

const day = (value: string | null, end = false) => {
  const date = value || new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const d = new Date(`${date}T00:00:00+03:00`);
  if (end) d.setUTCDate(d.getUTCDate() + 1);
  return d;
};

export async function GET(request: Request) {
  const user = await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
  const selector=await WmsContextService.getSelectorData(user.id,user.isAdminUser);
  const baseScope=selector.activeContext;
  if(!baseScope) throw new Error("Kullanabileceğiniz aktif şirket ve depo bulunamadı.");
  const q = new URL(request.url).searchParams;
  const allowed=selector.companies.find(x=>x.id===baseScope.companyId)?.warehouses??[];
  const requested=Number(q.get("warehouseId")??"");
  const warehouse=allowed.find(w=>w.id===requested)??allowed.find(w=>w.id===baseScope.warehouseId);
  if(!warehouse) throw new Error("Kullanabileceğiniz depo bulunamadı.");
  const scope={...baseScope,warehouseId:warehouse.id,warehouseCode:warehouse.code,warehouseName:warehouse.name,logisticsCenterCode:warehouse.logisticsCenterCode,logisticsCenterName:warehouse.logisticsCenterName};
  const from = q.get("from");
  const to = q.get("to") || from;
  const buffer = await ManualWaveReportingService.exportPerformance(scope, {
    from: day(from),
    to: day(to, true),
    waveId: q.get("waveId") || undefined,
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="manual-wave-dagitim-performansi.xlsx"',
    },
  });
}
