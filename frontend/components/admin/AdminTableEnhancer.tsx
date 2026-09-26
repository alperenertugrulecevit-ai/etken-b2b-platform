"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

function norm(v:string){return v.trim().toLocaleLowerCase("tr-TR")}
function num(v:string){const n=Number(v.replace(/[^0-9,.-]/g,"").replace(",", "."));return Number.isFinite(n)?n:null}
function dateValue(v:string){const m=v.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime():null}

export default function AdminTableEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname==="/admin/order-grouping") return;
  const tables=[...document.querySelectorAll<HTMLTableElement>("main table:not([data-no-admin-enhance])")];
  const cleanups:(()=>void)[]=[];
  for(const table of tables){
   const head=table.tHead?.rows?.[0]; const body=table.tBodies?.[0];
   if(!head||!body||head.dataset.enhanced==="1") continue;
   head.dataset.enhanced="1";
   const cells=[...head.cells];
   cells.forEach((th,index)=>{
    const title=th.textContent?.trim()||""; if(!title||["Aç","Seç","İşlem"].includes(title)) return;
    th.style.cursor="pointer"; th.title="Sıralamak için tıklayın";
    let dir=0;
    const click=()=>{dir=dir===-1?1:-1;const rows=[...body.rows];rows.sort((a,b)=>{
      const av=a.cells[index]?.textContent?.trim()||"",bv=b.cells[index]?.textContent?.trim()||"";
      const ad=dateValue(av),bd=dateValue(bv); if(ad!==null&&bd!==null)return (ad-bd)*dir;
      const an=num(av),bn=num(bv); if(an!==null&&bn!==null)return (an-bn)*dir;
      return av.localeCompare(bv,"tr",{numeric:true,sensitivity:"base"})*dir;
    });rows.forEach(r=>body.appendChild(r));};
    th.addEventListener("click",click); cleanups.push(()=>th.removeEventListener("click",click));
   });
   const dateIndex=cells.findIndex(th=>/^(tarih|oluşturma tarihi|sevkiyat tarihi)$/i.test(th.textContent?.trim()||""));
   if(dateIndex>=0){
    const start=new Date(); start.setHours(0,0,0,0);
    [...body.rows].forEach(row=>{const d=dateValue(row.cells[dateIndex]?.textContent||"");if(d!==null&&d<start.getTime())row.style.display="none";});
   }
   const filterRow=document.createElement("tr"); filterRow.dataset.adminFilter="1"; filterRow.className="bg-slate-50";
   cells.forEach((th,index)=>{
    const td=document.createElement("th");td.className="p-1";
    const title=th.textContent?.trim()||"";
    if(title&&!["Aç","Seç","İşlem"].includes(title)){
      const input=document.createElement("input");input.dataset.column=String(index);input.placeholder="Filtre";input.className="w-full min-w-[70px] rounded border bg-white px-2 py-1 text-xs font-normal";
      input.addEventListener("click",e=>e.stopPropagation());
      const apply=()=>{const filters=[...filterRow.querySelectorAll<HTMLInputElement>("input")];const dateIndex=cells.findIndex(th=>/^(tarih|oluşturma tarihi|sevkiyat tarihi)$/i.test(th.textContent?.trim()||""));const start=new Date();start.setHours(0,0,0,0);[...body.rows].forEach(row=>{const columnOk=filters.every(f=>{const i=Number(f.dataset.column);return !f.value||norm(row.cells[i]?.textContent||"").includes(norm(f.value));});const d=dateIndex>=0?dateValue(row.cells[dateIndex]?.textContent||""):null;const dateOk=dateIndex<0||d===null||d>=start.getTime();row.style.display=columnOk&&dateOk?"":"none";});};
      input.addEventListener("input",apply);td.appendChild(input);
    }
    filterRow.appendChild(td);
   }); head.parentElement?.appendChild(filterRow);
   cleanups.push(()=>filterRow.remove());
  }
  return()=>cleanups.forEach(x=>x());
 },[pathname]);
 return null;
}
