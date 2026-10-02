import { HandlingUnitPurpose,HandlingUnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import RFStockReturnForm from "@/components/rf/RFStockReturnForm";

export default async function Page(){
 await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
 const [targets,locations]=await Promise.all([
  prisma.handlingUnit.findMany({where:{purpose:{in:[HandlingUnitPurpose.STOCK,HandlingUnitPurpose.RECEIVING]},status:{in:[HandlingUnitStatus.OPEN,HandlingUnitStatus.EMPTY,HandlingUnitStatus.STORED]},warehouseId:{not:null},parentUnitId:null},select:{barcode:true,purpose:true,warehouseId:true},orderBy:{barcode:"asc"},take:1000}),
  prisma.warehouseLocation.findMany({where:{isActive:true},select:{code:true,aisle:true,section:true,level:true,bin:true,warehouseId:true,locationType:true},orderBy:[{warehouseId:"asc"},{sortOrder:"asc"},{code:"asc"}],take:2000})
 ]);
 const rfLocations=locations.map(x=>({...x,scanCode:[x.code,x.section,x.level,x.bin].map(v=>v.trim()).filter(Boolean).join("-")}));
 return <RFStockReturnForm targets={targets} locations={rfLocations}/>;
}
