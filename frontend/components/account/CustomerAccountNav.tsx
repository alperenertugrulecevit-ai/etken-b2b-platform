import Link from "next/link";

import CustomerLogoutButton from "@/components/account/CustomerLogoutButton";

export default function CustomerAccountNav(){
 return <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-end gap-2 px-4 pt-4 sm:px-6 lg:px-8">
  <Link href="/account" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">Hesap Menüsü</Link>
  <CustomerLogoutButton />
 </div>;
}
