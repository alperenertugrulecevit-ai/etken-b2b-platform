import bwipjs from "bwip-js/node";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function createBarcodeSvg(code:string){return bwipjs.toSVG({bcid:"code128",text:code,scale:2,height:8,includetext:false,paddingwidth:1,paddingheight:1,backgroundcolor:"FFFFFF"});}
export default async function Page({searchParams}:{searchParams:Promise<{id?:string|string[];layout?:string}>}){
 await AuthorizationService.requirePermission("SHIPPING_EXECUTE");
 const p=await searchParams,ids=Array.isArray(p.id)?p.id:p.id?[p.id]:[];
 const rows=ids.length?await prisma.shippingBoxDefinition.findMany({where:{id:{in:ids},tenantId:"tenant_etken",companyId:"company_etken_office"},orderBy:{code:"asc"}}):[];
 const labels=rows.map(r=>({...r,barcode:createBarcodeSvg(r.code)}));
 const thermal=p.layout==="thermal";
 return <html><head><title>Koli Barkodu Yazdır</title><style dangerouslySetInnerHTML={{__html:`@page{size:${thermal?"50mm 30mm":"A4"};margin:${thermal?"0":"8mm"}}*{box-sizing:border-box}body{font-family:Arial;margin:0}.toolbar{padding:10px;background:#eee}.sheet{display:grid;grid-template-columns:${thermal?"50mm":"repeat(4,50mm)"};gap:2mm}.label{width:50mm;height:30mm;border:1px solid #aaa;padding:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-inside:avoid}.code{font-size:12px;font-weight:800}.meta{font-size:9px}.barcode{width:46mm;height:10mm}.barcode svg{width:100%;height:100%}@media print{.toolbar{display:none}.sheet{gap:0}.label{border:0}}`}}/></head><body><div className="toolbar"><b>Yazdırmak için Ctrl+P kullanın</b></div><div className="sheet">{labels.map(r=><div className="label" key={r.id}><div className="code">{r.code}</div><div className="barcode" dangerouslySetInnerHTML={{__html:r.barcode}}/><div className="meta">{r.boxType} · {r.dimensions} · Desi {r.desi}</div></div>)}</div></body></html>;
}