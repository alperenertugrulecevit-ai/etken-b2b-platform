import "server-only";

export type PackingListProduct = {
  productCode: string;
  productName: string;
  quantity: number;
};

export type PackingListData = {
  shippingHandlingUnitBarcode: string;

  printedAt: Date;
  closedAt: Date | null;

  customerName: string;
  orderNumbers: string[];

  totalQuantity: number;

  ettn: string | null;

  products: PackingListProduct[];
};

type CreatePackingListZplInput = {
  dpi: number;
  labelWidthMm: number;
  labelHeightMm: number;
  data: PackingListData;
};

const BASE_DPI = 203;

const PRODUCTS_PER_LABEL = 6;

function normalizeText(
  value: string
) {
  return value
    .replace(
      /[\^~]/g,
      " "
    )
    .replace(
      /[\r\n\t]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function limitText(
  value: string,
  maxLength: number
) {
  const normalized =
    normalizeText(
      value
    );

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return (
    normalized.slice(
      0,
      Math.max(
        0,
        maxLength - 3
      )
    ) + "..."
  );
}

function formatDate(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(value);
}

function splitIntoPages<T>(
  values: T[],
  pageSize: number
) {
  const pages: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += pageSize
  ) {
    pages.push(
      values.slice(
        index,
        index + pageSize
      )
    );
  }

  return pages;
}

function validateInput(
  input: CreatePackingListZplInput
) {
  if (
    input.dpi !== 203 &&
    input.dpi !== 300
  ) {
    throw new Error(
      "Çeki listesi yalnızca 203 veya 300 DPI yazıcı için oluşturulabilir."
    );
  }

  if (
    input.labelWidthMm !==
      100 ||
    input.labelHeightMm !==
      100
  ) {
    throw new Error(
      "Çeki listesi etiket ölçüsü 100 × 100 mm olmalıdır."
    );
  }

  if (
    !input.data
      .shippingHandlingUnitBarcode
      .trim()
  ) {
    throw new Error(
      "Sevk THM barkodu bulunamadı."
    );
  }

  if (
    !input.data
      .customerName
      .trim()
  ) {
    throw new Error(
      "Çeki listesi alıcı bilgisi bulunamadı."
    );
  }

  if (
    input.data.products.length ===
    0
  ) {
    throw new Error(
      "Çeki listesinde yazdırılacak ürün bulunamadı."
    );
  }

  for (
    const product of
      input.data.products
  ) {
    if (
      !product.productCode
        .trim() ||
      !product.productName
        .trim() ||
      !Number.isInteger(
        product.quantity
      ) ||
      product.quantity <= 0
    ) {
      throw new Error(
        "Çeki listesinde geçersiz ürün satırı bulunuyor."
      );
    }
  }
}

function createCoordinateScaler(
  dpi: number
) {
  const scale =
    dpi / BASE_DPI;

  return (
    value: number
  ) =>
    Math.round(
      value * scale
    );
}

function commandPosition(
  scale: (
    value: number
  ) => number,
  x: number,
  y: number
) {
  return `^FO${scale(
    x
  )},${scale(y)}`;
}

function commandFont(
  scale: (
    value: number
  ) => number,
  height: number,
  width = height
) {
  return `^A0N,${scale(
    height
  )},${scale(width)}`;
}

function createQrCommands({
  scale,
  ettn,
}: {
  scale: (
    value: number
  ) => number;
  ettn: string | null;
}) {
  if (!ettn?.trim()) {
    return [
      commandPosition(
        scale,
        625,
        20
      ),
      commandFont(
        scale,
        20,
        18
      ),
      `^FB${scale(
        150
      )},3,${scale(
        4
      )},C,0`,
      "^FDE-IRSALIYE HENUZ OLUSMADI^FS",
    ];
  }

  const qrPayload =
    `ETTN:${normalizeText(
      ettn
    )}`;

  return [
    commandPosition(
      scale,
      625,
      10
    ),
    commandFont(
      scale,
      18,
      17
    ),
    `^FB${scale(
      150
    )},1,0,C,0`,
    "^FDE-IRSALIYE^FS",

    commandPosition(
      scale,
      640,
      38
    ),
    `^BQN,2,${
      scale(4)
    }`,
    `^FDLA,${qrPayload}^FS`,
  ];
}

function createProductRows({
  scale,
  products,
}: {
  scale: (
    value: number
  ) => number;
  products: PackingListProduct[];
}) {
  const commands: string[] =
    [];

  products.forEach(
    (
      product,
      index
    ) => {
      const rowY =
        252 +
        index * 47;

      commands.push(
        commandPosition(
          scale,
          18,
          rowY
        ),
        commandFont(
          scale,
          21,
          18
        ),
        `^FD${limitText(
          product.productCode,
          18
        )}^FS`,

        commandPosition(
          scale,
          190,
          rowY
        ),
        commandFont(
          scale,
          20,
          17
        ),
        `^FB${scale(
          420
        )},2,${scale(
          1
        )},L,0`,
        `^FD${limitText(
          product.productName,
          50
        )}^FS`,

        commandPosition(
          scale,
          665,
          rowY
        ),
        commandFont(
          scale,
          23,
          20
        ),
        `^FB${scale(
          105
        )},1,0,R,0`,
        `^FD${product.quantity}^FS`
      );
    }
  );

  return commands;
}

function createLabel({
  input,
  products,
  pageNumber,
  pageCount,
}: {
  input: CreatePackingListZplInput;
  products: PackingListProduct[];
  pageNumber: number;
  pageCount: number;
}) {
  const scale =
    createCoordinateScaler(
      input.dpi
    );

  const widthDots =
    Math.round(
      (
        input.labelWidthMm /
        25.4
      ) *
        input.dpi
    );

  const heightDots =
    Math.round(
      (
        input.labelHeightMm /
        25.4
      ) *
        input.dpi
    );

  const data =
    input.data;

  const orderNumbers =
    data.orderNumbers.length >
    0
      ? data.orderNumbers.join(
          ", "
        )
      : "-";

  const date =
    formatDate(
      data.closedAt ??
        data.printedAt
    );

  const commands = [
    "^XA",
    "^CI28",
    `^PW${widthDots}`,
    `^LL${heightDots}`,
    "^LH0,0",
    "^LS0",

    commandPosition(
      scale,
      15,
      15
    ),
    commandFont(
      scale,
      23,
      20
    ),
    "^FDTarih:^FS",

    commandPosition(
      scale,
      105,
      15
    ),
    commandFont(
      scale,
      23,
      19
    ),
    `^FD${normalizeText(
      date
    )}^FS`,

    commandPosition(
      scale,
      15,
      50
    ),
    commandFont(
      scale,
      23,
      20
    ),
    "^FDSip No:^FS",

    commandPosition(
      scale,
      105,
      50
    ),
    commandFont(
      scale,
      21,
      18
    ),
    `^FB${scale(
      485
    )},2,${scale(
      2
    )},L,0`,
    `^FD${limitText(
      orderNumbers,
      70
    )}^FS`,

    commandPosition(
      scale,
      15,
      95
    ),
    commandFont(
      scale,
      23,
      20
    ),
    "^FDAlıcı:^FS",

    commandPosition(
      scale,
      105,
      95
    ),
    commandFont(
      scale,
      22,
      19
    ),
    `^FB${scale(
      485
    )},2,${scale(
      2
    )},L,0`,
    `^FD${limitText(
      data.customerName,
      65
    )}^FS`,

    commandPosition(
      scale,
      15,
      145
    ),
    commandFont(
      scale,
      23,
      20
    ),
    "^FDToplam Urun Adeti:^FS",

    commandPosition(
      scale,
      225,
      145
    ),
    commandFont(
      scale,
      25,
      22
    ),
    `^FD${data.totalQuantity}^FS`,

    ...createQrCommands({
      scale,
      ettn:
        data.ettn,
    }),

    commandPosition(
      scale,
      10,
      190
    ),
    `^GB${scale(
      770
    )},${scale(
      2
    )},${scale(
      2
    )}^FS`,

    commandPosition(
      scale,
      18,
      205
    ),
    commandFont(
      scale,
      22,
      19
    ),
    "^FDUrun Kodu^FS",

    commandPosition(
      scale,
      190,
      205
    ),
    commandFont(
      scale,
      22,
      19
    ),
    "^FDUrun Tanimi^FS",

    commandPosition(
      scale,
      665,
      205
    ),
    commandFont(
      scale,
      22,
      19
    ),
    `^FB${scale(
      105
    )},1,0,R,0`,
    "^FDAdet^FS",

    commandPosition(
      scale,
      10,
      238
    ),
    `^GB${scale(
      770
    )},${scale(
      2
    )},${scale(
      2
    )}^FS`,

    ...createProductRows({
      scale,
      products,
    }),

    commandPosition(
      scale,
      10,
      545
    ),
    `^GB${scale(
      770
    )},${scale(
      2
    )},${scale(
      2
    )}^FS`,

    commandPosition(
      scale,
      15,
      565
    ),
    commandFont(
      scale,
      25,
      22
    ),
    "^FDSevk THM:^FS",

    commandPosition(
      scale,
      165,
      560
    ),
    `^BY${scale(
      2
    )},2,${scale(
      105
    )}`,
    `^BCN,${scale(
      105
    )},Y,N,N`,
    `^FD${normalizeText(
      data
        .shippingHandlingUnitBarcode
    )}^FS`,

    commandPosition(
      scale,
      15,
      745
    ),
    commandFont(
      scale,
      18,
      16
    ),
    `^FDSayfa ${pageNumber}/${pageCount}^FS`,

    commandPosition(
      scale,
      470,
      745
    ),
    commandFont(
      scale,
      17,
      15
    ),
    `^FB${scale(
      300
    )},1,0,R,0`,
    `^FDBaski: ${normalizeText(
      formatDate(
        data.printedAt
      )
    )}^FS`,

    "^XZ",
  ];

  return commands.join(
    "\n"
  );
}

export class PackingListZplService {
  static createLabels(
    input: CreatePackingListZplInput
  ) {
    validateInput(
      input
    );

    const sortedProducts =
      [...input.data.products].sort(
        (
          left,
          right
        ) =>
          left.productCode.localeCompare(
            right.productCode,
            "tr"
          )
      );

    const pages =
      splitIntoPages(
        sortedProducts,
        PRODUCTS_PER_LABEL
      );

    return pages.map(
      (
        products,
        index
      ) =>
        createLabel({
          input,
          products,
          pageNumber:
            index + 1,
          pageCount:
            pages.length,
        })
    );
  }

  static createPrintJob(
    input: CreatePackingListZplInput
  ) {
    return this.createLabels(
      input
    ).join(
      "\n"
    );
  }
}