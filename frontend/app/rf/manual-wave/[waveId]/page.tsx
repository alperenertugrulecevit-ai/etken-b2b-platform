import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import ManualWaveSortingClient from "@/components/rf/ManualWaveSortingClient";
export default async function Page({ params }: { params: Promise<{ waveId: string }> }) { await AuthorizationService.requireRfAccess("WAVE_SORTING_EXECUTE"); const { waveId } = await params; return <ManualWaveSortingClient waveId={waveId} />; }
