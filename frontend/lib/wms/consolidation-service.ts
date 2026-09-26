import { ConsolidationTaskStatus, Prisma } from "@prisma/client";
type Tx = Prisma.TransactionClient;

export class ConsolidationService {
  static async syncOrder(tx: Tx, orderId: number) {
    const tasks = await tx.zonePickTask.findMany({
      where: { orderId, status: { not: "CANCELLED" } },
      select: { warehouseId:true, waveId:true, status:true },
    });
    if (tasks.length <= 1) {
      await tx.consolidationTask.deleteMany({ where: { orderId, status: { in: ["WAITING","READY"] } } });
      return { required:false, ready:true };
    }

    const completed = tasks.filter(t=>t.status==="COMPLETED").length;
    const status = completed === tasks.length ? ConsolidationTaskStatus.READY : ConsolidationTaskStatus.WAITING;
    const first=tasks[0];
    const task=await tx.consolidationTask.upsert({
      where:{orderId},
      create:{orderId,warehouseId:first.warehouseId,waveId:first.waveId,requiredZoneCount:tasks.length,completedZoneCount:completed,status},
      update:{requiredZoneCount:tasks.length,completedZoneCount:completed,status},
    });

    if(status===ConsolidationTaskStatus.READY){
      const pickedUnits=await tx.pickingRecord.findMany({
        where:{orderId},
        distinct:["targetHandlingUnitId"],
        select:{targetHandlingUnitId:true},
      });
      for(const unit of pickedUnits){
        await tx.consolidationTaskUnit.upsert({
          where:{consolidation_task_unit_unique:{taskId:task.id,handlingUnitId:unit.targetHandlingUnitId}},
          create:{taskId:task.id,handlingUnitId:unit.targetHandlingUnitId},
          update:{},
        });
      }
    }
    return { required:true, ready:status===ConsolidationTaskStatus.READY };
  }

  static async complete(tx: Tx, orderId:number) {
    const task=await tx.consolidationTask.findUnique({where:{orderId}});
    if(!task || ![ConsolidationTaskStatus.READY, ConsolidationTaskStatus.IN_PROGRESS].includes(task.status)) throw new Error("Konsolidasyon görevi tamamlanmaya hazır değil.");
    const unverified=await tx.consolidationTaskUnit.count({where:{taskId:task.id,verifiedAt:null}});
    if(unverified>0) throw new Error(`Konsolidasyon tamamlanamaz. ${unverified} THM daha okutulmalıdır.`);
    await tx.consolidationTask.update({
      where:{id:task.id},
      data:{status:ConsolidationTaskStatus.COMPLETED,startedAt:task.startedAt??new Date(),completedAt:new Date()},
    });
  }
}
