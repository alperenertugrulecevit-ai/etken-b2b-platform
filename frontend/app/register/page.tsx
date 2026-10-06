import Link from "next/link";
import Header from "@/components/layout/Header";
import IndividualRegisterForm from "@/components/auth/IndividualRegisterForm";
import CorporateRegisterForm from "@/components/auth/CorporateRegisterForm";

export const metadata={title:"Üye Ol | ETKEN Ofis"};

type RegisterPageProps={searchParams:Promise<{type?:string}>};

export default async function RegisterPage({searchParams}:RegisterPageProps){
 const query=await searchParams;
 const type=query.type==="corporate"?"corporate":query.type==="individual"?"individual":null;

 return <><Header/><main className="min-h-screen bg-slate-100 px-4 py-10">
  <section className="mx-auto max-w-3xl">
   <div className="mb-7 text-center">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EF4B23]">ETKEN OFİS ÜYELİK</p>
    <h1 className="mt-2 text-3xl font-black text-slate-900">Nasıl üye olmak istersiniz?</h1>
    <p className="mt-2 text-sm text-slate-600">Bireysel alışveriş veya firmanız için kurumsal hesap oluşturabilirsiniz.</p>
   </div>

   {!type?<div className="grid gap-5 md:grid-cols-2">
    <Link href="/register?type=individual" className="group rounded-2xl border-2 border-transparent bg-white p-7 shadow-sm transition hover:border-[#EF4B23] hover:shadow-lg">
     <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#EF4B23]">BİREYSEL</span>
     <h2 className="mt-4 text-2xl font-black text-slate-900">Bireysel Üye Ol</h2>
     <p className="mt-2 text-sm leading-6 text-slate-600">Kişisel alışverişlerinizi, adreslerinizi ve siparişlerinizi tek hesaptan yönetin.</p>
     <span className="mt-6 inline-flex font-black text-[#EF4B23]">Bireysel hesap oluştur →</span>
    </Link>
    <Link href="/register?type=corporate" className="group rounded-2xl border-2 border-transparent bg-white p-7 shadow-sm transition hover:border-[#071729] hover:shadow-lg">
     <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-[#071729]">KURUMSAL</span>
     <h2 className="mt-4 text-2xl font-black text-slate-900">Kurumsal Üye Ol</h2>
     <p className="mt-2 text-sm leading-6 text-slate-600">Firmanız adına sipariş verin; kurumsal bilgileriniz ve fatura adresiniz hesabınıza tanımlansın.</p>
     <span className="mt-6 inline-flex font-black text-[#071729]">Kurumsal hesap oluştur →</span>
    </Link>
   </div>:null}

   {type?<section className="mx-auto max-w-2xl rounded-2xl bg-white p-7 shadow-sm">
    <div className="mb-6 flex items-start justify-between gap-4">
     <div>
      <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">{type==="corporate"?"Kurumsal Müşteri":"Bireysel Müşteri"}</p>
      <h2 className="mt-2 text-3xl font-black text-slate-900">Üye Ol</h2>
      <p className="mt-2 text-sm text-slate-600">{type==="corporate"?"Firma ve yetkili bilgilerinizi girerek kurumsal hesabınızı oluşturun.":"Siparişlerinizi, adreslerinizi ve sipariş durumlarınızı tek hesaptan yönetin."}</p>
     </div>
     <Link href="/register" className="shrink-0 text-sm font-black text-slate-500 hover:text-[#EF4B23]">← Tür Değiştir</Link>
    </div>
    {type==="corporate"?<CorporateRegisterForm/>:<IndividualRegisterForm/>}
   </section>:null}

   <p className="mt-7 text-center text-sm text-slate-600">Zaten üye misiniz? <Link href="/customer-login" className="font-black text-[#EF4B23]">Giriş Yap</Link></p>
  </section>
 </main></>;
}
