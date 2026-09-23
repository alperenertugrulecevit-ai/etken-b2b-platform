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
  const scope = await WmsContextService.requireActiveContext(user.id, user.isAdminUser);
  const q = new URL(request.url).searchParams;
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
