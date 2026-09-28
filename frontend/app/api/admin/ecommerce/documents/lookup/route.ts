import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  const body=await request.json(); const orderNumber=String(body?.orderNumber??"").trim().toUpperCase();
  if(!orderNumber)return NextResponse.json({success:false,message:"Sipariş numarası gerekli."},{status:400});
  const link=await prisma.shippingHandlingUnitOrder.findFirst({where:{orderNumber},orderBy:{createdAt:"desc"},select:{shippingHandlingUnit:{select:{handlingUnit:{select:{barcode:true}},packingListPrintedAt:true,packingListPrintCount:true,dispatchDocument:{select:{dispatchNumber:true,status:true}},orders:{select:{orderNumber:true,order:{select:{customerNote:true}}}}}}}});
  if(!link)return NextResponse.json({success:false,message:"Bu sipariş için Sevk THM bulunamadı."},{status:404});
  const u=link.shippingHandlingUnit; const gift=u.orders.some(x=>Boolean(x.order.customerNote?.trim()));
  return NextResponse.json({success:true,orderNumber,shippingHandlingUnitBarcode:u.handlingUnit.barcode,dispatchNumber:u.dispatchDocument?.dispatchNumber??null,dispatchStatus:u.dispatchDocument?.status??null,hasGiftNote:gift,packingListPrintedAt:u.packingListPrintedAt,packingListPrintCount:u.packingListPrintCount});
 }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Sipariş bulunamadı."},{status:500});}
}