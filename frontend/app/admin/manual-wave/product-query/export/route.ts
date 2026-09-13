import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ManualWaveReportingService } from "@/modules/manual-wave/services/manual-wave-reporting.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

export async function GET(request:Request) { const user=await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW"); const scope=await WmsContextService.requireActiveContext(user.id,user.isAdminUser); const q=new URL(request.url).searchParams; const buffer=await ManualWaveReportingService.exportProductQuery(scope,{mode:(q.get("mode")||"code") as "code"|"primaryBarcode"|"additionalBarcode"|"thm",value:q.get("value")||"",includeReversed:q.get("includeReversed")==="1"}); return new Response(new Uint8Array(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":'attachment; filename="manuel-dalga-urun-sorgu.xlsx"'}}); }
