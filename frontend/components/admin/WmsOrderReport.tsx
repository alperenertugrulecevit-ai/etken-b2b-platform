import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ExcelTableExportButton from "@/components/admin/ExcelTableExportButton";
import ConfigurableReportTable from "@/components/admin/ConfigurableReportTable";

type ReportKind = "shipment-summary" | "shipment-detail" | "receipt-summary" | "receipt-detail";
type SearchParams = Promise<{ startDate?: string; endDate?: string; orderNumber?: string; status?: string; productCode?: string; companyCode?: string; companyName?: string; warehouseId?: string; movementType?: string }>;

function dateStart(value:string){ if(!value)return undefined; const d=new Date(`${value}T00:00:00+03:00`); return Number.isNaN(d.getTime())?undefined:d; }
function dateEnd(value:string){ if(!value)return undefined; const d=new Date(`${value}T23:59:59.999+03:00`); return Number.isNaN(d.getTime())?undefined:d; }
function fmtDate(value:Date){return new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"}).format(value)}
function n(value:number){return value.toLocaleString("tr-TR")}
type OperationalStatus="WAITING"|"PICKING"|"PICKED"|"APPROVED"|"DISPATCH_ISSUED"|"LOADED"|"SHIPPED"|"CANCELLED";
function operationalLabel(status:OperationalStatus){const m:Record<OperationalStatus,string>={WAITING:"Bekliyor",PICKING:"Toplanıyor",PICKED:"Toplandı",APPROVED:"Onaylandı",DISPATCH_ISSUED:"İrsaliye Kesildi",LOADED:"Araca Yüklendi",SHIPPED:"Sevk Edildi",CANCELLED:"İptal"};return m[status]}
function receiptStatus(status:string){const m:Record<string,string>={DRAFT:"Taslak",PENDING:"Bekliyor",APPROVED:"Mal Kabul Onaylandı",PARTIALLY_RECEIVED:"Kısmi Mal Kabul",RECEIVED:"Mal Kabul Tamamlandı",CANCELLED:"İptal"};return m[status]??status}

const meta:Record<ReportKind,{title:string;subtitle:string;orderLabel:string}> = {
 "shipment-summary":{title:"Sevk Sipariş Durum Raporu",subtitle:"Sevk siparişlerinin toplama ve paketleme ilerlemesini özet olarak izleyin.",orderLabel:"Sipariş No"},
 "shipment-detail":{title:"Sevk Sipariş Detay Raporu",subtitle:"Sevk siparişlerini ürün kalemi bazında toplama ve paketleme miktarlarıyla inceleyin.",orderLabel:"Sipariş No"},
 "receipt-summary":{title:"Giriş Sipariş Durum Raporu",subtitle:"Satın alma siparişlerinin mal kabul ilerlemesini özet olarak izleyin.",orderLabel:"Satın Alma Sipariş No"},
 "receipt-detail":{title:"Giriş Sipariş Detay Raporu",subtitle:"Satın alma siparişlerini ürün kalemi bazında sipariş ve mal kabul miktarlarıyla inceleyin.",orderLabel:"Satın Alma Sipariş No"},
};

function Filters({title,orderLabel,startDate,endDate,orderNumber,status,productCode,shipment,companyCode,companyName,warehouseId,movementType,warehouses}:{title:string;orderLabel:string;startDate:string;endDate:string;orderNumber:string;status:string;productCode:string;shipment:boolean;companyCode:string;companyName:string;warehouseId:string;movementType:string;warehouses:{id:number;code:string;name:string}[]}){
 return <><div><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-slate-500">{metaTitle(title)}</p></div>
 <form className="mt-7 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-9">
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tarih Başlangıç</span><input name="startDate" type="date" defaultValue={startDate} className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tarih Bitiş</span><input name="endDate" type="date" defaultValue={endDate} className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">{orderLabel}</span><input name="orderNumber" defaultValue={orderNumber} placeholder="Sipariş no ara" className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Ürün Kodu</span><input name="productCode" defaultValue={productCode} placeholder="Ürün kodu ara" className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">{shipment?"Firma Kodu":"Tedarikçi Kodu"}</span><input name="companyCode" defaultValue={companyCode} placeholder={shipment?"Firma kodu":"Tedarikçi kodu"} className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">{shipment?"Firma İsmi":"Tedarikçi Adı"}</span><input name="companyName" defaultValue={companyName} placeholder={shipment?"Firma ismi":"Tedarikçi adı"} className="w-full rounded-xl border border-slate-300 p-3"/></label>
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Depo Kodu</span><select name="warehouseId" defaultValue={warehouseId} className="w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Tüm Depolar</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></label>
   {!shipment&&<label><span className="mb-2 block text-sm font-semibold text-slate-700">Hareket Tipi</span><select name="movementType" defaultValue={movementType} className="w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Tüm Girişler</option><option value="PURCHASE_RECEIPT">Mal Kabul</option><option value="SALE_RETURN">İade Girişi</option></select></label>}<label><span className="mb-2 block text-sm font-semibold text-slate-700">Durum</span><select name="status" defaultValue={status} className="w-full rounded-xl border border-slate-300 bg-white p-3">
    <option value="">Tüm Durumlar</option><option value="OPEN">Açık Siparişler</option>
    {shipment?<><option value="WAITING">Bekliyor</option><option value="PICKING">Toplanıyor</option><option value="PICKED">Toplandı</option><option value="APPROVED">Onaylandı</option><option value="DISPATCH_ISSUED">İrsaliye Kesildi</option><option value="LOADED">Araca Yüklendi</option><option value="SHIPPED">Sevk Edildi</option><option value="CANCELLED">İptal</option></>:<><option value="DRAFT">Taslak</option><option value="PENDING">Bekliyor</option><option value="APPROVED">Mal Kabul Onaylandı</option><option value="PARTIALLY_RECEIVED">Kısmi Mal Kabul</option><option value="RECEIVED">Mal Kabul Tamamlandı</option><option value="CANCELLED">İptal</option></>}
   </select></label>
   <div className="flex items-end gap-2"><button className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800">Raporu Getir</button><a href="?" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Temizle</a></div>
  </div>
 </form></>
}
function metaTitle(title:string){const item=Object.values(meta).find(x=>x.title===title);return item?.subtitle??""}
const th="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700";
const td="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700";

export default async function WmsOrderReport({kind,searchParams}:{kind:ReportKind;searchParams:SearchParams}){
 const q=await searchParams; const startDate=q.startDate?.trim()??""; const endDate=q.endDate?.trim()??""; const orderNumber=q.orderNumber?.trim()??""; const status=q.status?.trim()??""; const productCode=q.productCode?.trim()??""; const companyCode=q.companyCode?.trim()??""; const companyName=q.companyName?.trim()??""; const warehouseId=q.warehouseId?.trim()??""; const movementType=q.movementType?.trim()??""; const warehouseIdNumber=Number(warehouseId); const selectedWarehouseId=Number.isInteger(warehouseIdNumber)&&warehouseIdNumber>0?warehouseIdNumber:null;
 const from=dateStart(startDate), to=dateEnd(endDate), m=meta[kind];
 const shipment=kind.startsWith("shipment");
 const warehouses=await prisma.warehouse.findMany({where:{isActive:true,code:{not:"KYP001"}},orderBy:{code:"asc"},select:{id:true,code:true,name:true}});
 if(shipment){
  const where:Prisma.OrderWhereInput={};
  if(selectedWarehouseId)where.fulfillmentWarehouseId=selectedWarehouseId;
  if(orderNumber)where.orderNumber={contains:orderNumber,mode:"insensitive"};
  if(productCode)where.items={some:{productCode:{contains:productCode,mode:"insensitive"}}};
  if(companyCode)where.customer={customerCode:{contains:companyCode,mode:"insensitive"}};
  if(companyName)where.customer={companyName:{contains:companyName,mode:"insensitive"}};
  if(status==="CANCELLED")where.status="CANCELLED"; else if(status==="SHIPPED")where.status={not:"CANCELLED"};
  if(from||to)where.orderDate={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
  const itemWhere=productCode?{productCode:{contains:productCode,mode:"insensitive" as const}}:undefined;
  const queriedOrders=await prisma.order.findMany({where,orderBy:{orderDate:"desc"},include:{fulfillmentWarehouse:{select:{code:true}},customer:{select:{customerCode:true,companyName:true}},shippingAddress:{select:{city:true,district:true}},waveOrders:{select:{waveId:true}},carrier:{select:{code:true,name:true}},items:{where:itemWhere,orderBy:{id:"asc"},include:{product:{select:{barcode:true}},pickingShortages:{where:{status:"ACTIVE"},select:{quantity:true,reason:true}}}},fulfillment:true,shippingHandlingUnitOrders:{include:{shippingHandlingUnit:{select:{status:true,closedAt:true,shippedAt:true,boxType:true,desi:true,dispatchDocument:{select:{status:true,issuedAt:true}}}}}}}});
  const withOperationalStatus=queriedOrders.map(o=>{
   const ordered=o.items.reduce((s,x)=>s+Math.max(0,x.quantity-x.cancelledQuantity),0),picked=o.items.reduce((s,x)=>s+x.pickedQuantity,0),packed=o.items.reduce((s,x)=>s+x.packedQuantity,0);
   const units=o.shippingHandlingUnitOrders.map(x=>x.shippingHandlingUnit);
   let operationalStatus:OperationalStatus="WAITING";
   if(o.status==="CANCELLED")operationalStatus="CANCELLED";
   else if(units.some(x=>x.status==="SHIPPED"||Boolean(x.shippedAt))||o.fulfillment?.shippingStatus==="COMPLETED")operationalStatus="SHIPPED";
   else if(o.fulfillment?.shippingStatus==="IN_PROGRESS"||o.fulfillment?.shippingStartedAt)operationalStatus="LOADED";
   else if(units.some(x=>x.dispatchDocument?.status==="ISSUED"||Boolean(x.dispatchDocument?.issuedAt)))operationalStatus="DISPATCH_ISSUED";
   else if(ordered>0&&packed>=ordered&&units.length>0&&units.every(x=>x.status==="CLOSED"||x.status==="READY_TO_SHIP"||x.status==="SHIPPED"||Boolean(x.closedAt)))operationalStatus="APPROVED";
   else if(ordered>0&&picked>=ordered)operationalStatus="PICKED";
   else if(picked>0||o.fulfillment?.pickingStatus==="IN_PROGRESS"||o.fulfillment?.pickingStartedAt)operationalStatus="PICKING";
   return {...o,operationalStatus};
  });
  const orders=withOperationalStatus.filter(o=>status==="OPEN"?o.operationalStatus!=="SHIPPED"&&o.operationalStatus!=="CANCELLED":status?o.operationalStatus===status:true);
  if(kind==="shipment-summary"){
   const rows=orders.map(o=>{const originalOrdered=o.items.reduce((s,x)=>s+x.quantity,0),cancelled=o.items.reduce((s,x)=>s+x.cancelledQuantity,0),ordered=Math.max(0,originalOrdered-cancelled),picked=o.items.reduce((s,x)=>s+x.pickedQuantity,0),shortage=o.items.reduce((s,x)=>s+x.pickingShortages.reduce((a,r)=>a+r.quantity,0),0),packed=o.items.reduce((s,x)=>s+x.packedQuantity,0);const units=o.shippingHandlingUnitOrders.map(x=>x.shippingHandlingUnit);const boxTypes=[...new Set(units.map(x=>x.boxType).filter((x):x is string=>Boolean(x)))].join(", ")||"-";const desis=[...new Set(units.map(x=>x.desi).filter((x):x is number=>x!==null))].join(", ")||"-";return{o,originalOrdered,cancelled,ordered,picked,shortage,packed,boxTypes,desis}});
   const totals=rows.reduce((a,r)=>({originalOrdered:a.originalOrdered+r.originalOrdered,cancelled:a.cancelled+r.cancelled,ordered:a.ordered+r.ordered,picked:a.picked+r.picked,shortage:a.shortage+r.shortage,packed:a.packed+r.packed}),{originalOrdered:0,cancelled:0,ordered:0,picked:0,shortage:0,packed:0});
   return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-shipment-summary-table" fileName="sevk-siparis-durum-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} movementType={movementType} warehouses={warehouses}/>
    <ConfigurableReportTable storageKey="etken:columns:shipment-summary-report" tableId="wms-shipment-summary-table" minWidth="1500px" emptyText="Filtreye uygun sevk siparişi bulunamadı."
     columns={[{key:"date",label:"Sipariş Oluşturma Tarihi"},{key:"warehouseCode",label:"Depo Kodu"},{key:"orderNo",label:"Sipariş No"},{key:"orderType",label:"Sipariş Tipi"},{key:"pickingType",label:"Toplama Tipi"},{key:"lineCount",label:"Kalem Sayısı"},{key:"city",label:"İl"},{key:"district",label:"İlçe"},{key:"companyCode",label:"Firma Kodu"},{key:"companyName",label:"Firma İsmi"},{key:"carrier",label:"Nakliyeci"},{key:"boxType",label:"Koli Tipi"},{key:"desi",label:"Desi"},{key:"originalOrdered",label:"Sipariş Miktarı"},{key:"cancelled",label:"İptal Miktarı"},{key:"ordered",label:"Net Sipariş Miktarı"},{key:"picked",label:"Toplama Miktarı"},{key:"shortage",label:"Eksik Miktar"},{key:"pickingDiff",label:"Toplama Farkı"},{key:"packed",label:"Paketleme Miktarı"},{key:"packingDiff",label:"Paketleme Farkı"},{key:"status",label:"Sipariş Durumu"}]}
     rows={rows.map(({o,originalOrdered,cancelled,ordered,picked,shortage,packed,boxTypes,desis})=>({key:o.id,cells:{date:fmtDate(o.orderDate),warehouseCode:o.fulfillmentWarehouse?.code??"-",orderNo:o.orderNumber,orderType:({ECOMMERCE:"E-Ticaret",STORE:"Mağaza",CUSTOMER:"Müşteri",OTHER:"Diğer"} as Record<string,string>)[o.orderType]??o.orderType,pickingType:o.waveOrders.length?"Wave":"Sipariş Bazlı",lineCount:o.items.length,city:o.shippingAddress?.city??"-",district:o.shippingAddress?.district??"-",companyCode:o.customer.customerCode,companyName:o.customer.companyName,carrier:o.carrier?`${o.carrier.code} - ${o.carrier.name}`:"-",boxType:boxTypes,desi:desis,originalOrdered:n(originalOrdered),cancelled:n(cancelled),ordered:n(ordered),picked:n(picked),shortage:n(shortage),pickingDiff:n(Math.max(ordered-picked-shortage,0)),packed:n(packed),packingDiff:n(Math.max(picked-packed,0)),status:operationalLabel(o.operationalStatus)}}))}
     totalRow={{date:"Toplam",orderNo:`${n(rows.length)} sipariş`,originalOrdered:n(totals.originalOrdered),cancelled:n(totals.cancelled),ordered:n(totals.ordered),picked:n(totals.picked),shortage:n(totals.shortage),pickingDiff:n(Math.max(totals.ordered-totals.picked-totals.shortage,0)),packed:n(totals.packed),packingDiff:n(Math.max(totals.picked-totals.packed,0))}}/>
    </section>
  }
  const rows=orders.flatMap(o=>{const units=o.shippingHandlingUnitOrders.map(x=>x.shippingHandlingUnit);const boxTypes=[...new Set(units.map(x=>x.boxType).filter((x):x is string=>Boolean(x)))].join(", ")||"-";const desis=[...new Set(units.map(x=>x.desi).filter((x):x is number=>x!==null))].join(", ")||"-";return o.items.map((x,index)=>({o,x,line:index+1,boxTypes,desis}))});
  const totals=rows.reduce((a,r)=>({originalOrdered:a.originalOrdered+r.x.quantity,cancelled:a.cancelled+r.x.cancelledQuantity,ordered:a.ordered+Math.max(0,r.x.quantity-r.x.cancelledQuantity),picked:a.picked+r.x.pickedQuantity,packed:a.packed+r.x.packedQuantity}),{originalOrdered:0,cancelled:0,ordered:0,picked:0,packed:0});
  return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-shipment-detail-table" fileName="sevk-siparis-detay-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} movementType={movementType} warehouses={warehouses}/>
   <ConfigurableReportTable storageKey="etken:columns:shipment-detail-report" tableId="wms-shipment-detail-table" minWidth="1700px" emptyText="Filtreye uygun sevk sipariş detayı bulunamadı."
    columns={[{key:"date",label:"Sipariş Oluşturma Tarihi"},{key:"warehouseCode",label:"Depo Kodu"},{key:"orderNo",label:"Sipariş No"},{key:"barcode",label:"Barkod"},{key:"orderType",label:"Sipariş Tipi"},{key:"pickingType",label:"Toplama Tipi"},{key:"city",label:"İl"},{key:"district",label:"İlçe"},{key:"companyCode",label:"Firma Kodu"},{key:"companyName",label:"Firma İsmi"},{key:"carrier",label:"Nakliyeci"},{key:"boxType",label:"Koli Tipi"},{key:"desi",label:"Desi"},{key:"line",label:"Kalem No"},{key:"productCode",label:"Ürün Kodu"},{key:"productName",label:"Ürün Tanımı"},{key:"originalOrdered",label:"Sipariş Miktarı"},{key:"cancelled",label:"İptal Miktarı"},{key:"ordered",label:"Net Sipariş Miktarı"},{key:"picked",label:"Toplama Miktarı"},{key:"pickingDiff",label:"Toplama Farkı"},{key:"packed",label:"Paketleme Miktarı"},{key:"packingDiff",label:"Paketleme Farkı"},{key:"status",label:"Sipariş Durumu"}]}
    rows={rows.map(({o,x,line,boxTypes,desis})=>({key:x.id,cells:{date:fmtDate(o.orderDate),warehouseCode:o.fulfillmentWarehouse?.code??"-",orderNo:o.orderNumber,barcode:x.product.barcode??"-",orderType:({ECOMMERCE:"E-Ticaret",STORE:"Mağaza",CUSTOMER:"Müşteri",OTHER:"Diğer"} as Record<string,string>)[o.orderType]??o.orderType,pickingType:o.waveOrders.length?"Wave":"Sipariş Bazlı",city:o.shippingAddress?.city??"-",district:o.shippingAddress?.district??"-",companyCode:o.customer.customerCode,companyName:o.customer.companyName,carrier:o.carrier?`${o.carrier.code} - ${o.carrier.name}`:"-",boxType:boxTypes,desi:desis,line,productCode:x.productCode,productName:x.productName,originalOrdered:n(x.quantity),cancelled:n(x.cancelledQuantity),ordered:n(Math.max(0,x.quantity-x.cancelledQuantity)),picked:n(x.pickedQuantity),pickingDiff:n(Math.max(x.quantity-x.cancelledQuantity-x.pickedQuantity,0)),packed:n(x.packedQuantity),packingDiff:n(Math.max(x.pickedQuantity-x.packedQuantity,0)),status:operationalLabel(o.operationalStatus)}}))}
    totalRow={{date:"Toplam",line:n(rows.length),originalOrdered:n(totals.originalOrdered),cancelled:n(totals.cancelled),ordered:n(totals.ordered),picked:n(totals.picked),pickingDiff:n(Math.max(totals.ordered-totals.picked,0)),packed:n(totals.packed),packingDiff:n(Math.max(totals.picked-totals.packed,0))}}/>
   </section>
 }
 const purchaseWhere:Prisma.PurchaseOrderWhereInput={};
 if(selectedWarehouseId)purchaseWhere.stockMovements={some:{warehouseId:selectedWarehouseId}};
 if(orderNumber)purchaseWhere.purchaseNumber={contains:orderNumber,mode:"insensitive"};
 if(productCode)purchaseWhere.items={some:{productCode:{contains:productCode,mode:"insensitive"}}};
 if(companyCode)purchaseWhere.supplier={taxNumber:{contains:companyCode,mode:"insensitive"}};
 if(companyName)purchaseWhere.supplier={name:{contains:companyName,mode:"insensitive"}};
 if(status==="OPEN")purchaseWhere.status={notIn:["RECEIVED","CANCELLED"]}; else if(status)purchaseWhere.status=status as Prisma.EnumPurchaseOrderStatusFilter;
 if(from||to)purchaseWhere.orderDate={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
 const receiptItemWhere=productCode?{productCode:{contains:productCode,mode:"insensitive" as const}}:undefined;

 const includePurchases=movementType!=="SALE_RETURN";
 const includeReturns=movementType!=="PURCHASE_RECEIPT";
 const purchases=includePurchases?await prisma.purchaseOrder.findMany({where:purchaseWhere,orderBy:{orderDate:"desc"},include:{supplier:{select:{name:true,taxNumber:true}},stockMovements:{where:{warehouseId:{not:null}},select:{warehouse:{select:{code:true}}}},items:{where:receiptItemWhere,orderBy:{id:"asc"}}}}):[];

 const returnWhere:Prisma.ReturnOrderWhereInput={};
 if(orderNumber)returnWhere.returnNumber={contains:orderNumber,mode:"insensitive"};
 if(productCode)returnWhere.items={some:{productCode:{contains:productCode,mode:"insensitive"}}};
 if(companyCode)returnWhere.originalOrder={customer:{customerCode:{contains:companyCode,mode:"insensitive"}}};
 if(companyName)returnWhere.originalOrder={customer:{companyName:{contains:companyName,mode:"insensitive"}}};
 if(status==="OPEN")returnWhere.status={in:["OPEN","PARTIALLY_RECEIVED"]}; else if(status&&["OPEN","PARTIALLY_RECEIVED","RECEIVED","CANCELLED"].includes(status))returnWhere.status=status as Prisma.EnumReturnOrderStatusFilter;
 if(from||to)returnWhere.createdAt={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
 const returnsRaw=includeReturns?await prisma.returnOrder.findMany({where:returnWhere,orderBy:{createdAt:"desc"},include:{originalOrder:{select:{customer:{select:{customerCode:true,companyName:true}}}},items:{where:receiptItemWhere,orderBy:{createdAt:"asc"}}}}):[];
 const returnNumbers=returnsRaw.map(r=>r.returnNumber);
 const returnLogs=returnNumbers.length?await prisma.wmsOperationLog.findMany({where:{module:"RF_RETURN_RECEIVING",operationType:"RECEIVING"},select:{warehouseId:true,warehouseCode:true,metadata:true}}):[];
 const returnWarehouseMap=new Map<string,Set<string>>();
 const returnWarehouseIdMap=new Map<string,Set<number>>();
 for(const log of returnLogs){
  const meta=log.metadata&&typeof log.metadata==="object"&&!Array.isArray(log.metadata)?log.metadata as Record<string,unknown>:null;
  const rn=typeof meta?.returnNumber==="string"?meta.returnNumber:null;
  if(!rn||!returnNumbers.includes(rn))continue;
  if(log.warehouseCode){const set=returnWarehouseMap.get(rn)??new Set<string>();set.add(log.warehouseCode);returnWarehouseMap.set(rn,set)}
  if(log.warehouseId){const set=returnWarehouseIdMap.get(rn)??new Set<number>();set.add(log.warehouseId);returnWarehouseIdMap.set(rn,set)}
 }
 const returns=selectedWarehouseId?returnsRaw.filter(r=>returnWarehouseIdMap.get(r.returnNumber)?.has(selectedWarehouseId)):returnsRaw;
 const returnStatus=(v:string)=>({OPEN:"Açık",PARTIALLY_RECEIVED:"Kısmi İade Girişi",RECEIVED:"İade Girişi Tamamlandı",CANCELLED:"İptal"} as Record<string,string>)[v]??v;

 const summaryRows=[
  ...purchases.map(o=>{const warehouseCode=[...new Set(o.stockMovements.map(m=>m.warehouse?.code).filter((x):x is string=>Boolean(x)))].join(", ")||"-";const ordered=o.items.reduce((s,x)=>s+x.orderedQuantity,0),received=o.items.reduce((s,x)=>s+x.receivedQuantity,0);return{key:`P-${o.id}`,date:o.orderDate,warehouseCode,orderNo:o.purchaseNumber,deliveryNoteNumber:o.deliveryNoteNumber??"-",deliveryNoteDate:o.deliveryNoteDate,companyCode:o.supplier.taxNumber??"-",companyName:o.supplier.name,ordered,received,status:receiptStatus(o.status),movementType:"Mal Kabul"}}),
  ...returns.map(o=>{const warehouseCode=[...(returnWarehouseMap.get(o.returnNumber)??new Set<string>())].join(", ")||"-";const ordered=o.items.reduce((s,x)=>s+x.expectedQuantity,0),received=o.items.reduce((s,x)=>s+x.receivedQuantity,0);return{key:`R-${o.id}`,date:o.createdAt,warehouseCode,orderNo:o.returnNumber,deliveryNoteNumber:o.deliveryNoteNumber,deliveryNoteDate:o.deliveryNoteDate,companyCode:o.originalOrder.customer.customerCode,companyName:o.originalOrder.customer.companyName,ordered,received,status:returnStatus(o.status),movementType:"İade Girişi"}})
 ].sort((a,b)=>b.date.getTime()-a.date.getTime());

 if(kind==="receipt-summary"){
  const totals=summaryRows.reduce((a,r)=>({ordered:a.ordered+r.ordered,received:a.received+r.received}),{ordered:0,received:0});
  return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-receipt-summary-table" fileName="giris-siparis-durum-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} movementType={movementType} warehouses={warehouses}/>
   <ConfigurableReportTable storageKey="etken:columns:receipt-summary-report" tableId="wms-receipt-summary-table" minWidth="1350px" emptyText="Filtreye uygun giriş siparişi bulunamadı."
    columns={[{key:"date",label:"Sipariş Oluşturma Tarihi"},{key:"movementType",label:"Hareket Tipi"},{key:"warehouseCode",label:"Depo Kodu"},{key:"orderNo",label:"Giriş Sipariş No"},{key:"deliveryNoteNumber",label:"İrsaliye No"},{key:"deliveryNoteDate",label:"İrsaliye Tarihi"},{key:"companyCode",label:"Firma / Tedarikçi Kodu"},{key:"companyName",label:"Firma / Tedarikçi Adı"},{key:"ordered",label:"Sipariş Miktarı"},{key:"received",label:"Giriş Miktarı"},{key:"diff",label:"Giriş Farkı"},{key:"status",label:"Sipariş Durumu"}]}
    rows={summaryRows.map(r=>({key:r.key,cells:{date:fmtDate(r.date),movementType:r.movementType,warehouseCode:r.warehouseCode,orderNo:r.orderNo,deliveryNoteNumber:r.deliveryNoteNumber,deliveryNoteDate:r.deliveryNoteDate?fmtDate(r.deliveryNoteDate):"-",companyCode:r.companyCode,companyName:r.companyName,ordered:n(r.ordered),received:n(r.received),diff:n(Math.max(r.ordered-r.received,0)),status:r.status}}))}
    totalRow={{date:"Toplam",orderNo:n(summaryRows.length),ordered:n(totals.ordered),received:n(totals.received),diff:n(Math.max(totals.ordered-totals.received,0))}}/>
  </section>
 }

 const detailRows=[
  ...purchases.flatMap(o=>{const warehouseCode=[...new Set(o.stockMovements.map(m=>m.warehouse?.code).filter((x):x is string=>Boolean(x)))].join(", ")||"-";return o.items.map((x,index)=>({key:`P-${x.id}`,date:o.orderDate,movementType:"Mal Kabul",warehouseCode,orderNo:o.purchaseNumber,deliveryNoteNumber:o.deliveryNoteNumber??"-",deliveryNoteDate:o.deliveryNoteDate,companyCode:o.supplier.taxNumber??"-",companyName:o.supplier.name,line:index+1,productCode:x.productCode,productName:x.productName,ordered:x.orderedQuantity,received:x.receivedQuantity,status:receiptStatus(o.status)}))}),
  ...returns.flatMap(o=>{const warehouseCode=[...(returnWarehouseMap.get(o.returnNumber)??new Set<string>())].join(", ")||"-";return o.items.map((x,index)=>({key:`R-${x.id}`,date:o.createdAt,movementType:"İade Girişi",warehouseCode,orderNo:o.returnNumber,deliveryNoteNumber:o.deliveryNoteNumber,deliveryNoteDate:o.deliveryNoteDate,companyCode:o.originalOrder.customer.customerCode,companyName:o.originalOrder.customer.companyName,line:index+1,productCode:x.productCode,productName:x.productName,ordered:x.expectedQuantity,received:x.receivedQuantity,status:returnStatus(o.status)}))})
 ].sort((a,b)=>b.date.getTime()-a.date.getTime());
 const totals=detailRows.reduce((a,r)=>({ordered:a.ordered+r.ordered,received:a.received+r.received}),{ordered:0,received:0});
 return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-receipt-detail-table" fileName="giris-siparis-detay-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} movementType={movementType} warehouses={warehouses}/>
  <ConfigurableReportTable storageKey="etken:columns:receipt-detail-report" tableId="wms-receipt-detail-table" minWidth="1550px" emptyText="Filtreye uygun giriş sipariş detayı bulunamadı."
   columns={[{key:"date",label:"Sipariş Oluşturma Tarihi"},{key:"movementType",label:"Hareket Tipi"},{key:"warehouseCode",label:"Depo Kodu"},{key:"orderNo",label:"Giriş Sipariş No"},{key:"deliveryNoteNumber",label:"İrsaliye No"},{key:"deliveryNoteDate",label:"İrsaliye Tarihi"},{key:"companyCode",label:"Firma / Tedarikçi Kodu"},{key:"companyName",label:"Firma / Tedarikçi Adı"},{key:"line",label:"Kalem No"},{key:"productCode",label:"Ürün Kodu"},{key:"productName",label:"Ürün Tanımı"},{key:"ordered",label:"Sipariş Miktarı"},{key:"received",label:"Giriş Miktarı"},{key:"diff",label:"Giriş Farkı"},{key:"status",label:"Sipariş Durumu"}]}
   rows={detailRows.map(r=>({key:r.key,cells:{date:fmtDate(r.date),movementType:r.movementType,warehouseCode:r.warehouseCode,orderNo:r.orderNo,deliveryNoteNumber:r.deliveryNoteNumber,deliveryNoteDate:r.deliveryNoteDate?fmtDate(r.deliveryNoteDate):"-",companyCode:r.companyCode,companyName:r.companyName,line:r.line,productCode:r.productCode,productName:r.productName,ordered:n(r.ordered),received:n(r.received),diff:n(Math.max(r.ordered-r.received,0)),status:r.status}}))}
   totalRow={{date:"Toplam",line:n(detailRows.length),ordered:n(totals.ordered),received:n(totals.received),diff:n(Math.max(totals.ordered-totals.received,0))}}/>
 </section>
}
