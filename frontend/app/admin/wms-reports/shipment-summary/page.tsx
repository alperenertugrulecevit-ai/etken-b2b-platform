import WmsOrderReport from "@/components/admin/WmsOrderReport";
export const dynamic="force-dynamic";
export const revalidate=0;
export default function Page({searchParams}:{searchParams:Promise<{startDate?:string;endDate?:string;orderNumber?:string;status?:string}>}){return <WmsOrderReport kind="shipment-summary" searchParams={searchParams}/>;}
