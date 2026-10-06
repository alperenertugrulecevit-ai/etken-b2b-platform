import {
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  EcommerceReturnRefundStatus,
  OrderSource,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EcommerceAccountLedgerIntegrityService } from "@/modules/ecommerce/services/ecommerce-account-ledger-integrity.service";

const mocks=vi.hoisted(()=>({
  transaction:vi.fn(), orderFindMany:vi.fn(), orderFindUnique:vi.fn(), accountCreate:vi.fn(),
}));
const tx={
  order:{findMany:mocks.orderFindMany,findUnique:mocks.orderFindUnique},
  customerAccountEntry:{create:mocks.accountCreate},
};
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));

describe("EcommerceAccountLedgerIntegrityService",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async(cb:(client:typeof tx)=>Promise<unknown>)=>cb(tx));
    mocks.orderFindMany.mockResolvedValue([{id:10}]);
    mocks.accountCreate.mockResolvedValue({id:1});
  });

  it("PAID siparişte eksik ORDER ve PAYMENT çiftini tamamlar",async()=>{
    mocks.orderFindUnique.mockResolvedValue({
      id:10,orderNumber:"WEB-10",customerId:5,source:OrderSource.ECOMMERCE,totalAmount:100,
      paymentStatus:"PAID",paymentReference:"BANK-10",accountEntries:[],ecommerceReturns:[],
    });
    const result=await EcommerceAccountLedgerIntegrityService.repair({userId:"u1",displayName:"Finans"});
    expect(result.createdOrderDebits).toBe(1);
    expect(result.createdPayments).toBe(1);
    expect(mocks.accountCreate).toHaveBeenCalledWith({data:expect.objectContaining({
      entryType:CustomerAccountEntryType.ORDER,direction:CustomerAccountEntryDirection.DEBIT,amount:100,
    })});
    expect(mocks.accountCreate).toHaveBeenCalledWith({data:expect.objectContaining({
      entryType:CustomerAccountEntryType.PAYMENT,direction:CustomerAccountEntryDirection.CREDIT,amount:100,
    })});
  });

  it("mevcut hareketleri ikinci kez oluşturmaz",async()=>{
    mocks.orderFindUnique.mockResolvedValue({
      id:10,orderNumber:"WEB-10",customerId:5,source:OrderSource.ECOMMERCE,totalAmount:100,
      paymentStatus:"PAID",paymentReference:"BANK-10",
      accountEntries:[
        {id:1,entryType:CustomerAccountEntryType.ORDER,direction:CustomerAccountEntryDirection.DEBIT,amount:100,ecommerceReturnRefundId:null},
        {id:2,entryType:CustomerAccountEntryType.PAYMENT,direction:CustomerAccountEntryDirection.CREDIT,amount:100,ecommerceReturnRefundId:null},
      ],ecommerceReturns:[],
    });
    const result=await EcommerceAccountLedgerIntegrityService.repair({userId:"u1",displayName:"Finans"});
    expect(result.createdOrderDebits).toBe(0);
    expect(result.createdPayments).toBe(0);
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("kanıtlı refund cari kaydı varsa eksik iade ters kaydını tamamlar",async()=>{
    mocks.orderFindUnique.mockResolvedValue({
      id:10,orderNumber:"WEB-10",customerId:5,source:OrderSource.ECOMMERCE,totalAmount:100,
      paymentStatus:"REFUNDED",paymentReference:"BANK-10",
      accountEntries:[
        {id:1,entryType:CustomerAccountEntryType.ORDER,direction:CustomerAccountEntryDirection.DEBIT,amount:100,ecommerceReturnRefundId:null},
        {id:2,entryType:CustomerAccountEntryType.PAYMENT,direction:CustomerAccountEntryDirection.CREDIT,amount:100,ecommerceReturnRefundId:null},
        {id:3,entryType:CustomerAccountEntryType.REFUND,direction:CustomerAccountEntryDirection.DEBIT,amount:40,ecommerceReturnRefundId:"r1"},
      ],
      ecommerceReturns:[{refunds:[{id:"r1",amount:40,status:EcommerceReturnRefundStatus.REFUNDED,providerReference:"REF-1",completedAt:new Date()}]}],
    });
    const result=await EcommerceAccountLedgerIntegrityService.repair({userId:"u1",displayName:"Finans"});
    expect(result.createdReturnCredits).toBe(1);
    expect(mocks.accountCreate).toHaveBeenCalledWith({data:expect.objectContaining({
      entryType:CustomerAccountEntryType.ADJUSTMENT,direction:CustomerAccountEntryDirection.CREDIT,amount:40,
    })});
  });

  it("refund finans kaydı var ama cari refund kanıtı yoksa para hareketi uydurmaz",async()=>{
    mocks.orderFindUnique.mockResolvedValue({
      id:10,orderNumber:"WEB-10",customerId:5,source:OrderSource.ECOMMERCE,totalAmount:100,
      paymentStatus:"REFUNDED",paymentReference:"BANK-10",
      accountEntries:[
        {id:1,entryType:CustomerAccountEntryType.ORDER,direction:CustomerAccountEntryDirection.DEBIT,amount:100,ecommerceReturnRefundId:null},
        {id:2,entryType:CustomerAccountEntryType.PAYMENT,direction:CustomerAccountEntryDirection.CREDIT,amount:100,ecommerceReturnRefundId:null},
      ],
      ecommerceReturns:[{refunds:[{id:"r1",amount:40,status:EcommerceReturnRefundStatus.REFUNDED,providerReference:null,completedAt:new Date()}]}],
    });
    const result=await EcommerceAccountLedgerIntegrityService.repair({userId:"u1",displayName:"Finans"});
    expect(result.skippedRefundsWithoutProof).toBe(1);
    expect(result.createdReturnCredits).toBe(0);
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });
});
