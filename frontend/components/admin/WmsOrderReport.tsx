import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ExcelTableExportButton from "@/components/admin/ExcelTableExportButton";
import ConfigurableReportTable from "@/components/admin/ConfigurableReportTable";

type ReportKind = "shipment-summary" | "shipment-detail" | "receipt-summary" | "receipt-detail";
type SearchParams = Promise<{ startDate?: string; endDate?: string; orderNumber?: string; status?: string; productCode?: string; companyCode?: string; companyName?: string; warehouseId?: string }>;

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

function Filters({title,orderLabel,startDate,endDate,orderNumber,status,productCode,shipment,companyCode,companyName,warehouseId,warehouses}:{title:string;orderLabel:string;startDate:string;endDate:string;orderNumber:string;status:string;productCode:string;shipment:boolean;companyCode:string;companyName:string;warehouseId:string;warehouses:{id:number;code:string;name:string}[]}){
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
   <label><span className="mb-2 block text-sm font-semibold text-slate-700">Durum</span><select name="status" defaultValue={status} className="w-full rounded-xl border border-slate-300 bg-white p-3">
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
 const q=await searchParams; const startDate=q.startDate?.trim()??""; const endDate=q.endDate?.trim()??""; const orderNumber=q.orderNumber?.trim()??""; const status=q.status?.trim()??""; const productCode=q.productCode?.trim()??""; const companyCode=q.companyCode?.trim()??""; const companyName=q.companyName?.trim()??""; const warehouseId=q.warehouseId?.trim()??""; const warehouseIdNumber=Number(warehouseId); const selectedWarehouseId=Number.isInteger(warehouseIdNumber)&&warehouseIdNumber>0?warehouseIdNumber:null;
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
   const ordered=o.items.reduce((s,x)=>s+x.quantity,0),picked=o.items.reduce((s,x)=>s+x.pickedQuantity,0),packed=o.items.reduce((s,x)=>s+x.packedQuantity,0);
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
   const rows=orders.map(o=>{const ordered=o.items.reduce((s,x)=>s+x.quantity,0),picked=o.items.reduce((s,x)=>s+x.pickedQuantity,0),shortage=o.items.reduce((s,x)=>s+x.pickingShortages.reduce((a,r)=>a+r.quantity,0),0),packed=o.items.reduce((s,x)=>s+x.packedQuantity,0);const units=o.shippingHandlingUnitOrders.map(x=>x.shippingHandlingUnit);const boxTypes=[...new Set(units.map(x=>x.boxType).filter((x):x is string=>Boolean(x)))].join(", ")||"-";const desis=[...new Set(units.map(x=>x.desi).filter((x):x is number=>x!==null))].join(", ")||"-";return{o,ordered,picked,shortage,packed,boxTypes,desis}});
   const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.ordered,picked:a.picked+r.picked,shortage:a.shortage+r.shortage,packed:a.packed+r.packed}),{ordered:0,picked:0,shortage:0,packed:0});
   return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-shipment-summary-table" fileName="sevk-siparis-durum-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} warehouses={warehouses}/>
    <ConfigurableReportTable storageKey="etken:columns:shipment-summary-report" tableId="wms-shipment-summary-table" minWidth="1500px" emptyText="Filtreye uygun sevk siparişi bulunamadı."
     columns={[{key:"date",label:"Sipariş Oluşturma Tarihi"},{key:"warehouseCode",label:"Depo Kodu"},{key:"orderNo",label:"Sipariş No"},{key:"orderType",label:"Sipariş Tipi"},{key:"pickingType",label:"Toplama Tipi"},{key:"lineCount",label:"Kalem Sayısı"},{key:"city",label:"İl"},{key:"district",label:"İlçe"},{key:"companyCode",label:"Firma Kodu"},{key:"companyName",label:"Firma İsmi"},{key:"carrier",label:"Nakliyeci"},{key:"boxType",label:"Koli Tipi"},{key:"desi",label:"Desi"},{key:"ordered",label:"Sipariş Miktarı"},{key:"picked",label:"Toplama Miktarı"},{key:"shortage",label:"Eksik Miktar"},{key:"pickingDiff",label:"Toplama Farkı"},{key:"packed",label:"Paketleme Miktarı"},{key:"packingDiff",label:"Paketleme Farkı"},{key:"status",label:"Sipariş Durumu"}]}
     rows={rows.map(({o,ordered,picked,shortage,packed,boxTypes,desis})=>({key:o.id,cells:{date:fmtDate(o.orderDate),warehouseCode:o.fulfillmentWarehouse?.code??"-",orderNo:o.orderNumber,orderType:({ECOMMERCE:"E-Ticaret",STORE:"Mağaza",CUSTOMER:"Müşteri",OTHER:"Diğer"} as Record<string,string>)[o.orderType]??o.orderType,pickingType:o.waveOrders.length?"Wave":"Sipariş Bazlı",lineCount:o.items.length,city:o.shippingAddress?.city??"-",district:o.shippingAddress?.district??"-",companyCode:o.customer.customerCode,companyName:o.customer.companyName,carrier:o.carrier?`${o.carrier.code} - ${o.carrier.name}`:"-",boxType:boxTypes,desi:desis,ordered:n(ordered),picked:n(picked),shortage:n(shortage),pickingDiff:n(Math.max(ordered-picked-shortage,0)),packed:n(packed),packingDiff:n(Math.max(picked-packed,0)),status:operationalLabel(o.operationalStatus)}}))}
     totalRow={{date:"Toplam",orderNo:`${n(rows.length)} sipariş`,ordered:n(totals.ordered),picked:n(totals.picked),shortage:n(totals.shortage),pickingDiff:n(Math.max(totals.ordered-totals.picked-totals.shortage,0)),packed:n(totals.packed),packingDiff:n(Math.max(totals.picked-totals.packed,0))}}/>
    </section>
  }
  const rows=orders.flatMap(o=>{const units=o.shippingHandlingUnitOrders.map(x=>x.shippingHandlingUnit);const boxTypes=[...new Set(units.map(x=>x.boxType).filter((x):x is string=>Boolean(x)))].join(", ")||"-";const desis=[...new Set(units.map(x=>x.desi).filter((x):x is number=>x!==null))].join(", ")||"-";return o.items.map((x,index)=>({o,x,line:index+1,boxTypes,desis}))});
  const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.x.quantity,picked:a.picked+r.x.pickedQuantity,packed:a.packed+r.x.packedQuantity}),{ordered:0,picked:0,packed:0});
  return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-shipment-detail-table" fileName="sevk-siparis-detay-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} warehouses={warehouses}/>
   <ConfigurableReportTable storageKey="etken:columns:shipment-detail-report" tableId="wms-shipment-detail-table" minWidth="1700px" emptyText="Filtreye uygun sevk sipariş detayı bulunamadı."
    columns={[{key:"date",label:"Sipariş Oluşturma Tarihi"},{key:"warehouseCode",label:"Depo Kodu"},{key:"orderNo",label:"Sipariş No"},{key:"barcode",label:"Barkod"},{key:"orderType",label:"Sipariş Tipi"},{key:"pickingType",label:"Toplama Tipi"},{key:"city",label:"İl"},{key:"district",label:"İlçe"},{key:"companyCode",label:"Firma Kodu"},{key:"companyName",label:"Firma İsmi"},{key:"carrier",label:"Nakliyeci"},{key:"boxType",label:"Koli Tipi"},{key:"desi",label:"Desi"},{key:"line",label:"Kalem No"},{key:"productCode",label:"Ürün Kodu"},{key:"productName",label:"Ürün Tanımı"},{key:"ordered",label:"Sipariş Miktarı"},{key:"picked",label:"Toplama Miktarı"},{key:"pickingDiff",label:"Toplama Farkı"},{key:"packed",label:"Paketleme Miktarı"},{key:"packingDiff",label:"Paketleme Farkı"},{key:"status",label:"Sipariş Durumu"}]}
    rows={rows.map(({o,x,line,boxTypes,desis})=>({key:x.id,cells:{date:fmtDate(o.orderDate),warehouseCode:o.fulfillmentWarehouse?.code??"-",orderNo:o.orderNumber,barcode:x.product.barcode??"-",orderType:({ECOMMERCE:"E-Ticaret",STORE:"Mağaza",CUSTOMER:"Müşteri",OTHER:"Diğer"} as Record<string,string>)[o.orderType]??o.orderType,pickingType:o.waveOrders.length?"Wave":"Sipariş Bazlı",city:o.shippingAddress?.city??"-",district:o.shippingAddress?.district??"-",companyCode:o.customer.customerCode,companyName:o.customer.companyName,carrier:o.carrier?`${o.carrier.code} - ${o.carrier.name}`:"-",boxType:boxTypes,desi:desis,line,productCode:x.productCode,productName:x.productName,ordered:n(x.quantity),picked:n(x.pickedQuantity),pickingDiff:n(Math.max(x.quantity-x.pickedQuantity,0)),packed:n(x.packedQuantity),packingDiff:n(Math.max(x.pickedQuantity-x.packedQuantity,0)),status:operationalLabel(o.operationalStatus)}}))}
    totalRow={{date:"Toplam",line:n(rows.length),ordered:n(totals.ordered),picked:n(totals.picked),pickingDiff:n(Math.max(totals.ordered-totals.picked,0)),packed:n(totals.packed),packingDiff:n(Math.max(totals.picked-totals.packed,0))}}/>
   </section>
 }
 const where:Prisma.PurchaseOrderWhereInput={};
 if(selectedWarehouseId)where.stockMovements={some:{warehouseId:selectedWarehouseId}};
 if(orderNumber)where.purchaseNumber={contains:orderNumber,mode:"insensitive"};
 if(productCode)where.items={some:{productCode:{contains:productCode,mode:"insensitive"}}};
 if(companyCode)where.supplier={taxNumber:{contains:companyCode,mode:"insensitive"}};
 if(companyName)where.supplier={name:{contains:companyName,mode:"insensitive"}};
 if(status==="OPEN")where.status={notIn:["RECEIVED","CANCELLED"]}; else if(status)where.status=status as Prisma.EnumPurchaseOrderStatusFilter;
 if(from||to)where.orderDate={...(from?{gte:from}:{}),...(to?{lte:to}:{})};
 const receiptItemWhere=productCode?{productCode:{contains:productCode,mode:"insensitive" as const}}:undefined;
 const orders=await prisma.purchaseOrder.findMany({where,orderBy:{orderDate:"desc"},include:{supplier:{select:{name:true,taxNumber:true}},stockMovements:{where:{warehouseId:{not:null}},select:{warehouse:{select:{code:true}}}},items:{where:receiptItemWhere,orderBy:{id:"asc"}}}});
 if(kind==="receipt-summary"){
  const rows=orders.map(o=>{const warehouseCode=[...new Set(o.stockMovements.map(m=>m.warehouse?.code).filter((x):x is string=>Boolean(x)))].join(", ")||"-";const ordered=o.items.reduce((s,x)=>s+x.orderedQuantity,0),received=o.items.reduce((s,x)=>s+x.receivedQuantity,0);return{o,warehouseCode,ordered,received}});
  const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.ordered,received:a.received+r.received}),{ordered:0,received:0});
  return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-receipt-summary-table" fileName="giris-siparis-durum-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} warehouses={warehouses}/>
   <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table id="wms-receipt-summary-table" className="w-full min-w-[1000px]"><thead><tr>{["Sipariş Oluşturma Tarihi","Depo Kodu","Satın Alma Sipariş No","İrsaliye No","İrsaliye Tarihi","Tedarikçi Kodu","Tedarikçi Adı","Sipariş Miktarı","Giriş Miktarı","Giriş Farkı","Sipariş Durumu"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead>
   <tbody>{rows.map(({o,warehouseCode,ordered,received})=><tr key={o.id} className="hover:bg-slate-50"><td className={td}>{fmtDate(o.orderDate)}</td><td className={td}>{warehouseCode}</td><td className={td+" font-bold text-blue-900"}>{o.purchaseNumber}</td><td className={td}>{o.deliveryNoteNumber??"-"}</td><td className={td}>{o.deliveryNoteDate?fmtDate(o.deliveryNoteDate):"-"}</td><td className={td}>{o.supplier.taxNumber??"-"}</td><td className={td}>{o.supplier.name}</td><td className={td}>{n(ordered)}</td><td className={td}>{n(received)}</td><td className={td}>{n(Math.max(ordered-received,0))}</td><td className={td}>{receiptStatus(o.status)}</td></tr>)}
   {rows.length===0?<tr><td colSpan={11} className="p-10 text-center text-slate-500">Filtreye uygun giriş siparişi bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>{n(rows.length)} sipariş</td><td className={td}>-</td><td className={td}>-</td><td className={td}>{n(totals.ordered)}</td><td className={td}>{n(totals.received)}</td><td className={td}>{n(Math.max(totals.ordered-totals.received,0))}</td><td className={td}>-</td></tr>}</tbody></table></div></section>
 }
 const rows=orders.flatMap(o=>{const warehouseCode=[...new Set(o.stockMovements.map(m=>m.warehouse?.code).filter((x):x is string=>Boolean(x)))].join(", ")||"-";return o.items.map((x,index)=>({o,x,line:index+1,warehouseCode}))});
 const totals=rows.reduce((a,r)=>({ordered:a.ordered+r.x.orderedQuantity,received:a.received+r.x.receivedQuantity}),{ordered:0,received:0});
 return <section className="p-4 sm:p-6 lg:p-10"><div className="flex justify-end"><ExcelTableExportButton tableId="wms-receipt-detail-table" fileName="giris-siparis-detay-raporu.csv"/></div><Filters title={m.title} orderLabel={m.orderLabel} startDate={startDate} endDate={endDate} orderNumber={orderNumber} status={status} productCode={productCode} shipment={shipment} companyCode={companyCode} companyName={companyName} warehouseId={warehouseId} warehouses={warehouses}/>
  <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><table id="wms-receipt-detail-table" className="w-full min-w-[1350px]"><thead><tr>{["Sipariş Oluşturma Tarihi","Depo Kodu","Satın Alma Sipariş No","İrsaliye No","İrsaliye Tarihi","Tedarikçi Kodu","Tedarikçi Adı","Kalem No","Ürün Kodu","Ürün Tanımı","Sipariş Miktarı","Giriş Miktarı","Giriş Farkı","Sipariş Durumu"].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead>
  <tbody>{rows.map(({o,x,line,warehouseCode})=><tr key={x.id} className="hover:bg-slate-50"><td className={td}>{fmtDate(o.orderDate)}</td><td className={td}>{warehouseCode}</td><td className={td+" font-bold text-blue-900"}>{o.purchaseNumber}</td><td className={td}>{o.deliveryNoteNumber??"-"}</td><td className={td}>{o.deliveryNoteDate?fmtDate(o.deliveryNoteDate):"-"}</td><td className={td}>{o.supplier.taxNumber??"-"}</td><td className={td}>{o.supplier.name}</td><td className={td}>{line}</td><td className={td}>{x.productCode}</td><td className={td+" max-w-[360px] whitespace-normal"}>{x.productName}</td><td className={td}>{n(x.orderedQuantity)}</td><td className={td}>{n(x.receivedQuantity)}</td><td className={td}>{n(Math.max(x.orderedQuantity-x.receivedQuantity,0))}</td><td className={td}>{receiptStatus(o.status)}</td></tr>)}
  {rows.length===0?<tr><td colSpan={14} className="p-10 text-center text-slate-500">Filtreye uygun giriş sipariş detayı bulunamadı.</td></tr>:<tr className="bg-slate-100 font-bold"><td className={td}>Toplam</td><td className={td}>-</td><td className={td}>-</td><td className={td}>-</td><td className={td}>{n(rows.length)}</td><td className={td}>-</td><td className={td}>-</td><td className={td}>{n(totals.ordered)}</td><td className={td}>{n(totals.received)}</td><td className={td}>{n(Math.max(totals.ordered-totals.received,0))}</td><td className={td}>-</td></tr>}</tbody></table></div></section>
}