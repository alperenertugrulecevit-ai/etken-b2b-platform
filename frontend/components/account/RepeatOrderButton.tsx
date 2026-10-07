"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, type CartItem } from "@/context/CartContext";

export default function RepeatOrderButton({items,unavailableCount}:{items:CartItem[];unavailableCount:number}){
 const {addToCart,isHydrated}=useCart();
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 function repeat(){
  if(!isHydrated||busy||items.length===0)return;
  setBusy(true);
  for(const item of items)addToCart(item);
  setMessage(unavailableCount>0 ? `Sepete eklendi. ${unavailableCount} ürün güncel stok/satış durumu nedeniyle eklenmedi.` : "Sipariş ürünleri güncel fiyat ve stokla sepete eklendi.");
  router.push("/cart");
 }
 return <div className="flex flex-col items-end gap-1"><button type="button" disabled={!isHydrated||busy||items.length===0} onClick={repeat} className="rounded-lg bg-[#202B38] px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
  {busy?"Sepete Ekleniyor...":"Tekrar Sipariş Ver"}
 </button>{message?<span className="text-xs font-semibold text-emerald-700">{message}</span>:null}</div>;
}
