# Katalog geçişi — üretim onay kontrol listesi

**Durum: Henüz üretimde uygulanmadı.** Bu belgede yer alan SQL dosyalarını otomatik
deploy veya uygulama başlangıcına bağlamayın. PR #234'ün birleşmesi tek başına
ürünleri pasifleştirmez.

## Ön koşullar

1. Özel GCS bucket'ındaki PostgreSQL yedeğinin bütünlüğünü ve mümkünse izole
   ortamda geri yüklenebilirliğini doğrulayın. Yedeği halka açık asset bucket'ına taşımayın.
2. `catalog-safety-audit.sql` ve `catalog-reactivation-risk.sql` dosyalarını
   **salt okunur** çalıştırıp tüm sonuçları saklayın.
3. Güncel üretim sayılarının 915 toplam, 784 aktif Ofis26 ve 125 aktif
   Ofis26 dışı ürüne karşılık geldiğini doğrulayın. Fark varsa durun.
4. 125 adayın stok ve rezervasyon değerleri sıfır olmalı. WMS, sipariş, iade,
   hareket ve barkod kayıtlarında her ürünün bağımsız referanslarını inceleyin.
   `productId` dışında `productCode` ve `productBarcode` eşleşmelerini de denetleyin.
5. Etken Excel ürün içe aktarma akışının mevcut pasif ürünleri yeniden
   aktifleştirmediğini test edin. Ofis26 tedarikçi senkronizasyonunu bozmayın.
6. `validate-zirhli-csv.py` ile 161 satır ve %20 fiyat hesabını kontrol edin.
   Bu doğrulama **barkod, KDV matrahı, gerçek stok, ürün eşleşmesi veya
   görsel kullanım hakkı doğrulaması değildir**.

## Canlıya geçişi engelleyen koşullar

- Son commit için TypeScript/test/build ve ilgili GitHub kontrolleri başarılı değilse.
- Aday ürünlerde herhangi bir tarihsel/operasyonel bağlantı açıklığa kavuşmadıysa.
- Ürünlerin otomatik senkronizasyonla yeniden açılmayacağı doğrulanmadıysa.
- Üretim veritabanına erişimi olan yetkili operatör ve geri alma planı yoksa.
- Zırhlı ürünlerinin doğrulanmış barkod, KDV ve kaynak fiyat niteliği yoksa.

## SQL dosyalarının amacı

- `catalog-safety-audit.sql`: ilk envanter ve ürün bağlantısı incelemesi.
- `catalog-deactivation-dry-run.sql`: sadece simülasyon, işlem sonunda ROLLBACK.
- `catalog-reactivation-risk.sql`: diğer tedarikçi eşleştirmeleri.
- `catalog-deactivation-controlled.sql`: **üretimde çalıştırılmamış**,
  manuel onay gerektiren taslak. Tüm bağlantı kontrolleri ve eşzamanlı işlem
  davranışı doğrulanmadan kullanılmamalı.
- `catalog-deactivation-restore.sql`: yalnızca başarılı bir denetim kaydı
  oluşturulmuşsa, kontrollü geri alma taslağı.

## Başarı ölçütü

İşlem sonrasında 784 Ofis26 ürününün aktif kalması, yalnızca onaylı 125
ürünün pasif olması, WMS/sipariş kayıtlarının değişmemesi ve müşteri iskonto
kurallarının etkilenmemesi gerekir. Zırhlı ürünleri ayrıca onaylanmış veriyle
içe aktarılmalıdır; 161 CSV satırının doğrulanması aktarım anlamına gelmez.
