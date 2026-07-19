import Link from "next/link";
import { notFound } from "next/navigation";

import bwipjs from "bwip-js/node";

import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/admin/PrintButton";

type LabelType =
  | "handling-unit"
  | "location"
  | "product";

type LabelLayout =
  | "a4"
  | "thermal-70x40"
  | "thermal-100x50";

type Props = {
  searchParams: Promise<{
    type?: string;
    ids?: string;
    layout?: string;
  }>;
};

type PrintableLabel = {
  id: number;
  primaryText: string;
  secondaryText?: string;
  barcodeValue: string;
  barcodeSvg: string;
};

function parseIds(
  value: string | undefined
) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0
        )
    )
  ).slice(0, 500);
}

function isLabelType(
  value: string
): value is LabelType {
  return [
    "handling-unit",
    "location",
    "product",
  ].includes(value);
}

function isLabelLayout(
  value: string
): value is LabelLayout {
  return [
    "a4",
    "thermal-70x40",
    "thermal-100x50",
  ].includes(value);
}

function createBarcodeSvg(
  barcodeValue: string
) {
  return bwipjs.toSVG({
    bcid: "code128",
    text: barcodeValue,
    scale: 2,
    height: 11,
    includetext: false,
    paddingwidth: 2,
    paddingheight: 2,
    backgroundcolor: "FFFFFF",
  });
}

function createFullLocationCode({
  code,
  section,
  level,
  bin,
}: {
  code: string;
  section: string;
  level: string;
  bin: string;
}) {
  return [
    code,
    section,
    level,
    bin,
  ]
    .filter(Boolean)
    .join("-");
}

async function getHandlingUnitLabels(
  ids: number[]
): Promise<PrintableLabel[]> {
  const units =
    await prisma.handlingUnit.findMany({
      where: {
        id: {
          in: ids,
        },
      },

      orderBy: {
        barcode: "asc",
      },

      select: {
        id: true,
        barcode: true,
      },
    });

  return units.map((unit) => ({
    id: unit.id,
    primaryText: unit.barcode,
    barcodeValue: unit.barcode,
    barcodeSvg: createBarcodeSvg(
      unit.barcode
    ),
  }));
}

async function getLocationLabels(
  ids: number[]
): Promise<PrintableLabel[]> {
  const locations =
    await prisma.warehouseLocation.findMany({
      where: {
        id: {
          in: ids,
        },
      },

      orderBy: [
        {
          warehouse: {
            code: "asc",
          },
        },
        {
          sortOrder: "asc",
        },
        {
          code: "asc",
        },
        {
          section: "asc",
        },
        {
          level: "asc",
        },
        {
          bin: "asc",
        },
      ],

      select: {
        id: true,
        code: true,
        section: true,
        level: true,
        bin: true,
      },
    });

  return locations.map((location) => {
    const fullLocationCode =
      createFullLocationCode({
        code: location.code,
        section: location.section,
        level: location.level,
        bin: location.bin,
      });

    return {
      id: location.id,
      primaryText: fullLocationCode,
      barcodeValue: fullLocationCode,
      barcodeSvg: createBarcodeSvg(
        fullLocationCode
      ),
    };
  });
}

async function getProductLabels(
  ids: number[]
): Promise<PrintableLabel[]> {
  const products =
    await prisma.product.findMany({
      where: {
        id: {
          in: ids,
        },
      },

      orderBy: [
        {
          name: "asc",
        },
        {
          code: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        barcode: true,
      },
    });

  return products.map((product) => ({
    id: product.id,
    primaryText: product.name,
    secondaryText: product.barcode,
    barcodeValue: product.barcode,
    barcodeSvg: createBarcodeSvg(
      product.barcode
    ),
  }));
}

function getReturnPath(
  labelType: LabelType
) {
  if (labelType === "location") {
    return "/admin/warehouses";
  }

  if (labelType === "product") {
    return "/admin/products";
  }

  return "/admin/handling-units";
}

function getReturnLabel(
  labelType: LabelType
) {
  if (labelType === "location") {
    return "Lokasyonlara Dön";
  }

  if (labelType === "product") {
    return "Ürünlere Dön";
  }

  return "Koli / Paletlere Dön";
}

export default async function LabelPrintPage({
  searchParams,
}: Props) {
  const query = await searchParams;

  const labelTypeValue =
    query.type?.trim() ?? "";

  const layoutValue =
    query.layout?.trim() ?? "a4";

  if (!isLabelType(labelTypeValue)) {
    notFound();
  }

  const labelType = labelTypeValue;

  const layout: LabelLayout =
    isLabelLayout(layoutValue)
      ? layoutValue
      : "a4";

  const ids = parseIds(query.ids);

  if (ids.length === 0) {
    notFound();
  }

  let labels: PrintableLabel[] = [];

  if (labelType === "handling-unit") {
    labels =
      await getHandlingUnitLabels(ids);
  }

  if (labelType === "location") {
    labels =
      await getLocationLabels(ids);
  }

  if (labelType === "product") {
    labels =
      await getProductLabels(ids);
  }

  if (labels.length === 0) {
    notFound();
  }

  const idsQuery = ids.join(",");

  const returnPath =
    getReturnPath(labelType);

  const returnLabel =
    getReturnLabel(labelType);

  return (
    <main className="label-print-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        body {
          background: #e2e8f0;
        }

        .label-print-page {
          min-height: 100vh;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .print-toolbar {
          display: flex;
          max-width: 1200px;
          margin: 0 auto 24px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .toolbar-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toolbar-link {
          display: inline-flex;
          min-height: 44px;
          padding: 10px 16px;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          color: #0f172a;
          font-weight: 700;
          text-decoration: none;
        }

        .toolbar-link.active {
          border-color: #1e3a8a;
          background: #1e3a8a;
          color: white;
        }

        .label-sheet {
          margin: 0 auto;
          background: white;
        }

        /*
         * A4:
         * 3 sütun x 5 satır
         * Her sayfada 15 etiket
         */
        .label-sheet.a4 {
          width: 210mm;
          min-height: 297mm;
          display: grid;
          grid-template-columns: repeat(
            3,
            1fr
          );
          grid-auto-rows: 54mm;
          gap: 2mm;
          padding: 8mm;
          align-content: start;
        }

        .label-sheet.thermal-70x40 {
          width: 70mm;
        }

        .label-sheet.thermal-100x50 {
          width: 100mm;
        }

        .label-card {
          display: flex;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 0.35mm solid #000;
          background: white;
          text-align: center;
        }

        .a4 .label-card {
          width: 100%;
          height: 54mm;
          padding: 4mm;
          border-radius: 2mm;
        }

        .thermal-70x40 .label-card {
          width: 70mm;
          height: 40mm;
          padding: 3mm;
          border-radius: 0;
          break-after: page;
          page-break-after: always;
        }

        .thermal-100x50 .label-card {
          width: 100mm;
          height: 50mm;
          padding: 4mm;
          border-radius: 0;
          break-after: page;
          page-break-after: always;
        }

        .label-primary {
          display: -webkit-box;
          width: 100%;
          overflow: hidden;
          margin: 0;
          color: #000;
          font-weight: 900;
          line-height: 1.1;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
        }

        /*
         * Lokasyon formatı:
         * A-01-02-03
         * Code 128
         */
        .location-label .label-primary {
          font-family: "Courier New",
            monospace;
          font-size: 6mm;
          letter-spacing: 0.3mm;
          -webkit-line-clamp: 1;
        }

        /*
         * Koli / Palet formatı:
         * KOL00000025
         * Code 128
         */
        .handling-unit-label
          .label-primary {
          font-family: "Courier New",
            monospace;
          font-size: 6mm;
          letter-spacing: 0.3mm;
          -webkit-line-clamp: 1;
        }

        /*
         * Ürün formatı:
         * Ürün tanımı
         * 8691234567890
         * Code 128
         */
        .product-label .label-primary {
          min-height: 11mm;
          font-size: 4.1mm;
          -webkit-line-clamp: 2;
        }

        .label-secondary {
          width: 100%;
          margin: 2mm 0 0;
          font-family: "Courier New",
            monospace;
          font-size: 3.8mm;
          font-weight: 800;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .barcode-container {
          display: flex;
          width: 100%;
          min-height: 18mm;
          margin-top: 3mm;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .barcode-container svg {
          display: block;
          width: 100%;
          max-width: 100%;
          height: 18mm;
        }

        .thermal-70x40
          .location-label
          .label-primary,
        .thermal-70x40
          .handling-unit-label
          .label-primary {
          font-size: 5mm;
        }

        .thermal-70x40
          .product-label
          .label-primary {
          min-height: 8mm;
          font-size: 3.5mm;
        }

        .thermal-70x40
          .label-secondary {
          margin-top: 1.2mm;
          font-size: 3.2mm;
        }

        .thermal-70x40
          .barcode-container {
          min-height: 14mm;
          margin-top: 2mm;
        }

        .thermal-70x40
          .barcode-container
          svg {
          height: 14mm;
        }

        .thermal-100x50
          .location-label
          .label-primary,
        .thermal-100x50
          .handling-unit-label
          .label-primary {
          font-size: 7mm;
        }

        .thermal-100x50
          .product-label
          .label-primary {
          min-height: 11mm;
          font-size: 4.5mm;
        }

        .thermal-100x50
          .label-secondary {
          font-size: 4mm;
        }

        .thermal-100x50
          .barcode-container
          svg {
          height: 20mm;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .label-print-page {
            min-height: auto;
            padding: 0;
          }

          .print-toolbar {
            display: none !important;
          }

          .label-sheet {
            margin: 0;
            box-shadow: none;
          }

          .label-sheet.a4 {
            width: 210mm;
            min-height: 297mm;
            padding: 8mm;
          }

          .label-sheet.thermal-70x40 {
            width: 70mm;
          }

          .label-sheet.thermal-100x50 {
            width: 100mm;
          }

          .label-sheet.thermal-70x40,
          .label-sheet.thermal-100x50 {
            margin: 0;
          }
        }
      `}</style>

      <div className="print-toolbar">
        <Link
          href={returnPath}
          className="toolbar-link"
        >
          ← {returnLabel}
        </Link>

        <div className="toolbar-actions">
          <Link
            href={`/labels/print?type=${labelType}&ids=${idsQuery}&layout=a4`}
            className={`toolbar-link ${
              layout === "a4"
                ? "active"
                : ""
            }`}
          >
            A4 3x5
          </Link>

          <Link
            href={`/labels/print?type=${labelType}&ids=${idsQuery}&layout=thermal-70x40`}
            className={`toolbar-link ${
              layout ===
              "thermal-70x40"
                ? "active"
                : ""
            }`}
          >
            Termal 70x40
          </Link>

          <Link
            href={`/labels/print?type=${labelType}&ids=${idsQuery}&layout=thermal-100x50`}
            className={`toolbar-link ${
              layout ===
              "thermal-100x50"
                ? "active"
                : ""
            }`}
          >
            Termal 100x50
          </Link>

          <PrintButton />
        </div>
      </div>

      <section
        className={`label-sheet ${layout}`}
      >
        {labels.map((label) => (
          <article
            key={`${labelType}-${label.id}`}
            className={`label-card ${labelType}-label`}
          >
            <p className="label-primary">
              {label.primaryText}
            </p>

            {label.secondaryText && (
              <p className="label-secondary">
                {label.secondaryText}
              </p>
            )}

            <div
              className="barcode-container"
              dangerouslySetInnerHTML={{
                __html:
                  label.barcodeSvg,
              }}
            />
          </article>
        ))}
      </section>
    </main>
  );
}