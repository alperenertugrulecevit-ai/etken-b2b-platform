"use server";
import { StockReturnReason } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { StockReturnService } from "@/modules/fulfillment/services/stock-return.service";

export type StockReturnLookupState={ok:boolean;message:string;order?:{orderNumber:string;customerName:string;status:string;items:{id:number;productCode:string;productBarcode:string;productName:string;quantity:number;cancelledQuantity:number;pickedQuantity:number;packedQuantity:number;remainingDemand:number}[];sources:{barcode:string;stage:string}[]}};
export type StockReturnScanState={ok:boolean;message:string;remainingDemand?:number};

const v=(fd:FormData,k:string)=>String(fd.get(k)??"").trim();
async function actor(){const p=await AuthorizationService.requireRfAccess("PICKING_EXECUTE");return{userId:p.id,displayName:p.employee?`${p.employee.firstName} ${p.employee.lastName}`:p.username,terminalCode:null};}

export async function lookupStockReturnOrder(_:StockReturnLookupState,fd:FormData):Promise<StockReturnLookupState>{
 try{await AuthorizationService.requireRfAccess("PICKING_EXECUTE");const r=await StockReturnService.lookupOrder(v(fd,"orderNumber"));return{ok:true,message:"Sipariş geri alma için hazır.",order:{orderNumber:r.orderNumber,customerName:r.customer.companyName,status:r.status,items:r.items.map(i=>({id:i.id,productCode:i.productCode,productBarcode:i.productBarcode,productName:i.productName,quantity:i.quantity,cancelledQuantity:i.cancelledQuantity,pickedQuantity:i.pickedQuantity,packedQuantity:i.packedQuantity,remainingDemand:i.remainingDemand})),sources:r.sources}};}
 catch(e){return{ok:false,message:e instanceof Error?e.message:"Sipariş sorgulanamadı."};}
}

export async function returnStockOne(_:StockReturnScanState,fd:FormData):Promise<StockReturnScanState>{
 try{
  const reason=v(fd,"reason") as StockReturnReason;
  if(!Object.values(StockReturnReason).includes(reason))throw new Error("Geçerli bir geri alma nedeni seçin.");
  const r=await StockReturnService.returnOne({orderNumber:v(fd,"orderNumber"),sourceBarcode:v(fd,"sourceBarcode"),productBarcode:v(fd,"productBarcode"),targetBarcode:v(fd,"targetBarcode"),targetLocationCode:v(fd,"targetLocationCode"),reason,actor:await actor()});
  revalidatePath("/rf/stock-return");revalidatePath("/admin/orders");revalidatePath("/admin/picking-operations");revalidatePath("/admin/stock/general");revalidatePath("/admin/stock/thm-movements");
  return{ok:true,message:`${r.productCode} - ${r.productName}: 1 adet ${r.targetBarcode} / ${r.targetLocationCode} stoğuna geri alındı. Aşama: ${r.stage}.`,remainingDemand:r.remainingDemand};
 }catch(e){console.error("RF stok geri alma hatası:",e);return{ok:false,message:e instanceof Error?e.message:"Stok geri alma tamamlanamadı."};}
}
