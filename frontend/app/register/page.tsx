import Link from "next/link";
import Header from "@/components/layout/Header";
import IndividualRegisterForm from "@/components/auth/IndividualRegisterForm";

export const metadata={title:"Üye Ol | ETKEN Ofis"};

export default function RegisterPage(){
 return <><Header/><main className="min-h-screen bg-slate-100 px-4 py-10"><section className="mx-auto max-w-xl rounded-2xl bg-white p-7 shadow-sm">
  <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">Bireysel Müşteri</p>
  <h1 className="mt-2 text-3xl font-black text-slate-900">Üye Ol</h1>
  <p className="mb-6 mt-2 text-sm text-slate-600">Siparişlerinizi, adreslerinizi ve sipariş durumlarınızı tek hesaptan yönetin.</p>
  <IndividualRegisterForm/>
  <p className="mt-6 text-center text-sm text-slate-600">Zaten üye misiniz? <Link href="/customer-login" className="font-black text-[#EF4B23]">Giriş Yap</Link></p>
 </section></main></>;
}
