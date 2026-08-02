import type { Metadata } from "next";

import LegalPage from "@/components/legal/LegalPage";
import { B2B_LEGAL_POLICY } from "@/modules/b2b/constants/legal.constants";
import {
  formatPublicCompanyAddress,
  getPublicCompanyProfile,
} from "@/modules/b2b/services/company-profile.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Gizlilik ve Çerez Politikası",
  description:
    "Etken Ofis platformunun gizlilik, zorunlu çerez ve tarayıcı depolama politikası.",
};

const storageItems = [
  {
    name: "etken_session",
    type: "Zorunlu oturum çerezi",
    purpose:
      "Kullanıcı girişini doğrulamak, kurumsal hesap oturumunu güvenli biçimde sürdürmek ve yetkili işlemleri ilişkilendirmek.",
    duration:
      "Kurumsal web oturumunda en fazla 7 gün; çıkış yapıldığında veya oturum geçersiz kılındığında silinir.",
  },
  {
    name: "etken-b2b-cart-v2",
    type: "Tarayıcı yerel depolaması",
    purpose:
      "Sepetteki ürün kodu, ürün adı, miktar, fiyat ve vergi bilgilerinin aynı cihazda korunması.",
    duration:
      "Kullanıcı sepeti veya tarayıcı verilerini temizleyene kadar cihazda kalabilir.",
  },
] as const;

export default async function PrivacyPage() {
  const profile = await getPublicCompanyProfile();
  const address = formatPublicCompanyAddress(profile);
  const contactEmail = profile.supportEmail || profile.email;

  return (
    <LegalPage
      eyebrow="Yasal"
      title="Gizlilik ve Çerez Politikası"
      description="Platformda kullanılan zorunlu çerezleri, tarayıcı depolamasını ve çevrim içi gizlilik yaklaşımını açıklar."
      profileComplete={profile.isComplete}
      effectiveDate={B2B_LEGAL_POLICY.effectiveDate}
      version={B2B_LEGAL_POLICY.version}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          1. Kapsam ve veri sorumlusu
        </h2>

        <p className="mt-3">
          Bu politika, {profile.legalName} tarafından işletilen etkenofis.com
          internet sitesinde kullanılan çerezler, benzer teknolojiler,
          tarayıcı yerel depolaması ve çevrim içi güvenlik kayıtları için
          geçerlidir. Ayrıntılı kişisel veri işleme bilgileri KVKK Aydınlatma
          Metninde yer alır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          2. Gizlilik ve güvenlik yaklaşımı
        </h2>

        <p className="mt-3">
          Kişisel ve ticari veriler; hizmetin sunulması, kurumsal hesapların
          yetkilendirilmesi, siparişlerin yürütülmesi, bilgi güvenliği ve
          yasal yükümlülükler için gerekli ölçüde işlenir. Yetkisiz erişim,
          kayıp ve kötüye kullanım riskini azaltmak amacıyla erişim kontrolü,
          rol ve adres yetkileri, parola özetleme, güvenli oturum çerezi,
          oturum süresi, başarısız giriş kontrolü ve işlem kayıtları gibi
          teknik ve idari tedbirler uygulanır.
        </p>

        <p className="mt-3">
          İnternet üzerinden veri aktarımının hiçbir zaman sıfır riskli
          olmadığı dikkate alınmalıdır. Kullanıcılar güçlü ve benzersiz
          şifre kullanmalı, ortak cihazlarda çıkış yapmalı ve şüpheli hesap
          hareketlerini gecikmeden bildirmelidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          3. Kullanılan zorunlu teknolojiler
        </h2>

        <div className="mt-4 space-y-4">
          {storageItems.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
                  {item.name}
                </code>
                <span className="text-sm font-bold text-slate-900">
                  {item.type}
                </span>
              </div>

              <p className="mt-3">
                <strong>Amaç:</strong> {item.purpose}
              </p>

              <p className="mt-2">
                <strong>Süre:</strong> {item.duration}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4">
          Oturum çerezi HTTP-only olarak tutulur; istemci tarafındaki
          komutlar tarafından okunamaz. Üretim ortamında güvenli bağlantı
          üzerinden iletilir ve siteler arası istek riskini azaltan SameSite
          ayarı kullanılır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          4. Sepet ve fiyat doğrulaması
        </h2>

        <p className="mt-3">
          Sepet yerel depolama verileri kullanıcının cihazında tutulur ve
          başka bir cihazla otomatik olarak eşitlenmeyebilir. Tarayıcı
          verilerinin temizlenmesi sepeti silebilir. Cihazdaki sepet kaydı
          kesin fiyat veya stok taahhüdü değildir; fiyat, stok, iskonto,
          vergi ve asgari sipariş kuralları ödeme öncesinde sunucu tarafında
          yeniden doğrulanır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          5. Sunucu ve güvenlik kayıtları
        </h2>

        <p className="mt-3">
          Siteye erişildiğinde IP adresi, tarih-saat, tarayıcı veya cihaz
          bilgisi, talep edilen sayfa, oturum ve hata kayıtları güvenlik,
          hizmet sürekliliği, hata analizi ve kötüye kullanımın önlenmesi
          amacıyla sunucu sistemlerinde işlenebilir. Bu kayıtlar yalnızca
          yetkili kişiler ve hizmet sağlayıcılar tarafından amaçla sınırlı
          olarak kullanılabilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          6. Analitik ve pazarlama çerezleri
        </h2>

        <p className="mt-3">
          Mevcut sürümde reklam, davranışsal profilleme veya zorunlu olmayan
          ziyaretçi analitiği amacıyla çerez kullanılmamaktadır. Bu tür bir
          teknoloji daha sonra eklenirse, çalıştırılmadan önce kullanıcıya
          açık ve anlaşılır bilgi verilecek; tercih paneli sunulacak ve
          gerekli olduğu durumlarda aktif onay alınacaktır. Zorunlu olmayan
          çerezler onay verilmeden etkinleştirilmeyecektir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          7. Tarayıcı tercihleri
        </h2>

        <p className="mt-3">
          Kullanıcılar tarayıcı ayarlarından çerezleri görüntüleyebilir,
          silebilir veya engelleyebilir. Yerel depolama verileri de tarayıcı
          site verileri temizlenerek kaldırılabilir. Zorunlu oturum çerezinin
          engellenmesi kurumsal giriş, hesap, yetkilendirme ve sipariş
          işlevlerinin çalışmamasına neden olabilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          8. Üçüncü taraf hizmetleri ve bağlantılar
        </h2>

        <p className="mt-3">
          Platform; barındırma, veritabanı, ağ ve güvenlik hizmetleri için
          teknik hizmet sağlayıcılardan yararlanabilir. Bu sağlayıcıların
          erişimi hizmetin yürütülmesi için gerekli kapsamla sınırlandırılır.
          Başka internet sitelerine verilen bağlantılar, ilgili üçüncü
          tarafların kendi gizlilik ve çerez politikalarına tabidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          9. İletişim ve politika değişiklikleri
        </h2>

        <p className="mt-3">
          Gizlilik ve çerez kullanımıyla ilgili talepler
          {contactEmail ? ` ${contactEmail}` : " şirket iletişim kanalları"}
          üzerinden veya {address || "şirket adresi"} adresine yazılı olarak
          iletilebilir.
        </p>

        <p className="mt-3">
          Kullanılan teknolojiler veya hukuki gereklilikler değiştiğinde bu
          politika güncellenir. Güncel sürüm ve yürürlük tarihi sayfanın üst
          bölümünde yayımlanır.
        </p>
      </section>
    </LegalPage>
  );
}
