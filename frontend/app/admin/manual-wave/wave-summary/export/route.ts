import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
function csv(v:unknown){const s=String(v??"");return '"'+s.replaceAll('"','""')+'"'}
export async function GET(req:NextRequest){
 await AuthorizationService.requirePermission("MANUAL_WAVE_REPORT_VIEW");
 const q=req.nextUrl.searchParams,wave=q.get("wave")||""; const w=await prisma.wave.findFirst({where:{OR:[{id:wave},{waveNo:wave}]},select:{waveNo:true,distributions:{select:{sequenceNumber:true,customerCode:true,customerName:true,lines:{select:{plannedQuantity:true,packedQuantity:true,product:{select:{productCode:true,barcode:true,name:true}}}}}}}});
 if(!w)return new NextResponse("Wave bulunamadı",{status:404});
 const store=(q.get("store")||"").toLowerCase(),product=(q.get("product")||"").toLowerCase(),barcode=(q.get("barcode")||"").toLowerCase(),name=(q.get("name")||"").toLowerCase();
 const rows=w.distributions.flatMap(d=>d.lines.filter(l=>l.plannedQuantity>l.packedQuantity).map(l=>({storeCode:d.customerCode||String(d.sequenceNumber),storeName:d.customerName,productCode:l.product.productCode,barcode:l.product.barcode||"",name:l.product.name,planned:l.plannedQuantity,packed:l.packedQuantity,remaining:l.plannedQuantity-l.packedQuantity}))).filter(r=>(!store||r.storeCode.toLowerCase().includes(store))&&(!product||r.productCode.toLowerCase().includes(product))&&(!barcode||r.barcode.toLowerCase().includes(barcode))&&(!name||r.name.toLowerCase().includes(name)));
 const head=["Mağaza Kodu","Mağaza İsmi","Ürün Kodu","Barkod","Ürün Tanımı","Sipariş","Dağıtılan","Kalan"]; const body=[head,...rows.map(r=>[r.storeCode,r.storeName,r.productCode,r.barcode,r.name,r.planned,r.packed,r.remaining])].map(r=>r.map(csv).join(";")).join("\r\n");
 return new NextResponse("\uFEFF"+body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="wave-${w.waveNo}-kalan-detay.csv"`}});
}