import type {
  Metadata,
} from "next";

import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Etken kurumsal tedarik platformu hakkında bilgi.",
};

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="Kurumsal"
      title="Hakkımızda"
      description="Etken, işletmelerin satın alma süreçlerini daha düzenli, izlenebilir ve verimli yürütmesini amaçlayan kurumsal tedarik platformudur."
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Tek noktadan kurumsal tedarik
        </h2>

        <p className="mt-3">
          Ofis, temizlik, ambalaj, teknoloji, iş güvenliği ve
          işletme ihtiyaçlarının dijital katalog üzerinden
          incelenmesini; stok, fiyat, teslimat adresi ve sipariş
          durumlarının tek akışta yönetilmesini hedefliyoruz.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          B2B odaklı çalışma
        </h2>

        <p className="mt-3">
          Platform, kurumsal müşterilere özel kullanıcı hesapları,
          müşteri bazlı fiyat ve iskonto yapısı, sipariş geçmişi ve
          operasyon takibi sunacak şekilde geliştirilmektedir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Gelişen hizmet yapısı
        </h2>

        <p className="mt-3">
          Ürün ve hizmet kapsamı, iş ortaklıkları ve resmî şirket
          bilgileri kesinleştikçe bu sayfa güncellenecektir.
        </p>
      </section>
    </LegalPage>
  );
}
