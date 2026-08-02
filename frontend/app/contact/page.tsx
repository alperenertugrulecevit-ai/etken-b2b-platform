import type { Metadata } from "next";

import LegalPage from "@/components/legal/LegalPage";
import { getPublicCompanyProfile } from "@/modules/b2b/services/company-profile.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "İletişim",
  description: "Etken Ofis iletişim ve şirket bilgileri.",
};

export default async function ContactPage() {
  const profile = await getPublicCompanyProfile();
  const address = [
    profile.addressLine,
    profile.postalCode,
    profile.district,
    profile.city,
    profile.country,
  ]
    .filter(Boolean)
    .join(" · ");

  const contactRows = [
    { label: "Ticari unvan", value: profile.legalName },
    { label: "Adres", value: address || null },
    { label: "Telefon", value: profile.phone },
    { label: "E-posta", value: profile.email },
    { label: "Destek e-postası", value: profile.supportEmail },
    { label: "KEP", value: profile.kepAddress },
    { label: "Vergi dairesi", value: profile.taxOffice },
    { label: "Vergi numarası", value: profile.taxNumber },
    { label: "MERSİS numarası", value: profile.mersisNumber },
    { label: "Ticaret sicil numarası", value: profile.tradeRegistryNumber },
    { label: "Çalışma saatleri", value: profile.workingHours },
  ];

  return (
    <LegalPage
      eyebrow="Kurumsal"
      title="İletişim"
      description="Sipariş, ürün ve kurumsal üyelik konularında bize aşağıdaki kanallardan ulaşabilirsiniz."
      profileComplete={profile.isComplete}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">Şirket ve iletişim bilgileri</h2>
        <dl className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {contactRows.map((row) => (
            <div key={row.label} className="grid gap-1 p-4 sm:grid-cols-[190px_1fr]">
              <dt className="font-semibold text-slate-900">{row.label}</dt>
              <dd className="text-slate-600">{row.value ?? "Henüz belirtilmedi"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">Kurumsal destek</h2>
        <p className="mt-3">
          Kurumsal kullanıcılar sipariş durumlarını Kurumsal Hesabım alanından izleyebilir.
          {profile.supportEmail
            ? " Destek taleplerinizi " + profile.supportEmail + " adresine iletebilirsiniz."
            : " Destek iletişim bilgisi şirket profili tamamlandığında burada gösterilecektir."}
        </p>
      </section>
    </LegalPage>
  );
}
