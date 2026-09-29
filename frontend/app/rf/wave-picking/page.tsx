import { redirect } from "next/navigation";

/*
 * Wave ve sipariş bazlı toplama aynı RF motorunu kullanır.
 * /rf/picking ekranı Zone görevlerini akış tipine göre ayırır ve Wave
 * görevlerini Wave numarasıyla gösterir. Böylece iki ayrı toplama ekranı
 * ve iki ayrı stok hareketi uygulaması oluşmaz.
 */
export default function RFWavePickingPage() {
  redirect("/rf/picking");
}
