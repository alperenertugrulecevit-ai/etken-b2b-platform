import { CustomerType, UserType } from "@prisma/client";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import CustomerProfileForm from "@/components/account/CustomerProfileForm";
import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

export const dynamic="force-dynamic";
export const metadata={title:"Hesap Bilgilerim | ETKEN Ofis"};

export default async function CustomerProfilePage(){
 const user=await SessionService.getCurrentUser();
 if(!user||user.userType!==UserType.CUSTOMER||!user.customerId||!user.customer?.isActive) redirect("/customer-login");
 const customer=await prisma.customer.findUnique({where:{id:user.customerId},select:{
  customerCode:true,customerType:true,companyName:true,taxOffice:true,taxNumber:true,contactName:true,phone:true,email:true,
 }});
 if(!customer) redirect("/customer-login");
 const corporate=customer.customerType===CustomerType.CORPORATE;

 return <><Header/><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
  <div>
   <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EF4B23]">{corporate?"Kurumsal Hesap":"Bireysel Hesap"}</p>
   <h1 className="mt-2 text-3xl font-black text-[#071729]">Hesap Bilgilerim</h1>
   <p className="mt-2 text-slate-500">Hesabınıza kayıtlı müşteri ve iletişim bilgilerini görüntüleyin.</p>
  </div>

  <section className="mt-6 grid gap-6 md:grid-cols-2">
   <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-black text-[#071729]">{corporate?"Firma Bilgileri":"Müşteri Bilgileri"}</h2>
    <dl className="mt-5 space-y-4 text-sm">
     <div><dt className="font-bold text-slate-500">Müşteri Kodu</dt><dd className="mt-1 font-black">{customer.customerCode}</dd></div>
     <div><dt className="font-bold text-slate-500">{corporate?"Firma Unvanı":"Ad Soyad"}</dt><dd className="mt-1 font-black">{customer.companyName}</dd></div>
     {corporate?<><div><dt className="font-bold text-slate-500">Vergi Dairesi</dt><dd className="mt-1 font-black">{customer.taxOffice||"-"}</dd></div><div><dt className="font-bold text-slate-500">VKN / TCKN</dt><dd className="mt-1 font-black">{customer.taxNumber||"-"}</dd></div></>:null}
     <div><dt className="font-bold text-slate-500">E-posta / Kullanıcı Adı</dt><dd className="mt-1 break-all font-black">{customer.email||user.email||user.username}</dd></div>
    </dl>
    <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{corporate?"Firma unvanı, vergi dairesi ve vergi numarası fatura bütünlüğü için hesap ekranından değiştirilemez. Değişiklik gerektiğinde Etken Ofis ile iletişime geçin.":"E-posta adresiniz giriş kullanıcı adınızdır. Değişiklik gerektiğinde Etken Ofis ile iletişime geçin."}</p>
   </div>

   <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-black text-[#071729]">İletişim Bilgileri</h2>
    <p className="mt-1 text-sm text-slate-500">Sipariş iletişiminde kullanılacak bilgileri güncelleyebilirsiniz.</p>
    <div className="mt-5"><CustomerProfileForm contactName={customer.contactName||user.fullName||""} phone={customer.phone||""}/></div>
   </div>
  </section>
 </main></>;
}
