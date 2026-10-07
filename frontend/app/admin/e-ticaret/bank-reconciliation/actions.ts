"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { BankReconciliationService } from "@/modules/ecommerce/services/bank-reconciliation.service";

function actorName(user: Awaited<ReturnType<typeof AuthorizationService.requirePermission>>) {
  return user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.username;
}

export async function matchBankTransactionAction(formData: FormData) {
  const user=await AuthorizationService.requirePermission("ORDER_MANAGE");
  const transactionId=String(formData.get("transactionId")??"").trim();
  const orderId=Number(formData.get("orderId"));
  if(!transactionId||!Number.isInteger(orderId)||orderId<=0) throw new Error("Banka hareketi ve sipariş zorunludur.");
  await BankReconciliationService.matchTransaction({transactionId,orderId,actor:{userId:user.id,displayName:actorName(user)}});
  revalidatePath("/admin/e-ticaret/bank-reconciliation");
  revalidatePath("/admin/e-ticaret/orders");
  revalidatePath("/account/orders");
  revalidatePath("/order-tracking");
}

export async function ignoreBankTransactionAction(formData: FormData) {
  const user=await AuthorizationService.requirePermission("ORDER_MANAGE");
  const transactionId=String(formData.get("transactionId")??"").trim();
  if(!transactionId) throw new Error("Banka hareketi zorunludur.");
  await BankReconciliationService.ignoreTransaction(transactionId,{userId:user.id,displayName:actorName(user)});
  revalidatePath("/admin/e-ticaret/bank-reconciliation");
}

function csvCells(line:string){return line.split(";").map(x=>x.trim().replace(/^"|"$/g,""));}
export async function addManualBankTransactionAction(formData:FormData){
 await AuthorizationService.requirePermission("ORDER_MANAGE");
 const bankAccountId=Number(formData.get("bankAccountId")),amount=Number(String(formData.get("amount")??"").replace(",","."));
 const transactionDate=new Date(String(formData.get("transactionDate")??""));
 if(!Number.isInteger(bankAccountId)||bankAccountId<=0||!Number.isFinite(amount)||amount<=0||!Number.isFinite(transactionDate.getTime()))throw new Error("Banka hesabı, tarih ve tutar zorunludur.");
 await BankReconciliationService.importTransactions([{bankAccountId,externalId:String(formData.get("externalId")??"MANUAL-"+Date.now()).trim(),transactionDate,amount,currency:String(formData.get("currency")??"TRY"),senderName:String(formData.get("senderName")??"")||null,senderIban:String(formData.get("senderIban")??"")||null,description:String(formData.get("description")??"")||null,bankReference:String(formData.get("bankReference")??"")||null,rawPayload:{source:"MANUAL_ADMIN"}}]);
 revalidatePath("/admin/e-ticaret/bank-reconciliation");
}
export async function importBankStatementCsvAction(formData:FormData){
 await AuthorizationService.requirePermission("ORDER_MANAGE");
 const bankAccountId=Number(formData.get("bankAccountId")); const file=formData.get("file");
 if(!Number.isInteger(bankAccountId)||bankAccountId<=0||!(file instanceof File)||file.size===0)throw new Error("Banka hesabı ve CSV dosyası zorunludur.");
 if(file.size>2_000_000)throw new Error("CSV dosyası en fazla 2 MB olabilir.");
 const text=await file.text(); const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
 const rows=lines.slice(1).map((line,index)=>{const [date,amount,currency,senderName,senderIban,description,bankReference,externalId]=csvCells(line);return {bankAccountId,transactionDate:new Date(date),amount:Number((amount??"").replace(",",".")),currency:currency||"TRY",senderName:senderName||null,senderIban:senderIban||null,description:description||null,bankReference:bankReference||null,externalId:externalId||`CSV-${bankAccountId}-${index}-${date}-${amount}`,rawPayload:{source:"CSV_ADMIN"}};}).filter(x=>Number.isFinite(x.transactionDate.getTime())&&Number.isFinite(x.amount)&&x.amount>0);
 if(!rows.length)throw new Error("CSV içinde geçerli banka hareketi bulunamadı.");
 await BankReconciliationService.importTransactions(rows); revalidatePath("/admin/e-ticaret/bank-reconciliation");
}
