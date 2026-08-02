export async function GET() {
  const rows = [
    "Ad Soyad;Kullanıcı Adı;E-posta;Rol;Adres Kodları;Geçici Şifre",
    "Ayşe Yılmaz;ayse.yilmaz;ayse@example.com;CUSTOMER_ADMIN;;Etken123!",
    "Mehmet Demir;mehmet.demir;mehmet@example.com;BUYER;;",
    "Ali Kaya;ali.kaya;ali@example.com;ADDRESS_USER;MERKEZ-DEPO,ŞUBE-1;",
  ];
  const body = "\uFEFF" + rows.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kurumsal-kullanici-sablonu.csv"',
      "Cache-Control": "no-store",
    },
  });
}
