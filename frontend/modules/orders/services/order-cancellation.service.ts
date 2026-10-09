import "server-only";

import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  DispatchDocumentStatus,
  OrderStatus,
  OrderSource,
  Prisma,
  StockMovementType,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";
import { ZonePickingService } from "@/lib/wms/zone-picking-service";

type Actor = { userId: string; displayName: string };
type Tx = Prisma.TransactionClient;

const ACTIVE_CANCELLATION = ["REQUESTED", "STOCK_RETURN_PENDING", "REFUND_PENDING"];

async function reservationByWarehouse(tx: Tx, orderId: number, productId: number) {
  const rows = await tx.stockMovement.findMany({
    where: {
      orderId,
      productId,
      movementType: { in: [StockMovementType.RESERVATION_CREATE, StockMovementType.RESERVATION_RELEASE] },
      warehouseId: { not: null },
    },
    select: { warehouseId: true, reservedChange: true },
  });
  const totals = new Map<number, number>();
  for (const row of rows) {
    if (row.warehouseId === null) continue;
    totals.set(row.warehouseId, (totals.get(row.warehouseId) ?? 0) + row.reservedChange);
  }
  return [...totals.entries()].filter(([, quantity]) => quantity > 0);
}

async function createCancellationCredit(tx: Tx, order: { id:number; customerId:number; orderNumber:string }, actor: Actor) {
  const debit = await tx.customerAccountEntry.findFirst({
    where: { orderId: order.id, direction: CustomerAccountEntryDirection.DEBIT, entryType: CustomerAccountEntryType.ORDER },
    select: { amount: true },
  });
  const existing = await tx.customerAccountEntry.findFirst({
    where: { orderId: order.id, direction: CustomerAccountEntryDirection.CREDIT, entryType: CustomerAccountEntryType.CANCELLATION },
    select: { id: true },
  });
  if (debit && !existing) {
    await tx.customerAccountEntry.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        direction: CustomerAccountEntryDirection.CREDIT,
        entryType: CustomerAccountEntryType.CANCELLATION,
        amount: debit.amount,
        description: `${order.orderNumber} sipariş iptal ters kaydı`,
        referenceNo: order.orderNumber,
        createdByUserId: actor.userId,
        createdByUsername: actor.displayName,
      },
    });
  }
}

async function finalizeCancellation(tx: Tx, orderId: number, actor: Actor) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id:true, customerId:true, orderNumber:true, paymentStatus:true, status:true, source:true, stockReserved:true, stockDeducted:true,
      items:{select:{productId:true,quantity:true,cancelledQuantity:true,pickedQuantity:true,packedQuantity:true,shippedQuantity:true}},
    },
  });
  if (!order) throw new Error("Sipariş bulunamadı.");
  if (order.items.length === 0) throw new Error("Kalemsiz sipariş iptal mutabakatı tamamlanamaz.");
  if (order.stockDeducted) throw new Error("Fiziksel stok düşümü bulunan sipariş iptal yerine iade sürecine alınmalıdır.");
  if (order.items.some((item) => item.shippedQuantity > 0)) throw new Error("Sevk edilmiş miktar var. Sipariş iptali yerine iade süreci kullanılmalıdır.");
  const physicalRemaining = order.items.reduce(
    (sum,item)=>sum+Math.max(0,item.pickedQuantity,item.packedQuantity),
    0,
  );
  if (physicalRemaining > 0) throw new Error("Toplanmış/paketlenmiş ürünlerin tamamı stoğa geri alınmadan iptal tamamlanamaz.");
  if (order.items.some((item) =>
    !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
    !Number.isSafeInteger(item.cancelledQuantity) || item.cancelledQuantity !== item.quantity ||
    item.pickedQuantity !== 0 || item.packedQuantity !== 0 || item.shippedQuantity !== 0
  )) {
    throw new Error("İptal sonlandırılamadı: sipariş miktarları ve fiziksel stok geri alma mutabakatı tamamlanmadı.");
  }

  // Web checkout reserves Product.reservedStock directly. Release that global
  // reservation inside the same transaction that completes cancellation.
  // Never release twice, and never apply this to already shipped stock.
  const warehouseReservationMovements = await tx.stockMovement.count({
    where: {
      orderId: order.id,
      movementType: {
        in: [StockMovementType.RESERVATION_CREATE, StockMovementType.RESERVATION_RELEASE],
      },
    },
  });
  if (
    order.source === OrderSource.ECOMMERCE &&
    order.stockReserved &&
    !order.stockDeducted
  ) {
    // Checkout reserves global Product stock without a warehouse movement.
    // Mixed ownership cannot safely be reconciled by skipping the release:
    // that would mark the order cancelled while leaving checkout stock held.
    if (warehouseReservationMovements > 0) {
      throw new Error(
        "E-ticaret siparişinde depo rezervasyon hareketleri mevcut. Çift düşüm veya rezervasyon kaçağını önlemek için stok mutabakatı gerekli."
      );
    }
    if (order.items.length === 0) {
      throw new Error("Kalemsiz e-ticaret siparişinin stok rezervasyonu serbest bırakılamaz.");
    }
    if (order.items.some((item) => item.quantity <= 0 || !Number.isSafeInteger(item.quantity))) {
      throw new Error("E-ticaret iptal rezervasyon miktarı geçersiz.");
    }
    const totals = new Map<number, number>();
    for (const item of order.items) {
      const quantity = (totals.get(item.productId) ?? 0) + item.quantity;
      if (!Number.isSafeInteger(quantity) || quantity > 2147483647) {
        throw new Error("İptal rezervasyon miktarı geçersiz.");
      }
      totals.set(item.productId, quantity);
    }
    for (const [productId, quantity] of [...totals].sort(([a], [b]) => a - b)) {
      const result = await tx.product.updateMany({
        where: { id: productId, reservedStock: { gte: quantity } },
        data: { reservedStock: { decrement: quantity } },
      });
      if (result.count !== 1) {
        throw new Error("E-ticaret iptal rezervasyonu tutarsız; manuel stok mutabakatı gerekli.");
      }
    }
  }

  await createCancellationCredit(tx, order, actor);
  const paid = order.paymentStatus?.toUpperCase() === "PAID" || order.paymentStatus?.toUpperCase() === "REFUND_PENDING";
  await tx.order.update({
    where:{id:order.id},
    data:{
      status:OrderStatus.CANCELLED,
      stockReserved:false,
      cancellationStatus:paid ? "REFUND_PENDING" : "COMPLETED",
      cancellationCompletedAt:new Date(),
      cancellationRefundStatus:paid ? "PENDING" : "NOT_REQUIRED",
      ...(paid ? { paymentStatus:"REFUND_PENDING" } : {}),
      statusHistory:{create:{
        status:OrderStatus.CANCELLED,
        note:paid
          ? "Sipariş iptali ve stok geri alma tamamlandı. Ödeme iadesi bekleniyor."
          : "Sipariş iptali ve stok işlemleri tamamlandı.",
        changedByUserId:actor.userId,
        changedByUsername:actor.displayName,
        visibleToCustomer:true,
      }},
    },
  });
}

export class OrderCancellationService {
  static isBlocked(status: string | null | undefined) {
    return Boolean(status && ACTIVE_CANCELLATION.includes(status));
  }

  static async request(input:{orderId:number;reason:string;actor:Actor}) {
    return prisma.$transaction(async(tx)=>{
      const order=await tx.order.findUnique({
        where:{id:input.orderId},
        select:{
          id:true,customerId:true,orderNumber:true,status:true,source:true,cancellationStatus:true,paymentStatus:true,stockReserved:true,stockDeducted:true,
          pickingAssignment:{select:{id:true}},
          items:{select:{id:true,productId:true,productCode:true,quantity:true,pickedQuantity:true,packedQuantity:true,shippedQuantity:true,cancelledQuantity:true}},
          shippingHandlingUnitOrders:{select:{shippingHandlingUnit:{select:{dispatchDocument:{select:{id:true,status:true}}}}}},
        },
      });
      if(!order)throw new Error("Sipariş bulunamadı.");
      if(order.status===OrderStatus.CANCELLED)throw new Error("Sipariş zaten iptal edilmiş.");
      if (OrderCancellationService.isBlocked(order.cancellationStatus)) {
        throw new Error("Sipariş için aktif iptal talebi zaten mevcut; tekrar iptal başlatılamaz.");
      }
      if (order.items.length === 0) {
        throw new Error("Kalemsiz sipariş için iptal stok mutabakatı yapılamaz.");
      }
      if (order.items.some((item) =>
        !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
        !Number.isSafeInteger(item.pickedQuantity) || item.pickedQuantity < 0 ||
        !Number.isSafeInteger(item.packedQuantity) || item.packedQuantity < 0 ||
        !Number.isSafeInteger(item.shippedQuantity) || item.shippedQuantity < 0 ||
        !Number.isSafeInteger(item.cancelledQuantity) || item.cancelledQuantity < 0 ||
        item.pickedQuantity + item.cancelledQuantity > item.quantity ||
        item.packedQuantity > item.pickedQuantity ||
        item.shippedQuantity > item.packedQuantity
      )) {
        throw new Error("Sipariş kalem miktarları tutarsız; iptal öncesi stok mutabakatı gerekli.");
      }

      if(order.status===OrderStatus.SHIPPED||order.status===OrderStatus.DELIVERED||order.stockDeducted||order.items.some(i=>i.shippedQuantity>0)){
        throw new Error("Sipariş sevk edilmiş. İptal yerine İade Giriş süreci kullanılmalıdır.");
      }

      // Detect mixed checkout/WMS reservation ownership before changing any
      // picking tasks, quantities or dispatch documents. Checkout holds a
      // global Product reservation; WMS movements also affect global stock.
      // Without an ownership ledger, automatically releasing both is unsafe.
      if (order.source === OrderSource.ECOMMERCE && order.stockReserved && !order.stockDeducted) {
        const mixedMovements = await tx.stockMovement.count({
          where: {
            orderId: order.id,
            movementType: {
              in: [StockMovementType.RESERVATION_CREATE, StockMovementType.RESERVATION_RELEASE],
            },
          },
        });
        if (mixedMovements > 0) {
          throw new Error(
            "E-ticaret siparişinde depo rezervasyon hareketleri mevcut. Çift düşüm veya rezervasyon kaçağını önlemek için stok mutabakatı gerekli.",
          );
        }
      }

      await ZonePickingService.releaseOrderPlan(tx,order.id);
      if(order.pickingAssignment){
        await tx.orderPickingAssignment.updateMany({where:{orderId:order.id,cancelledAt:null},data:{cancelledAt:new Date()}});
      }

      // A product can occur on multiple order lines. Consume the warehouse
      // reservation ledger once per product; never release the same units twice.
      const remainingReservations = new Map<number, Map<number, number>>();
      for (const item of order.items) {
        const unpicked = Math.max(0, item.quantity - item.pickedQuantity - item.cancelledQuantity);
        if (unpicked <= 0) continue;
        let warehouses = remainingReservations.get(item.productId);
        if (!warehouses) {
          warehouses = new Map(await reservationByWarehouse(tx, order.id, item.productId));
          remainingReservations.set(item.productId, warehouses);
        }
        let remaining = unpicked;
        for (const [warehouseId, reserved] of warehouses) {
          if (remaining <= 0) break;
          const release = Math.min(remaining, reserved);
          if (release <= 0) continue;
          await createStockMovementWithTransaction(tx, {
            productId: item.productId, orderId: order.id, warehouseId,
            movementType: StockMovementType.RESERVATION_RELEASE,
            physicalChange: 0, reservedChange: -release,
            documentNumber: order.orderNumber,
            description: `${order.orderNumber} iptal talebi nedeniyle toplanmamış ${release} adet rezervasyon serbest bırakıldı.`,
          });
          warehouses.set(warehouseId, reserved - release);
          remaining -= release;
        }
        if (order.source !== OrderSource.ECOMMERCE && remaining > 0) {
          throw new Error("İptal için depo rezervasyonu yetersiz; stok mutabakatı gerekli.");
        }
        await tx.orderItem.update({ where: { id: item.id }, data: { cancelledQuantity: { increment: unpicked } } });
      }

      const docs=order.shippingHandlingUnitOrders
        .map(row=>row.shippingHandlingUnit.dispatchDocument)
        .filter((doc):doc is NonNullable<typeof doc>=>Boolean(doc));
      for(const doc of docs){
        if(doc.status===DispatchDocumentStatus.ISSUED||doc.status===DispatchDocumentStatus.DRAFT||doc.status===DispatchDocumentStatus.READY){
          await tx.dispatchDocument.update({where:{id:doc.id},data:{
            status:DispatchDocumentStatus.CANCELLED,cancelledAt:new Date(),
            cancelledById:input.actor.userId,cancelledByName:input.actor.displayName,
            cancelReason:input.reason,
          }});
        }
      }

      const physical=order.items.reduce((sum,item)=>sum+Math.max(item.pickedQuantity,item.packedQuantity),0);
      await tx.order.update({
        where:{id:order.id},
        data:{
          cancellationStatus:physical>0?"STOCK_RETURN_PENDING":"REQUESTED",
          cancellationReason:input.reason,
          cancellationRequestedAt:new Date(),
          cancellationRequestedByUserId:input.actor.userId,
          cancellationRequestedByName:input.actor.displayName,
          statusHistory:{create:{
            status:order.status,
            note:physical>0
              ? `Sipariş iptal talebi alındı. ${physical} adet fiziksel ürün stoğa geri alınmayı bekliyor. İrsaliye ve yeni toplama işlemleri bloke edildi.`
              : "Sipariş iptal talebi alındı. Toplama başlamadığı için iptal doğrudan tamamlanacak.",
            changedByUserId:input.actor.userId,changedByUsername:input.actor.displayName,visibleToCustomer:false,
          }},
        },
      });

      if(physical===0)await finalizeCancellation(tx,order.id,input.actor);
      return {orderNumber:order.orderNumber,stockReturnRequired:physical>0,physicalQuantity:physical};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:30000});
  }

  static async undoRequest(input:{orderId:number;reason:string;actor:Actor}) {
    return prisma.$transaction(async(tx)=>{
      const order=await tx.order.findUnique({
        where:{id:input.orderId},
        select:{
          id:true,orderNumber:true,status:true,source:true,stockReserved:true,cancellationStatus:true,cancellationRequestedAt:true,
          stockDeducted:true,
          items:{select:{id:true,productId:true,productCode:true,quantity:true,pickedQuantity:true,packedQuantity:true,shippedQuantity:true,cancelledQuantity:true}},
          shippingHandlingUnitOrders:{select:{shippingHandlingUnit:{select:{dispatchDocument:{select:{id:true,status:true}}}}}},
        },
      });
      if(!order) throw new Error("Sipariş bulunamadı.");
      if(order.cancellationStatus!=="STOCK_RETURN_PENDING") {
        throw new Error("Yalnızca stok geri alma bekleyen iptal talebi geri alınabilir.");
      }
      if(order.status===OrderStatus.CANCELLED) throw new Error("İptali tamamlanmış sipariş yeniden açılamaz.");
      if(order.stockDeducted||order.items.some(i=>i.shippedQuantity>0)) throw new Error("Fiziksel sevki başlamış siparişin iptali geri alınamaz.");
      if (order.items.length === 0 || order.items.some((item) =>
        !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
        !Number.isSafeInteger(item.pickedQuantity) || item.pickedQuantity < 0 ||
        !Number.isSafeInteger(item.packedQuantity) || item.packedQuantity < 0 ||
        !Number.isSafeInteger(item.shippedQuantity) || item.shippedQuantity < 0 ||
        !Number.isSafeInteger(item.cancelledQuantity) || item.cancelledQuantity < 0 ||
        item.pickedQuantity + item.cancelledQuantity > item.quantity ||
        item.packedQuantity > item.pickedQuantity ||
        item.shippedQuantity > item.packedQuantity
      )) {
        throw new Error("İptal geri alma için sipariş kalem miktarları tutarsız; stok mutabakatı gerekli.");
      }

      const stockReturns=await tx.stockMovement.count({
        where:{orderId:order.id,movementType:StockMovementType.STOCK_RETURN},
      });
      if(stockReturns>0) throw new Error("RF stok geri alma başlamış. Sipariş iptali artık geri alınamaz.");

      // Undo is safe only if the original order still owns its reservation.
      // Checkout's global reservation has no warehouse movement to recreate.
      // Never reopen a checkout order whose stock was already released.
      if (order.source === OrderSource.ECOMMERCE && !order.stockReserved) {
        throw new Error("E-ticaret rezervasyonu artık aktif değil; iptal geri alma için stok mutabakatı gerekli.");
      }

      const cancellationReleases=await tx.stockMovement.findMany({
        where:{
          orderId:order.id,
          movementType:StockMovementType.RESERVATION_RELEASE,
          description:{contains:"iptal talebi nedeniyle"},
        },
        select:{productId:true,warehouseId:true,reservedChange:true},
      });

      // A cancellation undo must restore every cancelled unit, not merely
      // the subset that happened to have a warehouse reservation movement.
      // Otherwise the order reopens with cancelled units permanently missing.
      const releasableByProduct = new Map<number, number>();
      for (const release of cancellationReleases) {
        if (release.warehouseId === null || release.reservedChange >= 0) {
          throw new Error("İptal geri alma için depo rezervasyon hareketi tutarsız; stok mutabakatı gerekli.");
        }
        const quantity = -release.reservedChange;
        releasableByProduct.set(
          release.productId,
          (releasableByProduct.get(release.productId) ?? 0) + quantity,
        );
      }
      const cancelledByProduct = new Map<number, number>();
      for (const item of order.items) {
        if (item.cancelledQuantity < 0 || item.cancelledQuantity > item.quantity) {
          throw new Error("İptal geri alma için sipariş miktarları tutarsız; stok mutabakatı gerekli.");
        }
        cancelledByProduct.set(
          item.productId,
          (cancelledByProduct.get(item.productId) ?? 0) + item.cancelledQuantity,
        );
      }
      for (const [productId, cancelled] of cancelledByProduct) {
        if (cancelled !== (releasableByProduct.get(productId) ?? 0)) {
          throw new Error("İptal geri alma için eksik depo rezervasyonu mevcut; stok mutabakatı gerekli.");
        }
      }
      for (const productId of releasableByProduct.keys()) {
        if (!cancelledByProduct.has(productId)) {
          throw new Error("İptal geri alma için eşleşmeyen depo rezervasyonu mevcut; stok mutabakatı gerekli.");
        }
      }

      const releasedByProduct=new Map<number,number>();
      for(const release of cancellationReleases){
        const quantity=Math.max(0,-release.reservedChange);
        if(quantity<=0||release.warehouseId===null) continue;
        await createStockMovementWithTransaction(tx,{
          productId:release.productId,
          orderId:order.id,
          warehouseId:release.warehouseId,
          movementType:StockMovementType.RESERVATION_CREATE,
          physicalChange:0,
          reservedChange:quantity,
          documentNumber:order.orderNumber,
          description:`${order.orderNumber} iptal talebi geri alındığı için ${quantity} adet rezervasyon yeniden oluşturuldu.`,
        });
        releasedByProduct.set(release.productId,(releasedByProduct.get(release.productId)??0)+quantity);
      }

      const remainingByProduct = new Map(releasedByProduct);
      for(const item of order.items){
        const available = remainingByProduct.get(item.productId) ?? 0;
        const restoreCancelled=Math.min(item.cancelledQuantity,available);
        if(restoreCancelled>0){
          await tx.orderItem.update({where:{id:item.id},data:{cancelledQuantity:{decrement:restoreCancelled}}});
          remainingByProduct.set(item.productId, available - restoreCancelled);
        }
      }
      if ([...remainingByProduct.values()].some((quantity) => quantity !== 0)) {
        throw new Error("İptal geri alma miktarları sipariş kalemleriyle eşleşmiyor; stok mutabakatı gerekli.");
      }

      const docs=order.shippingHandlingUnitOrders
        .map(row=>row.shippingHandlingUnit.dispatchDocument)
        .filter((doc):doc is NonNullable<typeof doc>=>Boolean(doc));
      for(const doc of docs){
        if(doc.status===DispatchDocumentStatus.CANCELLED){
          await tx.dispatchDocument.update({where:{id:doc.id},data:{
            status:DispatchDocumentStatus.READY,
            cancelledAt:null,
            cancelledById:null,
            cancelledByName:null,
            cancelReason:null,
          }});
        }
      }

      await tx.order.update({
        where:{id:order.id},
        data:{
          cancellationStatus:null,
          cancellationReason:null,
          cancellationRequestedAt:null,
          cancellationRequestedByUserId:null,
          cancellationRequestedByName:null,
          cancellationCompletedAt:null,
          cancellationRefundStatus:null,
          cancellationRefundReference:null,
          cancellationRefundedAt:null,
          stockReserved:cancellationReleases.length>0?true:undefined,
          statusHistory:{create:{
            status:order.status,
            note:`Sipariş iptal talebi geri alındı. ${input.reason}`.trim(),
            changedByUserId:input.actor.userId,
            changedByUsername:input.actor.displayName,
            visibleToCustomer:false,
          }},
        },
      });

      await tx.wmsOperationLog.create({data:{
        operationType:WmsOperationType.OTHER,
        module:"ORDER_CANCELLATION_UNDO",
        entityType:"ORDER",
        entityId:order.id,
        operatorId:input.actor.userId,
        operatorName:input.actor.displayName,
        orderId:order.id,
        orderNumber:order.orderNumber,
        previousStatus:"STOCK_RETURN_PENDING",
        newStatus:order.status,
        description:`${order.orderNumber} siparişinin iptal talebi geri alındı. ${input.reason}`.trim(),
        metadata:{restoredReservationQuantity:[...releasedByProduct.values()].reduce((a,b)=>a+b,0)},
      }});

      return {orderNumber:order.orderNumber};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:30000});
  }

  static async tryFinalizeAfterStockReturn(tx:Tx,orderId:number,actor:Actor){
    const order=await tx.order.findUnique({where:{id:orderId},select:{cancellationStatus:true,items:{select:{pickedQuantity:true,packedQuantity:true,shippedQuantity:true}}}});
    if(!order||order.cancellationStatus!=="STOCK_RETURN_PENDING")return false;
    if(order.items.some(i=>i.shippedQuantity>0))return false;
    if(order.items.some(i=>i.pickedQuantity>0||i.packedQuantity>0))return false;
    await finalizeCancellation(tx,orderId,actor);
    return true;
  }

  static async completeRefund(input:{orderId:number;reference:string;actor:Actor}){
    return prisma.$transaction(async(tx)=>{
      const order=await tx.order.findUnique({where:{id:input.orderId},select:{id:true,customerId:true,orderNumber:true,status:true,totalAmount:true,paymentStatus:true,cancellationStatus:true,cancellationRefundStatus:true}});
      if(!order)throw new Error("Sipariş bulunamadı.");
      if(order.status!==OrderStatus.CANCELLED||order.cancellationStatus!=="REFUND_PENDING"||order.cancellationRefundStatus!=="PENDING")throw new Error("Sipariş para iadesi tamamlamaya uygun değil.");
      const payment=await tx.customerAccountEntry.findFirst({where:{orderId:order.id,direction:CustomerAccountEntryDirection.CREDIT,entryType:CustomerAccountEntryType.PAYMENT},select:{amount:true,paymentMethod:true}});
      if(!payment)throw new Error("İade edilecek tahsilat kaydı bulunamadı.");
      if (!input.reference.trim()) throw new Error("İade referansı zorunludur.");
      if (!Number.isFinite(payment.amount) || payment.amount <= 0 || payment.amount > order.totalAmount) throw new Error("İade tutarı geçersiz.");
      const existing=await tx.customerAccountEntry.findFirst({where:{orderId:order.id,direction:CustomerAccountEntryDirection.DEBIT,entryType:CustomerAccountEntryType.REFUND},select:{id:true,referenceNo:true}});
      if (existing && existing.referenceNo !== input.reference) throw new Error("Farklı referansla iade zaten kaydedilmiş.");
      if(!existing){
        await tx.customerAccountEntry.create({data:{
          customerId:order.customerId,orderId:order.id,direction:CustomerAccountEntryDirection.DEBIT,
          entryType:CustomerAccountEntryType.REFUND,paymentMethod:payment.paymentMethod,amount:payment.amount,
          description:`${order.orderNumber} iptal ödeme iadesi`,referenceNo:input.reference,
          createdByUserId:input.actor.userId,createdByUsername:input.actor.displayName,
        }});
      }
      await tx.order.update({where:{id:order.id},data:{
        paymentStatus:"REFUNDED",cancellationStatus:"COMPLETED",cancellationRefundStatus:"REFUNDED",
        cancellationRefundReference:input.reference,cancellationRefundedAt:new Date(),
        statusHistory:{create:{status:OrderStatus.CANCELLED,note:`Ödeme iadesi tamamlandı. Referans: ${input.reference}`,changedByUserId:input.actor.userId,changedByUsername:input.actor.displayName,visibleToCustomer:true}},
      }});
      return {orderNumber:order.orderNumber,amount:payment.amount};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
}
