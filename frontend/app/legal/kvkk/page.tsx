import type {
  Metadata,
} from "next";

import LegalPage from "@/components/legal/LegalPage";
import {
  SITE_CONFIG,
} from "@/modules/site/constants/site.constants";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
};

export default function KvkkPage() {
  return (
    <LegalPage
      eyebrow="Yasal"
      title="KVKK Aydınlatma Metni"
      description="Kişisel verilerin işlenmesine ilişkin taslak bilgilendirme metnidir."
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          1. Veri sorumlusu
        </h2>

        <p className="mt-3">
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında
          veri sorumlusu {SITE_CONFIG.legalName} olarak öngörülmüştür.
          Resmî unvan ve iletişim bilgileri faaliyete geçmeden önce
          tamamlanacaktır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          2. İşlenen veri kategorileri
        </h2>

        <p className="mt-3">
          Kimlik ve iletişim bilgileri, müşteri şirket ve teslimat
          adresi bilgileri, kullanıcı hesabı ve güvenlik kayıtları,
          sipariş, ödeme yöntemi, işlem geçmişi ve destek kayıtları
          hizmetin gerektirdiği ölçüde işlenebilir. Kart bilgileri,
          kartlı ödeme hizmeti eklenmedikçe platform tarafından
          işlenmez.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          3. İşleme amaçları ve hukuki sebepler
        </h2>

        <p className="mt-3">
          Veriler; üyelik ve yetkilendirme, siparişin kurulması ve
          yerine getirilmesi, teslimat, finans ve muhasebe süreçleri,
          bilgi güvenliği, talep ve şikâyet yönetimi ile yasal
          yükümlülüklerin yerine getirilmesi amaçlarıyla; sözleşmenin
          kurulması veya ifası, hukuki yükümlülük, bir hakkın tesisi
          ve meşru menfaat sebeplerine dayanılarak işlenebilir.
          Açık rıza gereken ayrı bir faaliyet başlatılırsa ilgili
          onay ayrıca alınır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          4. Aktarım ve saklama
        </h2>

        <p className="mt-3">
          Veriler; hizmetin yürütülmesi için gerekli olduğu ölçüde
          barındırma ve teknik hizmet sağlayıcılarına, tedarikçi,
          lojistik, finans ve muhasebe iş ortaklarına ve yetkili kamu
          kurumlarına mevzuata uygun olarak aktarılabilir. Saklama
          süreleri işleme amacı ve yasal yükümlülüklere göre
          belirlenecek, süre sonunda veriler silinecek, yok edilecek
          veya anonim hâle getirilecektir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          5. Başvuru hakları
        </h2>

        <p className="mt-3">
          İlgili kişiler KVKK'nın 11. maddesindeki haklarına ilişkin
          taleplerini, yayınlanacak doğrulanmış iletişim kanalları
          üzerinden veri sorumlusuna iletebilir. Başvuru yöntemi ve
          adresi, resmî şirket bilgileri tamamlandığında bu metne
          eklenecektir.
        </p>
      </section>
    </LegalPage>
  );
}
