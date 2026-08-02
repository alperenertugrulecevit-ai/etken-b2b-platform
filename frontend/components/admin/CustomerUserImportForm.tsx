"use client";

import { useActionState } from "react";
import {
  importCustomerUsersAction,
  type CustomerUserActionState,
} from "@/app/admin/customers/[id]/users/actions";

const INITIAL_STATE: CustomerUserActionState = { success: false, message: "" };

export default function CustomerUserImportForm({ customerId }: { customerId: number }) {
  const [state, formAction, pending] = useActionState(
    importCustomerUsersAction.bind(null, customerId), INITIAL_STATE
  );
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Excel ile Toplu Kullanıcı</h2><p className="mt-2 text-sm text-slate-500">CSV şablonunu Excel ile doldurabilir veya aynı kolonlara sahip XLSX yükleyebilirsiniz.</p></div>
        <a href={"/admin/customers/" + customerId + "/users/template"} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50">Şablonu İndir</a>
      </div>
      <form action={formAction} className="mt-5 flex flex-wrap items-center gap-3">
        <input name="file" type="file" required accept=".csv,.xlsx" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2" />
        <button disabled={pending} className="rounded-lg bg-slate-900 px-5 py-2.5 font-bold text-white disabled:bg-slate-400">{pending ? "Aktarılıyor..." : "Kullanıcıları Aktar"}</button>
      </form>
      {state.message ? <div className={(state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700") + " mt-4 rounded-lg p-3 text-sm font-semibold"}>{state.message}</div> : null}
      {state.credentials?.length ? <div className="mt-5 overflow-x-auto rounded-lg border border-orange-200"><p className="bg-orange-50 p-3 text-sm font-bold text-orange-900">Geçici şifreler yalnızca bu sonuç ekranında gösterilir.</p><table className="min-w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Ad Soyad</th><th className="p-3">Kullanıcı</th><th className="p-3">Geçici Şifre</th></tr></thead><tbody>{state.credentials.map((item) => <tr key={item.username} className="border-t"><td className="p-3">{item.fullName}</td><td className="p-3 font-bold">{item.username}</td><td className="p-3 font-mono font-bold">{item.password}</td></tr>)}</tbody></table></div> : null}
    </section>
  );
}
