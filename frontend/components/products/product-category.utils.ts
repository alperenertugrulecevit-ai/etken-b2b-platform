export const PRODUCT_MAIN_CATEGORIES = [
  "Ofis Kırtasiye",
  "Temizlik ve Hijyen",
  "Gıda ve Mutfak",
  "Ambalaj ve Paketleme",
  "İş Güvenliği",
] as const;

export type ProductMainCategory =
  (typeof PRODUCT_MAIN_CATEGORIES)[number];

const OFFICE_SUBCATEGORIES = new Set([
  "Ofis Kırtasiye",
  "Fotokopi Kağıdı",
  "Bant",
  "Bant Kesici",
  "Delgeç",
  "Evrak Rafı",
  "Hesap Makinesi",
  "Marker Kalem",
  "Plastik Klasör",
  "Poşet Dosya",
  "Tahta Kalemi",
  "Tel Sökücü",
  "Tükenmez Kalem",
  "Versatil Kalem",
  "Yapışkanlı Not",
  "Yapıştırıcı",
  "Zımba",
  "Zımba Teli",
]);

const CLEANING_SUBCATEGORIES = new Set([
  "Banyo ve Tuvalet",
  "Bulaşık Deterjanı",
  "Cam Temizleyici",
  "Çamaşır Suyu",
  "Çöp Torbası",
  "Hareketli Havlu",
  "İçten Çekmeli Havlu",
  "Kağıt Havlu",
  "Kolonya",
  "Lavabo Açıcı",
  "Mutfak Temizleyici",
  "Peçete",
  "Sünger",
  "Temizlik Bezi",
  "Tuvalet Kağıdı",
  "Yüzey Temizleyici",
]);

const FOOD_SUBCATEGORIES = new Set([
  "Bitki Çayı",
  "Çekirdek Kahve",
  "Demlik Poşet Çay",
  "Dökme Çay",
  "Filtre Kahve",
  "Hazır Kahve",
  "Kahve",
  "Kahve Yan Ürünü",
  "Karton Bardak",
  "Kullan At Mutfak",
  "Şeker",
  "Türk Kahvesi",
  "Yeşil Çay",
]);

const PACKAGING_SUBCATEGORIES = new Set([
  "Balonlu Naylon",
  "Çift Taraflı Bant",
  "Karton Koli",
  "Koli Bandı",
  "Streç Film",
]);

const SAFETY_SUBCATEGORIES = new Set([
  "Baret",
  "Koruyucu Gözlük",
  "Reflektörlü Yelek",
  "Uyarı Levhası",
]);

export function getProductMainCategory(
  subCategory: string,
): ProductMainCategory {
  if (OFFICE_SUBCATEGORIES.has(subCategory)) {
    return "Ofis Kırtasiye";
  }

  if (CLEANING_SUBCATEGORIES.has(subCategory)) {
    return "Temizlik ve Hijyen";
  }

  if (FOOD_SUBCATEGORIES.has(subCategory)) {
    return "Gıda ve Mutfak";
  }

  if (PACKAGING_SUBCATEGORIES.has(subCategory)) {
    return "Ambalaj ve Paketleme";
  }

  if (SAFETY_SUBCATEGORIES.has(subCategory)) {
    return "İş Güvenliği";
  }

  return "Ofis Kırtasiye";
}