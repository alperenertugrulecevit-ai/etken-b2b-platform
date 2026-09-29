import { redirect } from "next/navigation";

/*
 * Wave toplama ayrı menü/akış olarak kalır; görsel ve okutma motoru ortak
 * RF picking ekranıdır. flow=wave yalnız Wave Zone görevlerini gösterir.
 */
export default function RFWavePickingPage() {
  redirect("/rf/picking?flow=wave");
}
