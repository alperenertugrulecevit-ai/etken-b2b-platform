"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function norm(v:string){return v.trim().toLocaleLowerCase("tr-TR")}
function num(v:string){const n=Number(v.replace(/[^0-9,.-]/g,"").replace(",", "."));return Number.isFinite(n)?n:null}
function dateValue(v:string){const m=v.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime():null}
function todayIstanbul(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}

export default function AdminTableEnhancer(){
 const pathname=usePathname(); const router=useRouter(); const searchParams=useSearchParams();

 // Admin rapor/listelerinde başlangıç tarihi boşsa bugünden başlat.
 useEffect(()=>{
  if(pathname==="/admin/order-grouping") return;
  const startInput=document.querySelector<HTMLInputElement>('main input[type="date"][name="startDate"], main input[type="date"][name="dateFrom"]');
  if(!startInput||startInput.value||searchParams.has(startInput.name)) return;
  const params=new URLSearchParams(searchParams.toString());
  params.set(startInput.name,todayIstanbul());
  router.replace(pathname+"?"+params.toString(),{scroll:false});
 },[pathname,router,searchParams]);

 // Admin tablolarının tamamında başlık sıralaması + sütun filtresi.
 useEffect(()=>{
  if(pathname==="/admin/order-grouping") return;
  const tables=[...document.querySelectorAll<HTMLTableElement>("main table:not([data-no-admin-enhance])")];
  const cleanups:(()=>void)[]=[];
  for(const table of tables){
   const head=table.tHead?.rows?.[0],body=table.tBodies?.[0];
   if(!head||!body||head.dataset.enhanced==="1") continue;
   head.dataset.enhanced="1";
   const cells=[...head.cells];

   cells.forEach((th,index)=>{
    const title=th.textContent?.trim()||"";
    if(!title||["Aç","Seç","İşlem"].includes(title)) return;
    const label=document.createElement("span");
    label.className="inline-flex items-center gap-1";
    while(th.firstChild) label.appendChild(th.firstChild);
    const arrow=document.createElement("span"); arrow.textContent="↕"; arrow.className="text-[11px] opacity-60";
    label.appendChild(arrow); th.appendChild(label);
    th.style.cursor="pointer"; th.title="Sıralamak için tıklayın";
    let dir=1;
    const click=()=>{const rows=[...body.rows].filter(r=>!r.querySelector('td[colspan]'));rows.sort((a,b)=>{
      const av=a.cells[index]?.textContent?.trim()||"",bv=b.cells[index]?.textContent?.trim()||"";
      const ad=dateValue(av),bd=dateValue(bv); if(ad!==null&&bd!==null)return (ad-bd)*dir;
      const an=num(av),bn=num(bv); if(an!==null&&bn!==null)return (an-bn)*dir;
      return av.localeCompare(bv,"tr",{numeric:true,sensitivity:"base"})*dir;
    });rows.forEach(r=>body.appendChild(r));arrow.textContent=dir===1?"↑":"↓";dir*=-1;};
    th.addEventListener("click",click);cleanups.push(()=>th.removeEventListener("click",click));
   });

   const filterRow=document.createElement("tr");filterRow.dataset.adminFilter="1";filterRow.className="bg-slate-50";
   cells.forEach((th,index)=>{
    const td=document.createElement("th");td.className="p-1";
    const title=th.textContent?.replace(/[↕↑↓]/g,"").trim()||"";
    if(title&&!["Aç","Seç","İşlem"].includes(title)){
      const input=document.createElement("input");input.dataset.column=String(index);input.placeholder="Filtre";input.setAttribute("aria-label",title+" filtresi");
      input.className="w-full min-w-[76px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-normal text-slate-800 outline-none focus:border-blue-600";
      input.addEventListener("click",e=>e.stopPropagation());
      const apply=()=>{const filters=[...filterRow.querySelectorAll<HTMLInputElement>("input")];[...body.rows].forEach(row=>{
       if(row.querySelector('td[colspan]')) return;
       const ok=filters.every(f=>{const i=Number(f.dataset.column);return !f.value||norm(row.cells[i]?.textContent||"").includes(norm(f.value))});
       row.style.display=ok?"":"none";
      })};
      input.addEventListener("input",apply);td.appendChild(input);
    }
    filterRow.appendChild(td);
   });
   head.parentElement?.appendChild(filterRow);cleanups.push(()=>filterRow.remove());
  }
  return()=>cleanups.forEach(x=>x());
 },[pathname,searchParams]);

 return null;
}
