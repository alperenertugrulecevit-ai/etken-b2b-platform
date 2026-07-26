import "server-only";

import {
  isIP,
  Socket,
} from "node:net";

type NetworkPrinterConfig = {
  code: string;
  name: string;
  ipAddress: string;
  port: number;
  dpi: number;
  labelWidthMm: number;
  labelHeightMm: number;
  commandLanguage: string;
};

type PrintResult = {
  success: true;
  printerCode: string;
  printerName: string;
  ipAddress: string;
  port: number;
  byteLength: number;
};

const CONNECTION_TIMEOUT_MS =
  8000;

function normalizeText(
  value: string
) {
  return value.trim();
}

function normalizeIpAddress(
  value: string
) {
  return value
    .trim()
    .replace(
      /^https?:\/\//i,
      ""
    )
    .split("/")[0]
    .split(":")[0];
}

function isPrivateIpv4(
  ipAddress: string
) {
  if (
    isIP(ipAddress) !== 4
  ) {
    return false;
  }

  const parts =
    ipAddress
      .split(".")
      .map(Number);

  const [
    first,
    second,
  ] = parts;

  if (first === 10) {
    return true;
  }

  if (
    first === 172 &&
    second >= 16 &&
    second <= 31
  ) {
    return true;
  }

  if (
    first === 192 &&
    second === 168
  ) {
    return true;
  }

  return false;
}

function validatePrinter(
  printer: NetworkPrinterConfig
) {
  const printerCode =
    normalizeText(
      printer.code
    ).toUpperCase();

  const printerName =
    normalizeText(
      printer.name
    );

  const ipAddress =
    normalizeIpAddress(
      printer.ipAddress
    );

  if (!printerCode) {
    throw new Error(
      "Yazıcı kodu bulunamadı."
    );
  }

  if (!printerName) {
    throw new Error(
      "Yazıcı adı bulunamadı."
    );
  }

  if (
    !isPrivateIpv4(
      ipAddress
    )
  ) {
    throw new Error(
      "Barkod yazıcısı IP adresi özel yerel ağ adresi olmalıdır. Örnek: 192.168.1.50."
    );
  }

  if (
    !Number.isInteger(
      printer.port
    ) ||
    printer.port !== 9100
  ) {
    throw new Error(
      "Barkod yazıcısı portu 9100 olmalıdır."
    );
  }

  if (
    printer.dpi !== 203 &&
    printer.dpi !== 300
  ) {
    throw new Error(
      "Yazıcı çözünürlüğü 203 veya 300 DPI olmalıdır."
    );
  }

  if (
    !Number.isInteger(
      printer.labelWidthMm
    ) ||
    printer.labelWidthMm !==
      100 ||
    !Number.isInteger(
      printer.labelHeightMm
    ) ||
    printer.labelHeightMm !==
      100
  ) {
    throw new Error(
      "Çeki listesi yazıcısında etiket ölçüsü 100 × 100 mm olmalıdır."
    );
  }

  if (
    printer.commandLanguage
      .trim()
      .toUpperCase() !==
    "ZPL"
  ) {
    throw new Error(
      "Bu baskı servisi yalnızca ZPL komut dilini desteklemektedir."
    );
  }

  return {
    printerCode,
    printerName,
    ipAddress,
  };
}

function validateZpl(
  zpl: string
) {
  const normalizedZpl =
    zpl.trim();

  if (
    !normalizedZpl.startsWith(
      "^XA"
    ) ||
    !normalizedZpl.endsWith(
      "^XZ"
    )
  ) {
    throw new Error(
      "Gönderilecek baskı verisi geçerli bir ZPL etiketi değildir."
    );
  }

  if (
    Buffer.byteLength(
      normalizedZpl,
      "utf8"
    ) >
    2_000_000
  ) {
    throw new Error(
      "Baskı verisi izin verilen boyutu aşıyor."
    );
  }

  return normalizedZpl;
}

function escapeZplText(
  value: string
) {
  return value
    .replace(
      /[\^~]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

async function sendRawData({
  ipAddress,
  port,
  data,
}: {
  ipAddress: string;
  port: number;
  data: string;
}) {
  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const socket =
        new Socket();

      let completed =
        false;

      function finishWithError(
        error: Error
      ) {
        if (completed) {
          return;
        }

        completed = true;
        socket.destroy();
        reject(error);
      }

      function finishSuccessfully() {
        if (completed) {
          return;
        }

        completed = true;
        socket.destroy();
        resolve();
      }

      socket.setTimeout(
        CONNECTION_TIMEOUT_MS
      );

      socket.once(
        "timeout",
        () => {
          finishWithError(
            new Error(
              `${ipAddress}:${port} barkod yazıcısına bağlantı zaman aşımına uğradı.`
            )
          );
        }
      );

      socket.once(
        "error",
        (error) => {
          finishWithError(
            new Error(
              `${ipAddress}:${port} barkod yazıcısına bağlanılamadı: ${error.message}`
            )
          );
        }
      );

      socket.connect(
        port,
        ipAddress,
        () => {
          socket.write(
            data,
            "utf8",
            (error) => {
              if (error) {
                finishWithError(
                  new Error(
                    `Baskı verisi yazıcıya gönderilemedi: ${error.message}`
                  )
                );

                return;
              }

              socket.end(
                finishSuccessfully
              );
            }
          );
        }
      );
    }
  );
}

export class NetworkPrinterService {
  static async sendZpl(
    printer: NetworkPrinterConfig,
    zpl: string
  ): Promise<PrintResult> {
    const {
      printerCode,
      printerName,
      ipAddress,
    } =
      validatePrinter(
        printer
      );

    const normalizedZpl =
      validateZpl(
        zpl
      );

    await sendRawData({
      ipAddress,
      port:
        printer.port,
      data:
        normalizedZpl,
    });

    return {
      success: true,
      printerCode,
      printerName,
      ipAddress,
      port:
        printer.port,
      byteLength:
        Buffer.byteLength(
          normalizedZpl,
          "utf8"
        ),
    };
  }

  static async printTestLabel(
    printer: NetworkPrinterConfig
  ) {
    const {
      printerCode,
      printerName,
      ipAddress,
    } =
      validatePrinter(
        printer
      );

    const widthDots =
      Math.round(
        (
          printer.labelWidthMm /
          25.4
        ) *
          printer.dpi
      );

    const heightDots =
      Math.round(
        (
          printer.labelHeightMm /
          25.4
        ) *
          printer.dpi
      );

    const printedAt =
      new Intl.DateTimeFormat(
        "tr-TR",
        {
          dateStyle:
            "short",
          timeStyle:
            "medium",
        }
      ).format(
        new Date()
      );

    const zpl = [
      "^XA",
      "^CI28",
      `^PW${widthDots}`,
      `^LL${heightDots}`,
      "^LH0,0",
      "^FO25,25",
      "^GB750,750,3",
      "^FS",
      "^FO55,70",
      "^A0N,50,50",
      "^FDTEST BASKISI^FS",
      "^FO55,150",
      "^A0N,32,32",
      `^FDYazici: ${escapeZplText(
        printerName
      )}^FS`,
      "^FO55,205",
      "^A0N,30,30",
      `^FDKod: ${escapeZplText(
        printerCode
      )}^FS`,
      "^FO55,260",
      "^A0N,30,30",
      `^FDIP: ${escapeZplText(
        ipAddress
      )}:${printer.port}^FS`,
      "^FO55,315",
      "^A0N,30,30",
      `^FDDPI: ${printer.dpi}^FS`,
      "^FO55,370",
      "^A0N,30,30",
      "^FDEtiket: 100 x 100 mm^FS",
      "^FO55,425",
      "^A0N,30,30",
      `^FDTarih: ${escapeZplText(
        printedAt
      )}^FS`,
      "^FO145,520",
      "^BY3,2,100",
      "^BCN,100,Y,N,N",
      `^FD${escapeZplText(
        printerCode
      )}^FS`,
      "^XZ",
    ].join("\n");

    return this.sendZpl(
      printer,
      zpl
    );
  }
}