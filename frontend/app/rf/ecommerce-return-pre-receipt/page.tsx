import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import RFEcommerceReturnPreReceiptForm from "@/components/rf/RFEcommerceReturnPreReceiptForm";

export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{late?:string}>}){
  const params=await searchParams;
  await AuthorizationService.requireRfAccess("RECEIVING_EXECUTE");
  const [warehouses,carriers,recent]=await Promise.all([
    prisma.warehouse.findMany({where:{isActive:true},orderBy:{code:"asc"},select:{id:true,code:true,name:true}}),
    prisma.shippingCarrier.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{id:true,code:true,name:true}}),
    prisma.ecommerceReturnPreReceipt.findMany({take:10,orderBy:{receivedAt:"desc"},select:{preReceiptNumber:true,scannedCode:true,mode:true,matchStatus:true,outcome:true,receivedAt:true,carrier:{select:{name:true}}}}),
  ]);
  return <section>
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">E-Ticaret İade</p><h1 className="text-2xl font-black">Kargo İade Ön Kabul</h1></div><Link href="/rf" className="rounded-xl border px-4 py-2 font-bold">RF Menü</Link></div>
    <RFEcommerceReturnPreReceiptForm lateDetected={params.late==="1"} warehouses={warehouses} carriers={carriers} recent={recent.map(x=>({...x,receivedAt:x.receivedAt.toISOString()}))}/>
  </section>;
}
