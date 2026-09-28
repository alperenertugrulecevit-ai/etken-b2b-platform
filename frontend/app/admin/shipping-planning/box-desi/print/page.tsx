import bwipjs from "bwip-js/node";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function values(value?: string | string[]) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function createBarcodeSvg(code: string) {
  return bwipjs.toSVG({
    bcid: "code128",
    text: code,
    scale: 2,
    height: 8,
    includetext: false,
    paddingwidth: 1,
    paddingheight: 1,
    backgroundcolor: "FFFFFF",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string | string[];
    id?: string | string[];
    layout?: string;
  }>;
}) {
  await AuthorizationService.requirePermission("SHIPPING_EXECUTE");

  const p = await searchParams;
  const codes = values(p.code);
  const ids = values(p.id);

  const rows =
    codes.length || ids.length
      ? await prisma.shippingBoxDefinition.findMany({
          where: {
            tenantId: "tenant_etken",
            companyId: "company_etken_office",
            isActive: true,
            OR: [
              ...(codes.length ? [{ code: { in: codes } }] : []),
              ...(ids.length ? [{ id: { in: ids } }] : []),
            ],
          },
          orderBy: { code: "asc" },
        })
      : [];

  const labels = rows.map((row) => ({
    ...row,
    barcode: createBarcodeSvg(row.code),
  }));
  const thermal = p.layout === "thermal";

  return (
    <main>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page{size:${thermal ? "50mm 30mm" : "A4"};margin:${thermal ? "0" : "8mm"}}
            *{box-sizing:border-box}
            body{font-family:Arial,sans-serif;margin:0;color:#0f172a}
            .toolbar{display:flex;gap:12px;align-items:center;padding:10px;background:#eee}
            .sheet{display:grid;grid-template-columns:${thermal ? "50mm" : "repeat(3,50mm)"};gap:2mm}
            .label{width:50mm;height:30mm;border:1px solid #aaa;padding:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-inside:avoid;overflow:hidden}
            .code{font-size:12px;font-weight:800}
            .meta{font-size:9px;white-space:nowrap}
            .barcode{width:46mm;height:10mm}
            .barcode svg{width:100%;height:100%;display:block}
            .empty{margin:24px;padding:18px;border:1px solid #f59e0b;background:#fffbeb;font-weight:700}
            @media print{.toolbar,.empty{display:none}.sheet{gap:0}.label{border:0}}
          `,
        }}
      />

      <div className="toolbar">
        <button type="button" onClick={undefined} style={{ display: "none" }} />
        <b>Yazdırmak için tarayıcı menüsünden Yazdır veya Ctrl+P kullanın.</b>
        <Link href="/admin/shipping-planning/box-desi">Geri dön</Link>
      </div>

      {labels.length === 0 ? (
        <div className="empty">
          Yazdırılacak koli barkodu bulunamadı. Desi Bilgileri ekranına dönüp en az bir koli seçin.
        </div>
      ) : (
        <div className="sheet">
          {labels.map((row) => (
            <div className="label" key={row.id}>
              <div className="code">{row.code}</div>
              <div
                className="barcode"
                dangerouslySetInnerHTML={{ __html: row.barcode }}
              />
              <div className="meta">
                {row.boxType} · {row.dimensions} · Desi {row.desi}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
