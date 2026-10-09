import { DispatchDocumentStatus, OrderStatus, StockMovementType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderCancellationService } from "@/modules/orders/services/order-cancellation.service";

const mocks=vi.hoisted(()=>({
  transaction:vi.fn(),orderFindUnique:vi.fn(),stockMovementCount:vi.fn(),stockMovementFindMany:vi.fn(),
  orderItemUpdate:vi.fn(),dispatchUpdate:vi.fn(),orderUpdate:vi.fn(),wmsLogCreate:vi.fn(),
  createStockMovement:vi.fn(),releaseOrderPlan:vi.fn(),
}));
const tx={
  order:{findUnique:mocks.orderFindUnique,update:mocks.orderUpdate},
  stockMovement:{count:mocks.stockMovementCount,findMany:mocks.stockMovementFindMany},
  orderItem:{update:mocks.orderItemUpdate},dispatchDocument:{update:mocks.dispatchUpdate},
  wmsOperationLog:{create:mocks.wmsLogCreate},
};
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
vi.mock("@/lib/stock/stock-service",()=>({createStockMovementWithTransaction:mocks.createStockMovement}));
vi.mock("@/lib/wms/zone-picking-service",()=>({ZonePickingService:{releaseOrderPlan:mocks.releaseOrderPlan}}));

function pendingOrder(overrides:Record<string,unknown>={}){return {
  id:782,orderNumber:"SIP20261005-720782",status:OrderStatus.READY_TO_SHIP,
  cancellationStatus:"STOCK_RETURN_PENDING",cancellationRequestedAt:new Date(),stockDeducted:false,
  items:[{id:1,productId:10,productCode:"P10",quantity:3,pickedQuantity:2,packedQuantity:2,shippedQuantity:0,cancelledQuantity:1}],
  shippingHandlingUnitOrders:[{shippingHandlingUnit:{dispatchDocument:{id:"doc-1",status:DispatchDocumentStatus.CANCELLED}}}],
  ...overrides,
};}

describe("OrderCancellationService.undoRequest",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async(cb:(client:typeof tx)=>Promise<unknown>)=>cb(tx));
    mocks.orderFindUnique.mockResolvedValue(pendingOrder());mocks.stockMovementCount.mockResolvedValue(0);
    mocks.stockMovementFindMany.mockResolvedValue([{productId:10,warehouseId:1,reservedChange:-1}]);
    mocks.createStockMovement.mockResolvedValue({movement:{},balances:{}});mocks.orderItemUpdate.mockResolvedValue({});
    mocks.dispatchUpdate.mockResolvedValue({});mocks.orderUpdate.mockResolvedValue({});mocks.wmsLogCreate.mockResolvedValue({});
  });

  it("stok geri alma başlamadıysa iptal talebini geri alır ve rezervasyonu kurar",async()=>{
    const result=await OrderCancellationService.undoRequest({orderId:782,reason:"Operasyon sorunu giderildi.",actor:{userId:"admin",displayName:"Admin"}});
    expect(result).toEqual({orderNumber:"SIP20261005-720782"});
    expect(mocks.createStockMovement).toHaveBeenCalledWith(tx,expect.objectContaining({
      productId:10,orderId:782,warehouseId:1,movementType:StockMovementType.RESERVATION_CREATE,reservedChange:1,
    }));
    expect(mocks.orderItemUpdate).toHaveBeenCalledWith({where:{id:1},data:{cancelledQuantity:{decrement:1}}});
    expect(mocks.dispatchUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where:{id:"doc-1"},data:expect.objectContaining({status:DispatchDocumentStatus.READY,cancelledAt:null}),
    }));
    expect(mocks.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where:{id:782},data:expect.objectContaining({cancellationStatus:null,cancellationReason:null,stockReserved:true}),
    }));
    expect(mocks.wmsLogCreate).toHaveBeenCalled();
  });

  it("toplama ve paketleme miktarları tutarsızsa iptal geri almayı reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(pendingOrder({
      items: [{
        id: 1, productId: 10, productCode: "P10", quantity: 3,
        pickedQuantity: 1, packedQuantity: 2, shippedQuantity: 0, cancelledQuantity: 1,
      }],
    }));
    await expect(OrderCancellationService.undoRequest({
      orderId: 782, reason: "geri al", actor: { userId: "admin", displayName: "Admin" },
    })).rejects.toThrow("sipariş kalem miktarları tutarsız");
    expect(mocks.stockMovementCount).not.toHaveBeenCalled();
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("kısmi sevkiyat kaydı varsa iptal geri almayı reddeder", async () => {
    mocks.orderFindUnique.mockResolvedValue(pendingOrder({
      items: [{
        id: 1, productId: 10, productCode: "P10", quantity: 3,
        pickedQuantity: 2, packedQuantity: 2, shippedQuantity: 1, cancelledQuantity: 1,
      }],
    }));
    await expect(OrderCancellationService.undoRequest({
      orderId: 782, reason: "geri al", actor: { userId: "admin", displayName: "Admin" },
    })).rejects.toThrow("Fiziksel sevki başlamış");
    expect(mocks.stockMovementCount).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("rezervasyonu bırakılmış e-ticaret siparişinin iptalini geri almaz", async () => {
    mocks.orderFindUnique.mockResolvedValue(pendingOrder({
      source: "ECOMMERCE", stockReserved: false,
    }));
    await expect(OrderCancellationService.undoRequest({
      orderId: 782, reason: "geri al", actor: { userId: "admin", displayName: "Admin" },
    })).rejects.toThrow("E-ticaret rezervasyonu artık aktif değil");
    expect(mocks.stockMovementFindMany).not.toHaveBeenCalled();
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("eksik depo rezervasyonu varsa iptali geri alıp siparişi açmaz", async () => {
    mocks.stockMovementFindMany.mockResolvedValue([]);
    await expect(OrderCancellationService.undoRequest({
      orderId: 782, reason: "geri al", actor: { userId: "admin", displayName: "Admin" },
    })).rejects.toThrow("eksik depo rezervasyonu mevcut");
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderItemUpdate).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("kısmi rezervasyon geri yüklemesiyle iptali geri almaz", async () => {
    mocks.stockMovementFindMany.mockResolvedValue([
      { productId: 10, warehouseId: 1, reservedChange: -2 },
    ]);
    await expect(OrderCancellationService.undoRequest({
      orderId: 782, reason: "geri al", actor: { userId: "admin", displayName: "Admin" },
    })).rejects.toThrow("eksik depo rezervasyonu mevcut");
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("RF stok geri alma başladıysa iptal geri almayı reddeder",async()=>{
    mocks.stockMovementCount.mockResolvedValue(1);
    await expect(OrderCancellationService.undoRequest({orderId:782,reason:"geri al",actor:{userId:"admin",displayName:"Admin"}}))
      .rejects.toThrow("RF stok geri alma başlamış");
    expect(mocks.createStockMovement).not.toHaveBeenCalled();expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("tamamlanmış iptal durumunu geri açmaz",async()=>{
    mocks.orderFindUnique.mockResolvedValue(pendingOrder({status:OrderStatus.CANCELLED,cancellationStatus:"REFUND_PENDING"}));
    await expect(OrderCancellationService.undoRequest({orderId:782,reason:"geri al",actor:{userId:"admin",displayName:"Admin"}}))
      .rejects.toThrow("Yalnızca stok geri alma bekleyen");
    expect(mocks.stockMovementCount).not.toHaveBeenCalled();
  });
});

describe("OrderCancellationService.request ecommerce stock ownership", () => {
  const actor = { userId: "admin", displayName: "Admin" };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx));
    mocks.releaseOrderPlan.mockResolvedValue(undefined);
    mocks.orderItemUpdate.mockResolvedValue({});
    mocks.orderUpdate.mockResolvedValue({});
    mocks.stockMovementFindMany.mockResolvedValue([]);
    mocks.stockMovementCount.mockResolvedValue(1);
    mocks.orderFindUnique.mockResolvedValue({
      id: 782, customerId: 1, orderNumber: "WEB-782", status: OrderStatus.PENDING,
      source: "ECOMMERCE", stockReserved: true, stockDeducted: false,
      paymentStatus: "PENDING", pickingAssignment: null,
      shippingHandlingUnitOrders: [],
      items: [{ id: 1, productId: 10, productCode: "P10", quantity: 1,
        pickedQuantity: 0, packedQuantity: 0, shippedQuantity: 0, cancelledQuantity: 0 }],
    });
  });
  it("kısmi sevk edilmiş siparişi iade sürecine yönlendirir", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 782, customerId: 1, orderNumber: "WEB-782", status: OrderStatus.READY_TO_SHIP,
      cancellationStatus: null, source: "ECOMMERCE", stockReserved: true,
      stockDeducted: false, paymentStatus: "PAID", pickingAssignment: null,
      shippingHandlingUnitOrders: [],
      items: [{ id: 1, productId: 10, productCode: "P10", quantity: 3,
        pickedQuantity: 2, packedQuantity: 2, shippedQuantity: 1, cancelledQuantity: 1 }],
    });
    await expect(OrderCancellationService.request({ orderId: 782, reason: "test", actor }))
      .rejects.toThrow("İade Giriş");
    expect(mocks.releaseOrderPlan).not.toHaveBeenCalled();
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderItemUpdate).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("toplanmış ürün varken iptali stok geri alma bekleme durumunda tutar", async () => {
    mocks.stockMovementCount.mockResolvedValue(0);
    mocks.orderFindUnique.mockResolvedValue({
      id: 782, customerId: 1, orderNumber: "WEB-782", status: OrderStatus.READY_TO_SHIP,
      cancellationStatus: null, source: "ECOMMERCE", stockReserved: true,
      stockDeducted: false, paymentStatus: "PENDING", pickingAssignment: null,
      shippingHandlingUnitOrders: [],
      items: [{ id: 1, productId: 10, productCode: "P10", quantity: 3,
        pickedQuantity: 2, packedQuantity: 2, shippedQuantity: 0, cancelledQuantity: 0 }],
    });
    const result = await OrderCancellationService.request({ orderId: 782, reason: "test", actor });
    expect(result).toEqual({ orderNumber: "WEB-782", stockReturnRequired: true, physicalQuantity: 2 });
    expect(mocks.orderItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 }, data: { cancelledQuantity: { increment: 1 } },
    });
    expect(mocks.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cancellationStatus: "STOCK_RETURN_PENDING" }),
    }));
    expect(mocks.orderUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
    }));
  });

  it("rejects repeated cancellation requests before touching reservations", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 782, customerId: 1, orderNumber: "WEB-782", status: OrderStatus.PENDING,
      cancellationStatus: "STOCK_RETURN_PENDING",
      source: "ECOMMERCE", stockReserved: true, stockDeducted: false,
      paymentStatus: "PENDING", pickingAssignment: null, shippingHandlingUnitOrders: [],
      items: [{ id: 1, productId: 10, productCode: "P10", quantity: 2,
        pickedQuantity: 1, packedQuantity: 1, shippedQuantity: 0, cancelledQuantity: 1 }],
    });
    await expect(OrderCancellationService.request({ orderId: 782, reason: "again", actor }))
      .rejects.toThrow("aktif iptal talebi zaten mevcut");
    expect(mocks.releaseOrderPlan).not.toHaveBeenCalled();
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderItemUpdate).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects inconsistent picked and cancelled quantities before touching stock", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 782, customerId: 1, orderNumber: "WEB-782", status: OrderStatus.PENDING,
      source: "ECOMMERCE", stockReserved: true, stockDeducted: false,
      paymentStatus: "PENDING", pickingAssignment: null, shippingHandlingUnitOrders: [],
      items: [{ id: 1, productId: 10, productCode: "P10", quantity: 1,
        pickedQuantity: 1, packedQuantity: 0, shippedQuantity: 0, cancelledQuantity: 1 }],
    });
    await expect(OrderCancellationService.request({ orderId: 782, reason: "test", actor }))
      .rejects.toThrow("kalem miktarları tutarsız");
    expect(mocks.releaseOrderPlan).not.toHaveBeenCalled();
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("blocks cancellation when checkout and warehouse reservation ownership overlap", async () => {
    await expect(OrderCancellationService.request({ orderId: 782, reason: "test", actor }))
      .rejects.toThrow("stok mutabakatı gerekli");
    expect(mocks.releaseOrderPlan).not.toHaveBeenCalled();
    expect(mocks.orderItemUpdate).not.toHaveBeenCalled();
    expect(mocks.createStockMovement).not.toHaveBeenCalled();
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });
});
