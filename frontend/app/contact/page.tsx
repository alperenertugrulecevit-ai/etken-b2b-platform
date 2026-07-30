import type {
  Metadata,
} from "next";

import LegalPage from "@/components/legal/LegalPage";
import {
  SITE_CONFIG,
} from "@/modules/site/constants/site.constants";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "Etken iletişim bilgileri.",
};

const contactRows = [
  {
    label: "Ticari unvan",
    value: SITE_CONFIG.legalName,
  },
  {
    label: "Adres",
    value: SITE_CONFIG.address,
  },
  {
    label: "Telefon",
    value: SITE_CONFIG.phone,
  },
  {
    label: "E-posta",
    value: SITE_CONFIG.email,
  },
  {
    label: "KEP",
    value: SITE_CONFIG.kepAddress,
  },
];

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="Kurumsal"
      title="İletişim"
      description="Sipariş, ürün ve kurumsal üyelik konularındaki iletişim kanallarımız bu sayfada yayınlanacaktır."
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          İletişim bilgileri
        </h2>

        <dl className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {contactRows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"
            >
              <dt className="font-semibold text-slate-900">
                {row.label}
              </dt>

              <dd className="text-slate-600">
                {row.value ?? "Yayın öncesinde eklenecek"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Destek
        </h2>

        <p className="mt-3">
          Destek e-posta adresi ve çalışma saatleri kesinleştiğinde
          burada duyurulacaktır. Sipariş veren kurumsal kullanıcılar,
          sipariş durumlarını Kurumsal Hesabım alanından izleyebilir.
        </p>
      </section>
    </LegalPage>
  );
}
