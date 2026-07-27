import type {
  PackingListData,
  PackingListProduct,
} from "@/modules/printing/services/packing-list-zpl.service";

type RFPackingListPreviewProps = {
  data: PackingListData;
};

const PRODUCTS_PER_LABEL = 6;

function formatDate(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    }
  ).format(value);
}

function splitProducts(
  products: PackingListProduct[]
) {
  const pages:
    PackingListProduct[][] = [];

  for (
    let index = 0;
    index < products.length;
    index += PRODUCTS_PER_LABEL
  ) {
    pages.push(
      products.slice(
        index,
        index +
          PRODUCTS_PER_LABEL
      )
    );
  }

  return pages.length > 0
    ? pages
    : [[]];
}

function BarcodePreview({
  value,
}: {
  value: string;
}) {
  const bars =
    Array.from(
      value
    ).flatMap(
      (
        character,
        characterIndex
      ) => {
        const code =
          character.charCodeAt(
            0
          );

        return Array.from(
          {
            length: 7,
          },
          (
            _,
            bitIndex
          ) => ({
            key:
              `${characterIndex}-${bitIndex}`,

            dark:
              (
                (
                  code >>
                  (
                    bitIndex %
                    7
                  )
                ) &
                1
              ) === 1,

            width:
              (
                code +
                bitIndex
              ) %
                3 ===
              0
                ? 2
                : 1,
          })
        );
      }
    );

  return (
    <div>
      <div className="flex h-10 w-full items-stretch justify-center overflow-hidden border-y border-black bg-white px-2 py-1">
        {bars.map(
          (bar) => (
            <span
              key={bar.key}
              className={
                bar.dark
                  ? "bg-black"
                  : "bg-white"
              }
              style={{
                width:
                  `${bar.width}px`,
                minWidth:
                  `${bar.width}px`,
              }}
            />
          )
        )}
      </div>

      <p className="mt-1 text-center text-[11px] font-black tracking-[0.15em] text-black">
        {value}
      </p>
    </div>
  );
}

function QrPreview({
  ettn,
}: {
  ettn: string;
}) {
  return (
    <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center border-2 border-black bg-white p-1 text-center text-black">
      <div
        className="h-11 w-11 border border-black"
        style={{
          backgroundImage:
            "conic-gradient(#000 25%, #fff 0 50%, #000 0 75%, #fff 0)",
          backgroundPosition:
            "0 0",
          backgroundSize:
            "8px 8px",
        }}
      />

      <span className="mt-1 text-[7px] font-black">
        E-İRSALİYE QR
      </span>

      <span className="sr-only">
        ETTN: {ettn}
      </span>
    </div>
  );
}

function EmptyQrArea() {
  return (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center border border-dashed border-slate-300 bg-slate-50 p-1 text-center text-[7px] font-bold text-slate-400">
      E-İrsaliye oluştuğunda QR kodu
    </div>
  );
}

export default function RFPackingListPreview({
  data,
}: RFPackingListPreviewProps) {
  const pages =
    splitProducts(
      data.products
    );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <p className="font-black">
          Yazıcısız Ön İzleme
        </p>

        <p className="mt-1 text-sm leading-6">
          Aşağıdaki etiketler yalnızca
          ekran kontrolüdür. Baskı
          sayısı, baskı tarihi ve hareket
          geçmişi değiştirilmez.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {pages.map(
          (
            products,
            pageIndex
          ) => (
            <article
              key={
                pageIndex
              }
              className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-black text-slate-800">
                  Etiket{" "}
                  {pageIndex +
                    1}{" "}
                  /{" "}
                  {
                    pages.length
                  }
                </p>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-white">
                  100 × 100 mm
                </span>
              </div>

              <div className="mx-auto flex aspect-square w-[100mm] max-w-full flex-col overflow-hidden border-2 border-black bg-white p-[3mm] font-sans text-black shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1 text-[10px] leading-tight">
                    <p>
                      <strong>
                        Tarih:
                      </strong>{" "}
                      {formatDate(
                        data.printedAt
                      )}
                    </p>

                    <p>
                      <strong>
                        Sip No:
                      </strong>{" "}
                      {data.orderNumbers.join(
                        ", "
                      ) || "-"}
                    </p>

                    <p>
                      <strong>
                        Alıcı:
                      </strong>{" "}
                      {
                        data.customerName
                      }
                    </p>

                    <p>
                      <strong>
                        Toplam Ürün Adeti:
                      </strong>{" "}
                      {
                        data.totalQuantity
                      }
                    </p>

                    {pages.length >
                      1 && (
                      <p>
                        <strong>
                          Sayfa:
                        </strong>{" "}
                        {pageIndex +
                          1}{" "}
                        /{" "}
                        {
                          pages.length
                        }
                      </p>
                    )}
                  </div>

                  {data.ettn ? (
                    <QrPreview
                      ettn={
                        data.ettn
                      }
                    />
                  ) : (
                    <EmptyQrArea />
                  )}
                </div>

                <div className="mt-2 min-h-0 flex-1">
                  <table className="w-full table-fixed border-collapse text-[9px] leading-tight">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="w-[27%] px-1 py-1 text-left font-black">
                          Ürün Kodu
                        </th>

                        <th className="w-[58%] px-1 py-1 text-left font-black">
                          Ürün Tanımı
                        </th>

                        <th className="w-[15%] px-1 py-1 text-right font-black">
                          Adet
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {products.map(
                        (
                          product
                        ) => (
                          <tr
                            key={
                              product.productCode
                            }
                            className="border-b border-slate-300"
                          >
                            <td className="truncate px-1 py-1 font-bold">
                              {
                                product.productCode
                              }
                            </td>

                            <td className="px-1 py-1">
                              <span className="line-clamp-2">
                                {
                                  product.productName
                                }
                              </span>
                            </td>

                            <td className="px-1 py-1 text-right font-black">
                              {
                                product.quantity
                              }
                            </td>
                          </tr>
                        )
                      )}

                      {Array.from({
                        length:
                          Math.max(
                            0,
                            PRODUCTS_PER_LABEL -
                              products.length
                          ),
                      }).map(
                        (
                          _,
                          emptyIndex
                        ) => (
                          <tr
                            key={`empty-${emptyIndex}`}
                            className="border-b border-slate-200"
                          >
                            <td className="h-6 px-1 py-1">
                              &nbsp;
                            </td>

                            <td className="px-1 py-1">
                              &nbsp;
                            </td>

                            <td className="px-1 py-1">
                              &nbsp;
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 border-t-2 border-black pt-2">
                  <p className="mb-1 text-[9px] font-black">
                    Sevk THM:
                  </p>

                  <BarcodePreview
                    value={
                      data.shippingHandlingUnitBarcode
                    }
                  />
                </div>
              </div>
            </article>
          )
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="font-black">
          Ön İzleme Bilgisi
        </p>

        <p className="mt-1 text-xs leading-5">
          Ekrandaki barkod ve QR alanları
          görsel temsil amaçlıdır. Gerçek
          baskıda ZPL yazıcı, okutulabilir
          Code 128 barkodunu ve mevcutsa
          ETTN QR kodunu kendi baskı
          komutlarıyla oluşturacaktır.
        </p>
      </div>
    </div>
  );
}