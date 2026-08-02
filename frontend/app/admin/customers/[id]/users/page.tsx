import { CustomerUserRole, UserStatus, UserType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import CustomerUserCreateForm from "@/components/admin/CustomerUserCreateForm";
import CustomerUserImportForm from "@/components/admin/CustomerUserImportForm";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { toggleCustomerUserStatusAction } from "./actions";

const ROLE_LABELS: Record<CustomerUserRole, string> = {
  CUSTOMER_ADMIN: "Müşteri Yetkilisi",
  BUYER: "Satın Almacı",
  ADDRESS_USER: "Adres Kullanıcısı",
};

export default async function CustomerUsersPage({ params }: { params: Promise<{ id: string }> }) {
  await AuthorizationService.requirePermission("CUSTOMER_MANAGE");
  const customerId = Number((await params).id);
  if (!Number.isInteger(customerId) || customerId <= 0) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      addresses: { where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { title: "asc" }], select: { id: true, addressCode: true, title: true, city: true, district: true } },
      users: {
        where: { userType: UserType.CUSTOMER }, orderBy: { createdAt: "desc" },
        include: { customerAddressAccesses: { include: { address: { select: { addressCode: true, title: true } } } } },
      },
    },
  });
  if (!customer) notFound();

  return <div className="space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-[#EF4B23]">B2B Müşteri Hesapları</p><h1 className="mt-2 text-3xl font-black">{customer.companyName}</h1><p className="mt-2 text-slate-500">{customer.customerCode}</p></div><Link href="/admin/customers" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50">Müşteri Listesine Dön</Link></div>
    <CustomerUserCreateForm customerId={customer.id} addresses={customer.addresses} />
    <CustomerUserImportForm customerId={customer.id} />
    <section className="overflow-hidden rounded-2xl bg-white shadow"><div className="border-b p-6"><h2 className="text-xl font-bold">Tanımlı Kullanıcılar</h2></div>
      {customer.users.length === 0 ? <p className="p-6 text-slate-500">Bu müşteri için henüz kurumsal kullanıcı oluşturulmadı.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-5 py-3">Ad Soyad / Kullanıcı</th><th className="px-5 py-3">Rol</th><th className="px-5 py-3">Adres Erişimi</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">İşlem</th></tr></thead><tbody>
        {customer.users.map((user) => <tr key={user.id} className="border-t align-top"><td className="px-5 py-4"><strong>{user.fullName ?? "Ad soyad girilmedi"}</strong><span className="block text-slate-500">{user.username} · {user.email ?? "E-posta yok"}</span></td><td className="px-5 py-4 font-semibold">{user.customerRole ? ROLE_LABELS[user.customerRole] : "Rol atanmamış"}</td><td className="px-5 py-4">{user.customerRole !== CustomerUserRole.ADDRESS_USER ? "Firma geneli" : user.customerAddressAccesses.length ? user.customerAddressAccesses.map((item) => item.address.addressCode + " — " + item.address.title).join(", ") : "Adres atanmamış"}</td><td className="px-5 py-4">{user.status === UserStatus.ACTIVE ? "Aktif" : "Pasif"}</td><td className="px-5 py-4"><form action={toggleCustomerUserStatusAction.bind(null, customer.id, user.id, user.status)}><button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">{user.status === UserStatus.ACTIVE ? "Pasife Al" : "Aktifleştir"}</button></form></td></tr>)}
      </tbody></table></div>}
    </section>
  </div>;
}
