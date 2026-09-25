import WmsTrackingReport from "@/components/admin/WmsTrackingReport";
export const dynamic="force-dynamic";export const revalidate=0;
export default function Page({searchParams}:{searchParams:Promise<{startDate?:string;endDate?:string;productCode?:string;orderNumber?:string;personnel?:string}>}){return <WmsTrackingReport kind="receiving" searchParams={searchParams}/>;}
