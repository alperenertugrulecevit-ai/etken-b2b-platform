import { HandlingUnitPurpose, HandlingUnitStatus, Prisma, PrismaClient, ZonePickTaskStatus } from "@prisma/client";
type Tx = Prisma.TransactionClient | PrismaClient;
const SOURCE_STATUSES: HandlingUnitStatus[]=[HandlingUnitStatus.OPEN,HandlingUnitStatus.CLOSED,HandlingUnitStatus.STORED];

export class ZonePickingService {
 static async buildTasksForOrders(tx:Tx,input:{orderIds:number[];warehouseId:number;waveId?:string|null}){
  const ids=[...new Set(input.orderIds)];
  const orders=await tx.order.findMany({where:{id:{in:ids}},select:{id:true,orderNumber:true,items:{select:{id:true,productId:true,quantity:true,pickedQuantity:true}}}});
  if(orders.length!==ids.length) throw new Error("Zone görev planı için siparişlerden biri bulunamadı.");
  const productIds=[...new Set(orders.flatMap(o=>o.items.map(i=>i.productId)))];
  const stocks=await tx.handlingUnitItem.findMany({where:{productId:{in:productIds},quantity:{gt:0},handlingUnit:{purpose:HandlingUnitPurpose.STOCK,assignedOrderId:null,assignedWaveId:null,warehouseId:input.warehouseId,status:{in:SOURCE_STATUSES},location:{is:{isActive:true}}}},select:{id:true,productId:true,quantity:true,reservedStock:true,handlingUnit:{select:{id:true,barcode:true,location:{select:{id:true,code:true,sortOrder:true,zoneId:true,zone:{select:{id:true,code:true,isActive:true}}}}}}},orderBy:{id:"asc"}});
  const available=new Map(stocks.map(s=>[s.id,Math.max(0,s.quantity-s.reservedStock)]));
  const byProduct=new Map<number,typeof stocks>();
  for(const stock of stocks) byProduct.set(stock.productId,[...(byProduct.get(stock.productId)??[]),stock]);
  const plans=new Map<string,{orderId:number;zoneId:number;lines:{orderItemId:number;handlingUnitItemId:number;quantity:number;sequence:number}[]}>();
  let sequence=0;
  for(const order of orders) for(const item of order.items){
   let need=Math.max(0,item.quantity-item.pickedQuantity); if(!need) continue;
   const candidates=(byProduct.get(item.productId)??[]).filter(s=>(available.get(s.id)??0)>0).sort((a,b)=>(a.handlingUnit.location?.sortOrder??0)-(b.handlingUnit.location?.sortOrder??0));
   const total=candidates.reduce((n,s)=>n+(available.get(s.id)??0),0);
   if(total<need) throw new Error(`${order.orderNumber}: ürün ${item.productId} için seçilen depoda yeterli kullanılabilir fiziksel stok yok.`);
   for(const stock of candidates){
    if(!need) break; const loc=stock.handlingUnit.location!;
    if(!loc.zoneId||!loc.zone||!loc.zone.isActive) throw new Error(`${order.orderNumber}: ${loc.code} lokasyonu aktif bir Zone'a atanmadığı için toplama başlatılamaz.`);
    const free=available.get(stock.id)??0; const take=Math.min(need,free); if(!take) continue;
    const key=`${order.id}:${loc.zoneId}`; const p=plans.get(key)??{orderId:order.id,zoneId:loc.zoneId,lines:[]};
    p.lines.push({orderItemId:item.id,handlingUnitItemId:stock.id,quantity:take,sequence:sequence++}); plans.set(key,p);
    available.set(stock.id,free-take); need-=take;
   }
  }
  for(const p of plans.values()){
   const existing=await tx.zonePickTask.findFirst({where:{orderId:p.orderId,zoneId:p.zoneId,waveId:input.waveId??null}});
   const data={warehouseId:input.warehouseId,zoneId:p.zoneId,orderId:p.orderId,waveId:input.waveId??null,status:ZonePickTaskStatus.OPEN,plannedLineCount:p.lines.length,plannedQuantity:p.lines.reduce((n,l)=>n+l.quantity,0)};
   const task=existing?await tx.zonePickTask.update({where:{id:existing.id},data:{plannedLineCount:data.plannedLineCount,plannedQuantity:data.plannedQuantity}}):await tx.zonePickTask.create({data});
   const existingLines=await tx.zonePickTaskLine.findMany({where:{taskId:task.id},select:{id:true,orderItemId:true,handlingUnitItemId:true,plannedQuantity:true,pickedQuantity:true}});
   if(existingLines.some(line=>line.pickedQuantity>0)) throw new Error("Toplaması başlamış Zone görevi yeniden planlanamaz.");
   for(const oldLine of existingLines){
    const replacement=p.lines.find(line=>line.orderItemId===oldLine.orderItemId&&line.handlingUnitItemId===oldLine.handlingUnitItemId);
    if(!replacement){
      if(oldLine.plannedQuantity>0) await tx.handlingUnitItem.update({where:{id:oldLine.handlingUnitItemId},data:{reservedStock:{decrement:oldLine.plannedQuantity}}});
      await tx.zonePickTaskLine.delete({where:{id:oldLine.id}});
    }
   }
   for(const line of p.lines){
    const previous=existingLines.find(old=>old.orderItemId===line.orderItemId&&old.handlingUnitItemId===line.handlingUnitItemId);
    const delta=line.quantity-(previous?.plannedQuantity??0);
    if(delta>0) await tx.handlingUnitItem.update({where:{id:line.handlingUnitItemId},data:{reservedStock:{increment:delta}}});
    if(delta<0) await tx.handlingUnitItem.update({where:{id:line.handlingUnitItemId},data:{reservedStock:{decrement:-delta}}});
    await tx.zonePickTaskLine.upsert({where:{zone_task_order_item_source_unique:{taskId:task.id,orderItemId:line.orderItemId,handlingUnitItemId:line.handlingUnitItemId}},create:{taskId:task.id,...line,plannedQuantity:line.quantity},update:{plannedQuantity:line.quantity,sequence:line.sequence}});
   }
  }
  return {taskCount:plans.size,zoneCount:new Set([...plans.values()].map(p=>p.zoneId)).size};
 }
}