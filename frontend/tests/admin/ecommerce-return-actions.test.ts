import { EcommerceReturnRefundStatus, EcommerceReturnStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completePartialEcommerceReturnReceiving, matchEcommercePreReceiptToOrder } from "@/app/admin/e-ticaret/returns/actions";

const mocks=vi.hoisted(()=>({
  requireAdminPortalAccess:vi.fn(),
  transaction:vi.fn(),
  returnFindUnique:vi.fn(),
  returnUpdate:vi.fn(),
  preReceiptFindUnique:vi.fn(),
  orderFindUnique:vi.fn(),
  revalidatePath:vi.fn(),
}));

const tx={
  ecommerceReturn:{
    findUnique:mocks.returnFindUnique,
    update:mocks.returnUpdate,
  },
  ecommerceReturnPreReceipt:{findUnique:mocks.preReceiptFindUnique},
  order:{findUnique:mocks.orderFindUnique},
};

vi.mock("@/modules/authorization/services/authorization.service",()=>({
  AuthorizationService:{requireAdminPortalAccess:mocks.requireAdminPortalAccess},
}));
vi.mock("@/lib/prisma",()=>({
  prisma:{$transaction:mocks.transaction},
}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidatePath}));
vi.mock("@/lib/stock/stock-service",()=>({createStockMovementWithTransaction:vi.fn()}));
vi.mock("@/modules/ecommerce/services/ecommerce-notification.service",()=>({
  EcommerceNotificationService:{send:vi.fn()},
}));

function form(id="return-1"){
  const data=new FormData();
  data.set("ecommerceReturnId",id);
  return data;
}

function partialReturn(overrides:Record<string,unknown>={}){
  return {
    id:"return-1",
    status:EcommerceReturnStatus.RECEIVING,
    refundStatus:EcommerceReturnRefundStatus.ELIGIBLE,
    receivedAt:null,
    refunds:[],
    items:[
      {expectedQuantity:3,receivedQuantity:1,refundStatus:EcommerceReturnRefundStatus.ELIGIBLE,refundAmount:100},
      {expectedQuantity:2,receivedQuantity:0,refundStatus:EcommerceReturnRefundStatus.WAITING,refundAmount:0},
    ],
    ...overrides,
  };
}

describe("completePartialEcommerceReturnReceiving",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.requireAdminPortalAccess.mockResolvedValue({id:"admin"});
    mocks.transaction.mockImplementation(async(cb:(client:typeof tx)=>Promise<unknown>)=>cb(tx));
    mocks.returnFindUnique.mockResolvedValue(partialReturn());
    mocks.returnUpdate.mockResolvedValue({id:"return-1"});
  });

  it("yalnız gelen ürünlerle depo kabulünü tamamlar ve uygun iade tutarını korur",async()=>{
    await completePartialEcommerceReturnReceiving(form());
    expect(mocks.returnUpdate).toHaveBeenCalledWith({
      where:{id:"return-1"},
      data:expect.objectContaining({
        status:EcommerceReturnStatus.WAREHOUSE_COMPLETED,
        refundStatus:EcommerceReturnRefundStatus.ELIGIBLE,
        warehouseCompletedAt:expect.any(Date),
        receivedAt:expect.any(Date),
      }),
    });
  });

  it("hiç ürün gelmediyse kısmi kabulü kapatmaz",async()=>{
    mocks.returnFindUnique.mockResolvedValue(partialReturn({
      items:[{expectedQuantity:3,receivedQuantity:0,refundStatus:EcommerceReturnRefundStatus.WAITING,refundAmount:0}],
    }));
    await expect(completePartialEcommerceReturnReceiving(form())).rejects.toThrow("Hiç ürün kabul edilmeden");
  });

  it("tüm beklenen ürünler zaten geldiyse kısmi tamamlama çalıştırmaz",async()=>{
    mocks.returnFindUnique.mockResolvedValue(partialReturn({
      items:[{expectedQuantity:1,receivedQuantity:1,refundStatus:EcommerceReturnRefundStatus.ELIGIBLE,refundAmount:100}],
    }));
    await expect(completePartialEcommerceReturnReceiving(form())).rejects.toThrow("zaten kabul edilmiş");
  });

  it("depo kabulü kapanmış dosyayı tekrar tamamlamaz",async()=>{
    mocks.returnFindUnique.mockResolvedValue(partialReturn({status:EcommerceReturnStatus.WAREHOUSE_COMPLETED}));
    await expect(completePartialEcommerceReturnReceiving(form())).rejects.toThrow("uygun değil");
  });

  it("finans süreci başlamış dosyanın depo kabulünü değiştirmez",async()=>{
    mocks.returnFindUnique.mockResolvedValue(partialReturn({
      refunds:[{status:EcommerceReturnRefundStatus.REQUESTED}],
    }));
    await expect(completePartialEcommerceReturnReceiving(form())).rejects.toThrow("Finans süreci başlamış");
  });
});


describe("matchEcommercePreReceiptToOrder shipment gate",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.requireAdminPortalAccess.mockResolvedValue({id:"admin"});
    mocks.transaction.mockImplementation(async(cb:(client:typeof tx)=>Promise<unknown>)=>cb(tx));
    mocks.preReceiptFindUnique.mockResolvedValue({id:"pre-1",outcome:"UNDELIVERED_RETURN",mode:"CARGO_BARCODE",scannedCode:"KARGO-1"});
  });

  it("READY_TO_SHIP siparişi fiziksel sevk öncesi iadeye almaz",async()=>{
    mocks.orderFindUnique.mockResolvedValue({id:10,orderNumber:"SIP-10",orderType:"ECOMMERCE",status:"READY_TO_SHIP",items:[]});
    const data=new FormData();
    data.set("preReceiptId","pre-1");
    data.set("orderNumber","SIP-10");
    await expect(matchEcommercePreReceiptToOrder(data)).rejects.toThrow("fiziksel olarak sevk edilmiş");
  });
});
