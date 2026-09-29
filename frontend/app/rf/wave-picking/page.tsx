import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Wave RF, Sipariş Bazlı Toplama ile aynı güncel RF ekranını kullanır.
 * flow=wave Wave listesini ve Wave bağlamını korur; eski havuz formu artık
 * kullanıcıya sunulmaz.
 */
export default function RFWavePickingPage() {
  redirect("/rf/picking?flow=wave");
}
