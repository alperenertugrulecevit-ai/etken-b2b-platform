import {
  OrderSource,
  OrderStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { refundCancelledEcommerceOrder } from "@/app/admin/e-ticaret/orders/actions";

const mocks=vi.hoisted(()=>({
  requirePermission:vi.fn(),transaction:vi.fn(),orderFindUnique:vi.fn(),orderUpdate:vi.fn(),
  accountFindFirst:vi.fn(),accountCreate:vi.fn(),historyCreate:vi.fn(),revalidatePath:vi.fn(),redirect:vi.fn(),refundComplete:vi.fn(),
}));
vi.mock("@/modules/authorization/services/authorization.service",()=>({AuthorizationService:{requirePermission:mocks.requirePermission}}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction,order:{findUnique:mocks.orderFindUnique}}}));
vi.mock("@/modules/orders/services/order-cancellation.service",()=>({OrderCancellationService:{completeRefund:mocks.refundComplete}}));
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
    mocks.orderFindUnique.mockResolvedValue({
      id:80,orderNumber:"WEB-80",source:OrderSource.ECOMMERCE,status:OrderStatus.CANCELLED,
      paymentStatus:"REFUND_PENDING",cancellationStatus:"REFUND_PENDING",cancellationRefundStatus:"PENDING",
      ecommerceEmail:"musteri@example.com",
    });
    mocks.refundComplete.mockResolvedValue({orderNumber:"WEB-80",amount:500});
  });
  it("iptal edilmiş ödenmiş siparişin gerçek para iadesini merkezi serviste tamamlar",async()=>{
    await refundCancelledEcommerceOrder(80,form());
    expect(mocks.refundComplete).toHaveBeenCalledWith(expect.objectContaining({
      orderId:80,reference:"REFUND-123",actor:expect.objectContaining({userId:"admin"}),
    }));
  });
  it("iptal edilmemiş siparişte iadeyi reddeder",async()=>{
    mocks.orderFindUnique.mockResolvedValue({...order({status:OrderStatus.PENDING}),source:OrderSource.ECOMMERCE,ecommerceEmail:null,cancellationStatus:null,cancellationRefundStatus:null});
    await expect(refundCancelledEcommerceOrder(80,form())).rejects.toThrow("önce sipariş iptal edilmelidir");
  });
  it("ödenmemiş siparişte iadeyi reddeder",async()=>{
    mocks.orderFindUnique.mockResolvedValue({...order({paymentStatus:"PENDING"}),source:OrderSource.ECOMMERCE,ecommerceEmail:null,cancellationStatus:"COMPLETED",cancellationRefundStatus:"NOT_REQUIRED"});
    await expect(refundCancelledEcommerceOrder(80,form())).rejects.toThrow("ödemesi onaylanmış");
  });
});
