import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body=await request.json();
    const barcode=String(body?.shippingHandlingUnitBarcode??"").trim().toUpperCase();
    if(!barcode) return NextResponse.json({success:false,message:"Sevk THM bulunamadı."},{status:400});
    const unit=await prisma.shippingHandlingUnit.findFirst({where:{handlingUnit:{barcode}},select:{id:true}});
    if(!unit) return NextResponse.json({success:false,message:"Sevk THM bulunamadı."},{status:404});
    await prisma.shippingHandlingUnit.update({where:{id:unit.id},data:{packingListPrintedAt:new Date(),packingListPrintCount:{increment:1},packingListLastPrinterCode:"SIMULATED-NO-PRINTER"}});
    return NextResponse.json({success:true,simulated:true});
  } catch(error) {
    return NextResponse.json({success:false,message:error instanceof Error?error.message:"Yazdırma durumu güncellenemedi."},{status:500});
  }
}