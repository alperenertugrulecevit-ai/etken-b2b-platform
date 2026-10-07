import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEcommerceReturnPreReceipt } from "@/app/rf/ecommerce-return-pre-receipt/actions";

const mocks=vi.hoisted(()=>({
  requireRfAccess:vi.fn(),transaction:vi.fn(),warehouseFindFirst:vi.fn(),carrierFindFirst:vi.fn(),
  preFindFirst:vi.fn(),returnOrderFindFirst:vi.fn(),ecommerceReturnFindFirst:vi.fn(),orderItemFindMany:vi.fn(),
  returnItemGroupBy:vi.fn(),ecommerceReturnCreate:vi.fn(),ecommerceReturnUpdate:vi.fn(),preCreate:vi.fn(),revalidatePath:vi.fn(),
}));
const tx={
  warehouse:{findFirst:mocks.warehouseFindFirst},shippingCarrier:{findFirst:mocks.carrierFindFirst},
  ecommerceReturnPreReceipt:{findFirst:mocks.preFindFirst,create:mocks.preCreate},
  returnOrder:{findFirst:mocks.returnOrderFindFirst},ecommerceReturn:{findFirst:mocks.ecommerceReturnFindFirst,create:mocks.ecommerceReturnCreate,update:mocks.ecommerceReturnUpdate},
  orderItem:{findMany:mocks.orderItemFindMany},ecommerceReturnItem:{groupBy:mocks.returnItemGroupBy},
};
vi.mock("@/modules/authorization/services/authorization.service",()=>({AuthorizationService:{requireRfAccess:mocks.requireRfAccess}}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidatePath}));

function form(){
  const f=new FormData();f.set("carrierId","carrier-1");f.set("warehouseId","1");f.set("mode","RETURN_CODE");f.set("scannedCode","IADE-001");return f;
}
describe("RF e-ticaret iade ön kabul miktar koruması",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.requireRfAccess.mockResolvedValue({id:"rf-1",username:"rf",employee:null});
    mocks.transaction.mockImplementation(async(cb:(client:typeof tx)=>Promise<unknown>)=>cb(tx));
    mocks.warehouseFindFirst.mockResolvedValue({id:1,code:"DP01"});mocks.carrierFindFirst.mockResolvedValue({id:"carrier-1",name:"Kargo"});
    mocks.preFindFirst.mockResolvedValue(null);mocks.ecommerceReturnFindFirst.mockResolvedValue(null);
    mocks.returnOrderFindFirst.mockResolvedValue({
      originalOrder:{id:10,orderNumber:"SIP-10",orderType:"ECOMMERCE"},
      items:[{orderItemId:101,productId:1,productCode:"P1",productBarcode:"B1",productName:"Ürün",expectedQuantity:3}],
    });
    mocks.orderItemFindMany.mockResolvedValue([{id:101,shippedQuantity:3}]);
    mocks.returnItemGroupBy.mockResolvedValue([{orderItemId:101,_sum:{receivedQuantity:2}}]);
    mocks.ecommerceReturnCreate.mockResolvedValue({id:"er-2"});mocks.preCreate.mockResolvedValue({id:"pre-2"});
  });
  it("müşterinin ETI iade kodunu doğrudan eşleştirir ve REQUESTED talebi ön kabule taşır",async()=>{
    mocks.ecommerceReturnFindFirst.mockResolvedValue({
      id:"customer-er-1",status:"REQUESTED",
      originalOrder:{id:10,orderNumber:"SIP-10",orderType:"ECOMMERCE"},
    });
    mocks.ecommerceReturnUpdate.mockResolvedValue({id:"customer-er-1",status:"PRE_RECEIVED"});
    const result=await createEcommerceReturnPreReceipt({success:false,message:""},form());
    expect(result.success).toBe(true);
    expect(mocks.ecommerceReturnUpdate).toHaveBeenCalledWith({where:{id:"customer-er-1"},data:{status:"PRE_RECEIVED"}});
    expect(mocks.returnOrderFindFirst).not.toHaveBeenCalled();
    expect(mocks.ecommerceReturnCreate).not.toHaveBeenCalled();
    expect(mocks.preCreate).toHaveBeenCalledWith({data:expect.objectContaining({
      originalOrderId:10,ecommerceReturnId:"customer-er-1",matchStatus:"MATCHED",outcome:"RETURN_ENTRY_PENDING",
    })});
  });
  it("önceki iadeleri düşerek yeni dosyayı kalan sevk miktarıyla sınırlar",async()=>{
    const result=await createEcommerceReturnPreReceipt({success:false,message:""},form());
    expect(result.success).toBe(true);
    expect(mocks.ecommerceReturnCreate).toHaveBeenCalledWith({data:expect.objectContaining({
      originalOrderId:10,
      items:{create:[expect.objectContaining({orderItemId:101,expectedQuantity:1})]},
    })});
  });
  it("sevk edilen miktarın tamamı daha önce iade alındıysa yeni iade dosyası açmaz",async()=>{
    mocks.returnItemGroupBy.mockResolvedValue([{orderItemId:101,_sum:{receivedQuantity:3}}]);
    const result=await createEcommerceReturnPreReceipt({success:false,message:""},form());
    expect(result.success).toBe(false);
    expect(result.message).toContain("iade kabulüne açık sevk edilmiş ürün kalmadı");
    expect(mocks.ecommerceReturnCreate).not.toHaveBeenCalled();
    expect(mocks.preCreate).not.toHaveBeenCalled();
  });
});
