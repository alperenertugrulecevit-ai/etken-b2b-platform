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
