"use server";
import { AccountingDocumentType,AccountingMovementType,AccountingPartyType,AccountingPaymentType,CustomerAccountEntryDirection,CustomerAccountEntryType,CustomerAccountPaymentMethod,Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

const movementByDocument:Record<AccountingDocumentType,AccountingMovementType>={
 MEAL:AccountingMovementType.EXPENSE,FUEL:AccountingMovementType.EXPENSE,ENERGY:AccountingMovementType.EXPENSE,
 TELECOMMUNICATION:AccountingMovementType.EXPENSE,CONSUMABLE:AccountingMovementType.EXPENSE,WATER:AccountingMovementType.EXPENSE,
 OTHER_INCOME:AccountingMovementType.INCOME,OTHER_EXPENSE:AccountingMovementType.EXPENSE,
 PAYMENT_RECEIPT:AccountingMovementType.PAYMENT_OUT,INCOME_RECEIPT:AccountingMovementType.PAYMENT_IN,
};
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const parseDate=(v:FormDataEntryValue|null)=>{const s=String(v??"").trim();if(!s)return null;const d=new Date(s+"T12:00:00+03:00");return Number.isNaN(d.getTime())?null:d;};
export async function createAccountingEntry(formData:FormData){
 const profile=await AuthorizationService.requireAdminPortalAccess();
 const documentType=String(formData.get("documentType")??"") as AccountingDocumentType;
 if(!Object.values(AccountingDocumentType).includes(documentType)) redirect("/admin/accounting?error="+encodeURIComponent("Geçerli belge türü seçin."));
 const partyType=String(formData.get("partyType")??"OTHER") as AccountingPartyType;
 const customerId=partyType==="CUSTOMER"?Number(formData.get("customerId")):null;
 const supplierId=partyType==="SUPPLIER"?Number(formData.get("supplierId")):null;
 let companyName=String(formData.get("companyName")??"").trim();
 if(customerId){const c=await prisma.customer.findUnique({where:{id:customerId},select:{companyName:true}});if(!c)redirect("/admin/accounting?error=Müşteri bulunamadı.");companyName=c.companyName;}
 if(supplierId){const s=await prisma.supplier.findUnique({where:{id:supplierId},select:{name:true}});if(!s)redirect("/admin/accounting?error=Tedarikçi bulunamadı.");companyName=s.name;}
 if(!companyName) redirect("/admin/accounting?error="+encodeURIComponent("Firma zorunludur."));
 const netAmount=Number(formData.get("netAmount")),vatAmount=Number(formData.get("vatAmount")??0);
 if(!Number.isFinite(netAmount)||netAmount<0||!Number.isFinite(vatAmount)||vatAmount<0) redirect("/admin/accounting?error="+encodeURIComponent("Tutar ve KDV geçerli olmalıdır."));
 const paymentRaw=String(formData.get("paymentType")??"").trim();
 const paymentType=Object.values(AccountingPaymentType).includes(paymentRaw as AccountingPaymentType)?paymentRaw as AccountingPaymentType:null;
 const transactionDate=parseDate(formData.get("transactionDate"))??new Date();
 const documentNo=String(formData.get("documentNo")??"").trim()||null;
 const bankReference=String(formData.get("bankReference")??"").trim()||null;
 const description=String(formData.get("description")??"").trim().slice(0,500)||null;
 const totalAmount=money(netAmount+vatAmount);
 await prisma.$transaction(async tx=>{
  await tx.accountingEntry.create({data:{
   transactionDate,companyName,partyType,customerId,supplierId,documentType,movementType:movementByDocument[documentType],
   documentNo,paymentType,netAmount:money(netAmount),vatAmount:money(vatAmount),totalAmount,description,
   bankName:String(formData.get("bankName")??"").trim()||null,bankReference,dueDate:parseDate(formData.get("dueDate")),
   createdByUserId:profile.id,createdByName:profile.employee?`${profile.employee.firstName} ${profile.employee.lastName}`:profile.username,
  }});
  if(customerId&&documentType===AccountingDocumentType.INCOME_RECEIPT){
   await tx.customerAccountEntry.create({data:{
    customerId,direction:CustomerAccountEntryDirection.CREDIT,entryType:CustomerAccountEntryType.PAYMENT,
    paymentMethod:CustomerAccountPaymentMethod.BANK_TRANSFER,amount:totalAmount,currency:"TRY",
    description:description||"Muhasebeleştirme ekranından gelen havale / tahsilat.",
    referenceNo:bankReference||documentNo,transactionDate,createdByUserId:profile.id,createdByUsername:profile.username,
   }});
  }
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 revalidatePath("/admin/accounting");revalidatePath("/admin/accounting/reconciliation");
 redirect("/admin/accounting?success=1");
}
