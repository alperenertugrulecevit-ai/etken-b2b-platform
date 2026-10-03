import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerAccountPaymentMethod,
  OrderSource,
  OrderStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { refundCancelledEcommerceOrder } from "@/app/admin/e-ticaret/orders/actions";

const mocks=vi.hoisted(()=>({
  requirePermission:vi.fn(),transaction:vi.fn(),orderFindUnique:vi.fn(),orderUpdate:vi.fn(),
  accountFindFirst:vi.fn(),accountCreate:vi.fn(),historyCreate:vi.fn(),revalidatePath:vi.fn(),redirect:vi.fn(),
}));
const tx={
  order:{findUnique:mocks.orderFindUnique,update:mocks.orderUpdate},
  customerAccountEntry:{findFirst:mocks.accountFindFirst,create:mocks.accountCreate},
  orderStatusHistory:{create:mocks.historyCreate},
};
vi.mock("@/modules/authorization/services/authorization.service",()=>({AuthorizationService:{requirePermission:mocks.requirePermission}}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidatePath}));
vi.mock("next/navigation",()=>({redirect:mocks.redirect}));

function form(ref="REFUND-123"){const f=new FormData();f.set("refundReference",ref);return f;}
function order(overrides:Record<string,unknown>={}){return {
  id:80,orderNumber:"WEB-80",customerId:8,source:OrderSource.ECOMMERCE,status:OrderStatus.CANCELLED,
  paymentStatus:"PAID",totalAmount:500,...overrides,
};}

describe("refundCancelledEcommerceOrder",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({id:"admin",username:"admin",employee:null});
    mocks.transaction.mockImplementation(async(cb:(client:typeof tx)=>Promise<unknown>)=>cb(tx));
    mocks.orderFindUnique.mockResolvedValue(order());
    mocks.accountFindFirst.mockResolvedValueOnce({id:1,amount:500}).mockResolvedValueOnce(null);
    mocks.accountCreate.mockResolvedValue({id:2});mocks.orderUpdate.mockResolvedValue({id:80});mocks.historyCreate.mockResolvedValue({id:3});
  });
  it("iptal edilmiş ödenmiş siparişin banka iadesini kaydeder",async()=>{
    await refundCancelledEcommerceOrder(80,form());
    expect(mocks.accountCreate).toHaveBeenCalledWith({data:expect.objectContaining({
      customerId:8,orderId:80,direction:CustomerAccountEntryDirection.DEBIT,entryType:CustomerAccountEntryType.REFUND,
      paymentMethod:CustomerAccountPaymentMethod.BANK_TRANSFER,amount:500,referenceNo:"REFUND-123",
    })});
    expect(mocks.orderUpdate).toHaveBeenCalledWith({where:{id:80},data:{paymentStatus:"REFUNDED",paymentReference:"REFUND-123"}});
    expect(mocks.historyCreate).toHaveBeenCalledWith({data:expect.objectContaining({orderId:80,status:OrderStatus.CANCELLED,note:"Ödemeniz iade edildi.",visibleToCustomer:true})});
  });
  it("iptal edilmemiş siparişte iadeyi reddeder",async()=>{
    mocks.orderFindUnique.mockResolvedValue(order({status:OrderStatus.PENDING}));
    await expect(refundCancelledEcommerceOrder(80,form())).rejects.toThrow("önce sipariş iptal edilmelidir");
  });
  it("ödenmemiş siparişte iadeyi reddeder",async()=>{
    mocks.orderFindUnique.mockResolvedValue(order({paymentStatus:"PENDING"}));
    await expect(refundCancelledEcommerceOrder(80,form())).rejects.toThrow("ödemesi onaylanmış");
  });
  it("mükerrer iadeyi reddeder",async()=>{
    mocks.accountFindFirst.mockReset().mockResolvedValueOnce({id:1,amount:500}).mockResolvedValueOnce({id:2});
    await expect(refundCancelledEcommerceOrder(80,form())).rejects.toThrow("daha önce kaydedilmiş");
  });
});
