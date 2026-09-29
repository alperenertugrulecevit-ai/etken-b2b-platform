"use server";

import {
  OrderFulfillmentFlow,
  OrderStatus,
  PickingShortageReason,
  Prisma,
  WaveStatus,
  WmsOperationType,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { prisma } from "@/lib/prisma";
import { WarehouseTransferService } from "@/modules/inventory/services/warehouse-transfer.service";

import { WavePoolPickingService } from "@/modules/fulfillment/services/wave-pool-picking.service";

export type RFWavePoolPickingState = {
  success: boolean;
  message: string;

  waveId: string;
  waveNo: string;

  productId: number | null;
  productCode: string;
  productName: string;

  sourceBarcode: string;
  targetBarcode: string;

  pickedQuantity: number;
  sourceQuantityAfter: number;
  targetQuantityAfter: number;
  waveRemainingQuantity: number;

  allocationCount: number;
  allocationSummary: string[];
};

function createErrorState(
  message: string
): RFWavePoolPickingState {
  return {
    success: false,
    message,

    waveId: "",
    waveNo: "",

    productId: null,
    productCode: "",
    productName: "",

    sourceBarcode: "",
    targetBarcode: "",

    pickedQuantity: 0,
    sourceQuantityAfter: 0,
    targetQuantityAfter: 0,
    waveRemainingQuantity: 0,

    allocationCount: 0,
    allocationSummary: [],
  };
}

function readText(
  formData: FormData,
  fieldName: string
) {
  return String(
    formData.get(fieldName) ??
      ""
  ).trim();
}

function readBarcode(
  formData: FormData,
  fieldName: string
) {
  return readText(
    formData,
    fieldName
  ).toUpperCase();
}

export async function rfWavePoolMarkProductLost(formData: FormData) {
  const currentUser = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const waveId = readText(formData, "waveId");
  const sourceBarcode = readBarcode(formData, "sourceBarcode");
  const productId = Number(formData.get("productId"));
  const terminalCode = readText(formData, "terminalCode").toUpperCase();

  if (!waveId || !sourceBarcode || !Number.isInteger(productId) || productId <= 0) {
    throw new Error("Kayıp işlemi için Wave, kaynak THM ve ürün zorunludur.");
  }

  const operatorName = currentUser.employee
    ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
    : currentUser.username;

  await prisma.$transaction(async (tx) => {
    const wave = await tx.wave.findUnique({
      where: { id: waveId },
      select: {
        distributions: {
          where: { status: { not: "CANCELLED" } },
          select: { lines: { where: { productId }, select: { productId: true } } },
        },
      },
    });

    if (!wave || !wave.distributions.some((distribution) => distribution.lines.length > 0)) {
      throw new Error("Seçilen ürün bu Wave'in aktif toplama planında bulunmuyor.");
    }

    await WarehouseTransferService.markProductLost(tx, {
      sourceHandlingUnitBarcode: sourceBarcode,
      productId,
      actor: {
        operatorId: currentUser.id,
        operatorName,
        terminalCode: terminalCode || null,
      },
    });
  }, {
    maxWait: 10000,
    timeout: 30000,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  revalidatePath("/rf/wave-picking");
  revalidatePath("/admin/stock/movements");
  revalidatePath("/admin/stock/thm-movements");
  revalidatePath("/admin/wms-reports/lost-stock");
}


export async function rfWavePoolCloseShortage(formData: FormData) {
  const currentUser = await AuthorizationService.requireRfAccess("PICKING_EXECUTE");
  const waveId = readText(formData, "waveId");
  const productId = Number(formData.get("productId"));
  const requestedQuantity = Number(formData.get("shortageQuantity"));
  const reasonValue = readText(formData, "shortageReason");
  const note = readText(formData, "shortageNote") || null;

  if (!waveId || !Number.isInteger(productId) || productId <= 0)
    throw new Error("Wave ve ürün seçilmelidir.");
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0)
    throw new Error("Eksik miktarı sıfırdan büyük tam sayı olmalıdır.");
  if (!Object.values(PickingShortageReason).includes(reasonValue as PickingShortageReason))
    throw new Error("Geçerli bir eksik nedeni seçilmelidir.");

  const operatorName = currentUser.employee
    ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
    : currentUser.username;

  const result = await prisma.$transaction(async (tx) => {
    const wave = await tx.wave.findUnique({
      where: { id: waveId },
      select: { id: true, waveNo: true, status: true, orders: { select: { orderId: true } } },
    });
    if (!wave || ![WaveStatus.RELEASED, WaveStatus.IN_PROGRESS].includes(wave.status))
      throw new Error("Wave eksik kapatmaya açık değildir.");

    const lines = await tx.waveDistributionLine.findMany({
      where: {
        productId,
        distribution: { waveId, status: { not: "CANCELLED" } },
        order: { status: { not: OrderStatus.CANCELLED } },
      },
      select: {
        orderId: true, orderItemId: true, plannedQuantity: true, createdAt: true,
        distribution: { select: { sequenceNumber: true, distributionCode: true } },
        distributionOrder: { select: { orderNumber: true } },
        orderItem: { select: { quantity: true, pickedQuantity: true, productCode: true, productName: true,
          pickingShortages: { where: { status: "ACTIVE" }, select: { quantity: true } } } },
      },
    });
    lines.sort((a,b) => a.distribution.sequenceNumber-b.distribution.sequenceNumber ||
      a.distributionOrder.orderNumber.localeCompare(b.distributionOrder.orderNumber,"tr") ||
      a.createdAt.getTime()-b.createdAt.getTime());

    const availableToClose = lines.reduce((sum,line) => {
      const short = line.orderItem.pickingShortages.reduce((s,r)=>s+r.quantity,0);
      return sum + Math.max(0, Math.min(line.plannedQuantity, line.orderItem.quantity-line.orderItem.pickedQuantity-short));
    },0);
    if (requestedQuantity > availableToClose)
      throw new Error(`Eksik miktarı Wave kalan ihtiyacından fazla. Kalan: ${availableToClose}.`);

    let remaining = requestedQuantity;
    const affected = new Set<number>();
    const allocations: string[] = [];
    for (const line of lines) {
      if (remaining <= 0) break;
      const alreadyShort = line.orderItem.pickingShortages.reduce((s,r)=>s+r.quantity,0);
      const open = Math.max(0, Math.min(line.plannedQuantity, line.orderItem.quantity-line.orderItem.pickedQuantity-alreadyShort));
      if (!open) continue;
      const quantity = Math.min(open, remaining);
      await tx.pickingShortage.create({data:{
        orderId:line.orderId, orderItemId:line.orderItemId, productId, quantity,
        reason:reasonValue as PickingShortageReason, note,
        createdByUserId:currentUser.id, createdByName:operatorName,
      }});
      await tx.wmsOperationLog.create({data:{
        operationType:WmsOperationType.PICKING,module:"RF_WAVE_POOL_PICKING",entityType:"PICKING_SHORTAGE",
        entityId:line.orderItemId,operatorId:currentUser.id,operatorName,
        orderId:line.orderId,orderNumber:line.distributionOrder.orderNumber,productId,
        productCode:line.orderItem.productCode,productName:line.orderItem.productName,quantity,
        description:`${wave.waveNo} Wave havuz toplamada ${quantity} adet eksik kapatıldı. Neden: ${reasonValue}`,
        metadata:{waveId,waveNo:wave.waveNo,distributionCode:line.distribution.distributionCode,reason:reasonValue,note},
      }});
      affected.add(line.orderId);
      allocations.push(`${line.distributionOrder.orderNumber}: ${quantity} adet`);
      remaining -= quantity;
    }
    if (remaining !== 0) throw new Error("Eksik miktarın tamamı Wave siparişlerine dağıtılamadı.");

    for (const orderId of affected) {
      const items = await tx.orderItem.findMany({where:{orderId},select:{
        quantity:true,pickedQuantity:true,pickingShortages:{select:{quantity:true}}
      }});
      const planned=items.reduce((s,i)=>s+i.quantity,0);
      const picked=items.reduce((s,i)=>s+Math.min(i.quantity,i.pickedQuantity),0);
      const closed=items.reduce((s,i)=>s+Math.min(i.quantity,i.pickedQuantity+i.pickingShortages.reduce((a,r)=>a+r.quantity,0)),0);
      const complete=planned>0&&closed>=planned;
      await tx.waveOrder.update({where:{wave_order_unique:{waveId,orderId}},data:{
        completedQuantity:picked,isCompleted:complete,completedAt:complete?new Date():null
      }});
      await tx.orderFulfillment.updateMany({where:{orderId,flowType:OrderFulfillmentFlow.WAVE},data:{
        pickedQuantity:picked,pickingStatus:complete?"COMPLETED":"IN_PROGRESS",...(complete?{pickingCompletedAt:new Date()}:{})
      }});
    }

    const waveOrders = await tx.waveOrder.findMany({where:{waveId},select:{isCompleted:true,order:{select:{items:{select:{
      quantity:true,pickedQuantity:true,pickingShortages:{select:{quantity:true}}
    }}}}}});
    const items=waveOrders.flatMap(w=>w.order.items);
    const planned=items.reduce((s,i)=>s+i.quantity,0);
    const picked=items.reduce((s,i)=>s+Math.min(i.quantity,i.pickedQuantity),0);
    const closed=items.reduce((s,i)=>s+Math.min(i.quantity,i.pickedQuantity+i.pickingShortages.reduce((a,r)=>a+r.quantity,0)),0);
    const completedLines=items.filter(i=>i.pickedQuantity+i.pickingShortages.reduce((a,r)=>a+r.quantity,0)>=i.quantity).length;
    await tx.wave.update({where:{id:waveId},data:{
      completedQuantity:picked,completedLineCount:completedLines,
      completedOrderCount:waveOrders.filter(w=>w.isCompleted).length,
      pickingProgress:planned>0?Math.min(100,Math.round(closed/planned*100)):0,
    }});
    return { waveNo: wave.waveNo, quantity: requestedQuantity, allocations };
  }, {maxWait:10000,timeout:30000,isolationLevel:Prisma.TransactionIsolationLevel.Serializable});

  revalidatePath("/rf/wave-picking");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/waves");
  return result;
}

export async function rfWavePoolPickAction(
  _previousState: RFWavePoolPickingState,
  formData: FormData
): Promise<RFWavePoolPickingState> {
  const currentUser =
    await AuthorizationService.requireRfAccess(
      "PICKING_EXECUTE"
    );

  const waveId =
    readText(
      formData,
      "waveId"
    );

  const sourceBarcode =
    readBarcode(
      formData,
      "sourceBarcode"
    );

  const targetBarcode =
    readBarcode(
      formData,
      "targetBarcode"
    );

  const productBarcode =
    readBarcode(
      formData,
      "productBarcode"
    );

  const terminalCode =
    readText(
      formData,
      "terminalCode"
    ).toUpperCase();

  const quantity =
    Number(
      formData.get(
        "quantity"
      )
    );

  if (!waveId) {
    return createErrorState(
      "Toplama yapılacak Wave seçilmelidir."
    );
  }

  if (!targetBarcode) {
    return createErrorState(
      "Ortak Toplama THM barkodunu okutun."
    );
  }

  if (!sourceBarcode) {
    return createErrorState(
      "Kaynak stok THM barkodunu okutun."
    );
  }

  if (!productBarcode) {
    return createErrorState(
      "Toplanacak ürün barkodunu okutun."
    );
  }

  if (
    sourceBarcode ===
    targetBarcode
  ) {
    return createErrorState(
      "Kaynak THM ile Toplama THM aynı olamaz."
    );
  }

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity <= 0
  ) {
    return createErrorState(
      "Toplama miktarı sıfırdan büyük bir tam sayı olmalıdır."
    );
  }

  const operatorName =
    currentUser.employee
      ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
      : currentUser.username;

  try {
    const result =
      await WavePoolPickingService.execute(
        {
          waveId,

          sourceBarcode,
          targetBarcode,
          productBarcode,
          quantity,

          operatorId:
            currentUser.id,

          operatorName,

          terminalCode:
            terminalCode ||
            null,
        }
      );

    revalidatePath(
      "/rf"
    );

    revalidatePath(
      "/rf/wave-picking"
    );

    revalidatePath(
      "/rf/picking"
    );

    revalidatePath(
      "/rf/packing"
    );

    revalidatePath(
      "/admin/orders"
    );

    revalidatePath(
      "/admin/waves"
    );

    revalidatePath(
      `/admin/waves/${result.waveId}`
    );

    revalidatePath(
      "/admin/handling-units"
    );

    return {
      success: true,

      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.pickedQuantity} adet ${result.targetBarcode} ortak Toplama THM'ine aktarıldı.`,

      waveId:
        result.waveId,

      waveNo:
        result.waveNo,

      productId:
        result.productId,

      productCode:
        result.productCode,

      productName:
        result.productName,

      sourceBarcode:
        result.sourceBarcode,

      targetBarcode:
        result.targetBarcode,

      pickedQuantity:
        result.pickedQuantity,

      sourceQuantityAfter:
        result.sourceQuantityAfter,

      targetQuantityAfter:
        result.targetQuantityAfter,

      waveRemainingQuantity:
        result.waveRemainingQuantity,

      allocationCount:
        result.allocations
          .length,

      allocationSummary:
        result.allocations.map(
          (
            allocation
          ) =>
            `${allocation.distributionCode} / ` +
            `${allocation.orderNumber}: ` +
            `${allocation.quantity} adet`
        ),
    };
  } catch (error) {
    console.error(
      "RF Wave havuz toplama hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen barkodları kontrol ederek yeniden deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Wave havuz toplama sırasında beklenmeyen bir hata oluştu."
    );
  }
}