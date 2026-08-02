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
  title: "KVKK Aydınlatma Metni",
  description:
    "Etken Ofis platformunda kişisel verilerin işlenmesine ilişkin KVKK aydınlatma metni.",
};

export default async function KvkkPage() {
  const profile = await getPublicCompanyProfile();
  const address = formatPublicCompanyAddress(profile);
  const contactEmail = profile.supportEmail || profile.email;

  return (
    <LegalPage
      eyebrow="Yasal"
      title="KVKK Aydınlatma Metni"
      description="Kurumsal müşteri kullanıcıları, müşteri yetkilileri, teslimat irtibat kişileri ve site ziyaretçilerinin kişisel verilerinin işlenmesine ilişkin bilgilendirmedir."
      profileComplete={profile.isComplete}
      effectiveDate={B2B_LEGAL_POLICY.effectiveDate}
      version={B2B_LEGAL_POLICY.version}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          1. Veri sorumlusu
        </h2>

        <p className="mt-3">
          6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)
          kapsamında {profile.legalName} veri sorumlusu olarak faaliyet
          göstermektedir. Veri sorumlusu adresi:
          {" "}{address || "şirket profilinde belirtilen adres"}.
          {profile.taxNumber
            ? ` Vergi numarası: ${profile.taxNumber}.`
            : ""}
          {profile.mersisNumber
            ? ` MERSİS numarası: ${profile.mersisNumber}.`
            : ""}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          2. İlgili kişi grupları ve işlenen veriler
        </h2>

        <p className="mt-3">
          Bu metin; müşteri şirket çalışanları ve yetkilileri, kurumsal
          hesap kullanıcıları, teslimat adreslerinde belirtilen irtibat
          kişileri, destek talebi ileten kişiler ve site ziyaretçileri için
          geçerlidir. Hizmetin niteliğine göre aşağıdaki veri kategorileri
          işlenebilir:
        </p>

        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            Kimlik ve hesap: ad soyad, kullanıcı adı, kullanıcı rolü ve
            müşteri şirketle ilişki bilgisi,
          </li>
          <li>
            İletişim: e-posta, telefon, teslimat irtibat kişisi ve adres
            bilgileri,
          </li>
          <li>
            Müşteri ve mesleki bilgi: şirket unvanı, müşteri kodu, vergi
            bilgileri, görev/yetki ve erişilebilen teslimat adresleri,
          </li>
          <li>
            İşlem bilgisi: sepet, sipariş, ürün, fiyat, iskonto, ödeme
            yöntemi, cari hesap, teslimat ve işlem geçmişi,
          </li>
          <li>
            Finans ve muhasebe: fatura, tahsilat, vade, bakiye, kredi limiti
            ve muhasebe kayıtları,
          </li>
          <li>
            İşlem güvenliği: IP adresi, kullanıcı aracısı, oturum, giriş,
            başarısız giriş, erişim ve güvenlik kayıtları,
          </li>
          <li>
            Talep ve uyuşmazlık: destek yazışmaları, şikâyet, iade, tutanak
            ve hukuki süreç kayıtları.
          </li>
        </ul>

        <p className="mt-3">
          Platformun olağan kullanımında özel nitelikli kişisel veri talep
          edilmez. Kullanıcıların sipariş notu veya destek alanlarına hizmet
          için gerekli olmayan sağlık, biyometrik veri ve benzeri özel
          nitelikli bilgileri yazmaması gerekir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          3. İşleme amaçları
        </h2>

        <p className="mt-3">
          Kişisel veriler; kurumsal hesabın oluşturulması ve yönetilmesi,
          kullanıcı rolü ve adres erişiminin doğrulanması, ürün ve fiyat
          gösterimi, siparişin alınması ve yerine getirilmesi, ödeme ve cari
          hesap kontrolü, faturalama, teslimat, iade, müşteri desteği,
          bilgi güvenliği, hata ve kötüye kullanımın önlenmesi, iş
          sürekliliği, hukuki taleplerin yönetilmesi ve mevzuattan doğan
          yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          4. Hukuki sebepler ve toplama yöntemi
        </h2>

        <p className="mt-3">
          Veriler; KVKK’nın 5’inci maddesinde yer alan sözleşmenin kurulması
          veya ifası, veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi,
          bir hakkın tesisi, kullanılması veya korunması ve ilgili kişinin
          temel haklarına zarar vermemek kaydıyla meşru menfaat hukuki
          sebeplerine dayanılarak işlenir. Açık rıza gerektiren yeni bir
          pazarlama veya benzeri faaliyet başlatılırsa aydınlatmadan ayrı bir
          onay mekanizması kullanılır.
        </p>

        <p className="mt-3">
          Veriler; kurumsal üyelik ve sipariş formları, müşteri yöneticileri,
          teslimat bilgileri, destek ve iade bildirimleri yoluyla doğrudan;
          oturum, erişim ve güvenlik kayıtları yoluyla otomatik yöntemlerle
          elektronik ortamda toplanır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          5. Verilerin aktarılması
        </h2>

        <p className="mt-3">
          Kişisel veriler, amaçla sınırlı ve gerekli olduğu ölçüde; şirketin
          yetkili çalışanlarına, siparişin karşılanmasında görev alan
          tedarikçilere, taşıma ve teslimat hizmeti verenlere, finans ve
          muhasebe hizmet sağlayıcılarına, hukuk ve denetim danışmanlarına,
          bilgi teknolojileri, barındırma, veritabanı ve güvenlik hizmeti
          sağlayıcılarına ve kanunen yetkili kamu kurumlarına aktarılabilir.
        </p>

        <p className="mt-3">
          Platformun teknik altyapısında yurt dışında bulunan sunucu veya
          hizmet sağlayıcıların kullanılması hâlinde kişisel veriler, KVKK’nın
          yurt dışına aktarımı düzenleyen 9’uncu maddesindeki şartlar ve
          uygun güvenceler sağlanarak aktarılır. Tedarikçi ve lojistik
          firmalarıyla yalnızca ilgili siparişin yerine getirilmesi için
          gerekli bilgiler paylaşılır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          6. Saklama ve imha
        </h2>

        <p className="mt-3">
          Sipariş, sözleşme, fatura, cari hesap ve ticari defter niteliğindeki
          kayıtlar, ilgili vergi ve ticaret mevzuatında öngörülen süreler
          boyunca; uygulanabildiği ölçüde 10 yıla kadar saklanır. Kullanıcı
          hesabı, yetki, güvenlik, destek ve teslimat verileri hizmet ilişkisi,
          işleme amacı ve ilgili zamanaşımı süreleri devam ettiği müddetçe
          tutulur. Hukuki uyuşmazlık veya resmî inceleme bulunması hâlinde
          ilgili kayıtlar süreç kesin olarak sonuçlanıncaya kadar
          saklanabilir.
        </p>

        <p className="mt-3">
          Saklama amacı ve hukuki yükümlülük sona erdiğinde veriler, mevzuata
          uygun periyodik süreçlerle silinir, yok edilir veya anonim hâle
          getirilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          7. İlgili kişinin hakları
        </h2>

        <p className="mt-3">
          İlgili kişiler KVKK’nın 11’inci maddesi kapsamında;
        </p>

        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>Kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>
            İşleme amacını ve verilerin amacına uygun kullanılıp
            kullanılmadığını öğrenme,
          </li>
          <li>
            Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü
            kişileri bilme,
          </li>
          <li>
            Eksik veya yanlış işlenen verilerin düzeltilmesini ve bu işlemin
            verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,
          </li>
          <li>
            Kanuni şartları oluştuğunda verilerin silinmesini veya yok
            edilmesini ve bu işlemin üçüncü kişilere bildirilmesini isteme,
          </li>
          <li>
            Otomatik sistemlerle analiz sonucu kişinin aleyhine bir sonucun
            ortaya çıkmasına itiraz etme,
          </li>
          <li>
            Kanuna aykırı işleme nedeniyle zarara uğraması hâlinde zararın
            giderilmesini talep etme
          </li>
        </ul>

        <p className="mt-3">haklarına sahiptir.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          8. Başvuru yöntemi
        </h2>

        <p className="mt-3">
          KVKK kapsamındaki başvurular, kimliği doğrulamaya elverişli bilgi
          ve belgelerle birlikte {profile.legalName} veri sorumlusuna,
          {address ? ` ${address}` : " şirket adresi"} üzerinden şahsen,
          yazılı olarak veya noter aracılığıyla iletilebilir.
          {profile.kepAddress
            ? ` Güvenli elektronik imza veya mobil imza kullanılarak ${profile.kepAddress} KEP adresine de başvurulabilir.`
            : " KEP adresi tanımlandığında şirket iletişim bilgilerinde ayrıca yayımlanacaktır."}
        </p>

        <p className="mt-3">
          Daha önce veri sorumlusuna bildirilen ve sistemde doğrulanan e-posta
          adresi üzerinden
          {contactEmail ? ` ${contactEmail}` : " şirket e-posta adresine"}
          başvuru yapılabilir. Kimliği doğrulanamayan taleplerde ek bilgi
          istenebilir. Başvuruda ad soyad, başvuru yazılıysa imza, Türkiye
          Cumhuriyeti vatandaşları için kimlik numarası, yabancılar için
          pasaport veya kimlik numarası, tebligata esas adres ve talebin
          konusu bulunmalıdır.
        </p>

        <p className="mt-3">
          Başvurular niteliğine göre en kısa sürede ve en geç 30 gün içinde
          ücretsiz sonuçlandırılır. İşlemin ayrıca maliyet gerektirmesi
          hâlinde Kişisel Verileri Koruma Kurulu tarafından belirlenen
          tarifedeki ücret istenebilir.
        </p>
      </section>
    </LegalPage>
  );
}
