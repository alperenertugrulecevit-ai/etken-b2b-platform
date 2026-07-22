export type PermissionCatalogItem = {
  code: string;
  name: string;
  module: string;
  description: string;
};

export type DefaultRoleCatalogItem = {
  code: string;
  name: string;
  description: string;
  permissionCodes: string[];
};

export const PERMISSION_CATALOG:
  PermissionCatalogItem[] = [
    {
      code: "ALL_ACCESS",
      name: "Tam Sistem Erişimi",
      module: "SYSTEM",
      description:
        "Sistemdeki tüm yönetim ve operasyon işlemlerine erişim sağlar.",
    },
    {
      code:
        "ADMIN_PORTAL_ACCESS",
      name:
        "Yönetim Paneline Erişim",
      module: "SYSTEM",
      description:
        "Kullanıcının ETKEN yönetim paneline giriş yapmasını sağlar.",
    },
    {
      code: "DASHBOARD_VIEW",
      name:
        "WMS Panelini Görüntüleme",
      module: "DASHBOARD",
      description:
        "WMS yönetim panelini ve operasyon özetlerini görüntüler.",
    },
    {
      code: "USER_VIEW",
      name:
        "Kullanıcıları Görüntüleme",
      module: "USERS",
      description:
        "Kullanıcı listesini ve kullanıcı ayrıntılarını görüntüler.",
    },
    {
      code: "USER_MANAGE",
      name:
        "Kullanıcıları Yönetme",
      module: "USERS",
      description:
        "Kullanıcı oluşturur, durum ve RF erişimi değiştirir.",
    },
    {
      code: "ROLE_VIEW",
      name:
        "Rolleri Görüntüleme",
      module: "ROLES",
      description:
        "Rol ve yetki tanımlarını görüntüler.",
    },
    {
      code: "ROLE_MANAGE",
      name:
        "Rolleri Yönetme",
      module: "ROLES",
      description:
        "Rol oluşturur, düzenler ve izin atamalarını yönetir.",
    },
    {
      code: "CUSTOMER_VIEW",
      name:
        "Müşterileri Görüntüleme",
      module: "CUSTOMERS",
      description:
        "Müşteri listesini, müşteri bilgilerini ve teslimat adreslerini görüntüler.",
    },
    {
      code: "CUSTOMER_MANAGE",
      name:
        "Müşterileri Yönetme",
      module: "CUSTOMERS",
      description:
        "Müşteri ve müşteri teslimat adresi kayıtlarını oluşturur ve günceller.",
    },
    {
      code: "WAREHOUSE_VIEW",
      name:
        "Depoları Görüntüleme",
      module: "WAREHOUSE",
      description:
        "Depo ve depo temel bilgilerini görüntüler.",
    },
    {
      code: "WAREHOUSE_MANAGE",
      name:
        "Depoları Yönetme",
      module: "WAREHOUSE",
      description:
        "Depo kayıtlarını oluşturur ve düzenler.",
    },
    {
      code: "LOCATION_VIEW",
      name:
        "Adresleri Görüntüleme",
      module: "WAREHOUSE",
      description:
        "Depo adreslerini ve yerleşim bilgilerini görüntüler.",
    },
    {
      code: "LOCATION_MANAGE",
      name:
        "Adresleri Yönetme",
      module: "WAREHOUSE",
      description:
        "Depo adreslerini oluşturur, düzenler ve toplu günceller.",
    },
    {
      code: "INVENTORY_VIEW",
      name:
        "Stokları Görüntüleme",
      module: "INVENTORY",
      description:
        "Stok miktarlarını, hareketleri ve kullanılabilirliği görüntüler.",
    },
    {
      code: "INVENTORY_ADJUST",
      name: "Stok Düzeltme",
      module: "INVENTORY",
      description:
        "Yetkili stok düzeltme ve manuel stok işlemlerini gerçekleştirir.",
    },
    {
      code: "COUNT_EXECUTE",
      name: "Stok Sayımı",
      module: "INVENTORY",
      description:
        "RF veya web ekranından lokasyon bazlı fiziksel stok sayımı gerçekleştirir.",
    },
    {
      code: "TRANSFER_EXECUTE",
      name: "Stok Transferi",
      module: "INVENTORY",
      description:
        "Adresler ve taşıma birimleri arasında stok transferi yapar.",
    },
    {
      code: "ORDER_VIEW",
      name:
        "Siparişleri Görüntüleme",
      module: "ORDERS",
      description:
        "Müşteri siparişlerini, ürün satırlarını ve sipariş durumlarını görüntüler.",
    },
    {
      code: "ORDER_MANAGE",
      name:
        "Siparişleri Yönetme",
      module: "ORDERS",
      description:
        "Müşteri siparişlerini oluşturur, günceller ve durum işlemlerini yürütür.",
    },
    {
      code: "RECEIVING_VIEW",
      name:
        "Mal Kabulü Görüntüleme",
      module: "RECEIVING",
      description:
        "Satın alma siparişlerini ve mal kabul kayıtlarını görüntüler.",
    },
    {
      code: "RECEIVING_EXECUTE",
      name:
        "Mal Kabul İşlemi",
      module: "RECEIVING",
      description:
        "Ürün kabulü ve teslim alma işlemlerini gerçekleştirir.",
    },
    {
      code: "PUTAWAY_EXECUTE",
      name:
        "Adresleme İşlemi",
      module: "RECEIVING",
      description:
        "Kabul edilen stokları uygun depo adreslerine yerleştirir.",
    },
    {
      code: "WAVE_VIEW",
      name:
        "Dalgaları Görüntüleme",
      module: "WAVE",
      description:
        "Toplama dalgalarını, siparişleri ve görevleri görüntüler.",
    },
    {
      code: "WAVE_MANAGE",
      name:
        "Dalgaları Yönetme",
      module: "WAVE",
      description:
        "Dalga oluşturur, sipariş ekler ve operatör atar.",
    },
    {
      code: "PICKING_EXECUTE",
      name:
        "Toplama İşlemi",
      module: "WAVE",
      description:
        "Atanmış toplama görevlerini RF veya web ekranından yürütür.",
    },
    {
      code: "HANDLING_UNIT_VIEW",
      name:
        "Taşıma Birimlerini Görüntüleme",
      module: "HANDLING_UNIT",
      description:
        "Palet, koli ve diğer taşıma birimlerini görüntüler.",
    },
    {
      code: "HANDLING_UNIT_MANAGE",
      name:
        "Taşıma Birimlerini Yönetme",
      module: "HANDLING_UNIT",
      description:
        "Taşıma birimi oluşturma, bağlama, ayırma ve birleştirme işlemlerini yapar.",
    },
    {
      code: "LABEL_PRINT",
      name: "Etiket Yazdırma",
      module: "LABEL",
      description:
        "Depo adresi, ürün ve taşıma birimi etiketlerini yazdırır.",
    },
  ];

const WMS_MANAGER_PERMISSIONS =
  PERMISSION_CATALOG
    .filter(
      (permission) =>
        ![
          "ALL_ACCESS",
          "USER_VIEW",
          "USER_MANAGE",
          "ROLE_VIEW",
          "ROLE_MANAGE",
        ].includes(
          permission.code
        )
    )
    .map(
      (permission) =>
        permission.code
    );

export const DEFAULT_ROLE_CATALOG:
  DefaultRoleCatalogItem[] = [
    {
      code: "WMS_MANAGER",
      name: "WMS Yöneticisi",
      description:
        "Kullanıcı ve rol yönetimi dışındaki tüm WMS operasyonlarını yönetir.",
      permissionCodes:
        WMS_MANAGER_PERMISSIONS,
    },
    {
      code: "SALES_OPERATOR",
      name: "Satış Operatörü",
      description:
        "Müşteri ve satış siparişi kayıtlarını görüntüler ve yönetir.",
      permissionCodes: [
        "ADMIN_PORTAL_ACCESS",
        "DASHBOARD_VIEW",
        "CUSTOMER_VIEW",
        "CUSTOMER_MANAGE",
        "INVENTORY_VIEW",
        "ORDER_VIEW",
        "ORDER_MANAGE",
      ],
    },
    {
      code:
        "WAREHOUSE_SUPERVISOR",
      name: "Depo Sorumlusu",
      description:
        "Depo, stok, kabul, dalga ve taşıma birimi operasyonlarını yönetir.",
      permissionCodes: [
        "ADMIN_PORTAL_ACCESS",
        "DASHBOARD_VIEW",
        "CUSTOMER_VIEW",
        "WAREHOUSE_VIEW",
        "WAREHOUSE_MANAGE",
        "LOCATION_VIEW",
        "LOCATION_MANAGE",
        "INVENTORY_VIEW",
        "INVENTORY_ADJUST",
        "COUNT_EXECUTE",
        "TRANSFER_EXECUTE",
        "ORDER_VIEW",
        "RECEIVING_VIEW",
        "WAVE_VIEW",
        "WAVE_MANAGE",
        "HANDLING_UNIT_VIEW",
        "HANDLING_UNIT_MANAGE",
        "LABEL_PRINT",
      ],
    },
    {
      code:
        "RECEIVING_OPERATOR",
      name:
        "Mal Kabul Operatörü",
      description:
        "Mal kabul, adresleme ve ilgili taşıma birimi işlemlerini yürütür.",
      permissionCodes: [
        "ADMIN_PORTAL_ACCESS",
        "DASHBOARD_VIEW",
        "WAREHOUSE_VIEW",
        "LOCATION_VIEW",
        "INVENTORY_VIEW",
        "RECEIVING_VIEW",
        "RECEIVING_EXECUTE",
        "PUTAWAY_EXECUTE",
        "HANDLING_UNIT_VIEW",
        "HANDLING_UNIT_MANAGE",
        "LABEL_PRINT",
      ],
    },
    {
      code:
        "PICKING_OPERATOR",
      name:
        "Toplama Operatörü",
      description:
        "Atanmış dalga ve sipariş toplama görevlerini yürütür.",
      permissionCodes: [
        "ADMIN_PORTAL_ACCESS",
        "DASHBOARD_VIEW",
        "WAREHOUSE_VIEW",
        "LOCATION_VIEW",
        "INVENTORY_VIEW",
        "WAVE_VIEW",
        "PICKING_EXECUTE",
        "HANDLING_UNIT_VIEW",
        "HANDLING_UNIT_MANAGE",
        "LABEL_PRINT",
      ],
    },
    {
      code:
        "INVENTORY_CONTROLLER",
      name:
        "Stok Kontrol Sorumlusu",
      description:
        "Stok görüntüleme, düzeltme, sayım ve transfer operasyonlarını yürütür.",
      permissionCodes: [
        "ADMIN_PORTAL_ACCESS",
        "DASHBOARD_VIEW",
        "WAREHOUSE_VIEW",
        "LOCATION_VIEW",
        "INVENTORY_VIEW",
        "INVENTORY_ADJUST",
        "COUNT_EXECUTE",
        "TRANSFER_EXECUTE",
        "HANDLING_UNIT_VIEW",
        "HANDLING_UNIT_MANAGE",
        "LABEL_PRINT",
      ],
    },
    {
      code: "RF_OPERATOR",
      name: "RF Operatörü",
      description:
        "RF terminalindeki kabul, adresleme, transfer, sayım ve toplama işlemlerini yürütür.",
      permissionCodes: [
        "WAREHOUSE_VIEW",
        "LOCATION_VIEW",
        "INVENTORY_VIEW",
        "COUNT_EXECUTE",
        "TRANSFER_EXECUTE",
        "RECEIVING_VIEW",
        "RECEIVING_EXECUTE",
        "PUTAWAY_EXECUTE",
        "WAVE_VIEW",
        "PICKING_EXECUTE",
        "HANDLING_UNIT_VIEW",
        "HANDLING_UNIT_MANAGE",
        "LABEL_PRINT",
      ],
    },
  ];

export const PERMISSION_MODULE_LABELS:
  Record<string, string> = {
    SYSTEM: "Sistem",
    DASHBOARD: "WMS Paneli",
    USERS: "Kullanıcı Yönetimi",
    ROLES:
      "Rol ve Yetki Yönetimi",
    CUSTOMERS:
      "Müşteri Yönetimi",
    WAREHOUSE:
      "Depo ve Adresler",
    INVENTORY:
      "Stok Yönetimi",
    ORDERS:
      "Sipariş Yönetimi",
    RECEIVING:
      "Mal Kabul ve Adresleme",
    WAVE:
      "Dalga ve Toplama",
    HANDLING_UNIT:
      "Taşıma Birimleri",
    LABEL: "Etiketleme",
  };