import {
  Ofis26SupplierBatchSyncService,
} from "@/modules/competitor-prices/ofis26-supplier-batch-sync.service";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

function unauthorizedResponse() {
  return Response.json(
    {
      success:
        false,

      message:
        "Unauthorized.",
    },
    {
      status:
        401,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}

function serverErrorResponse(
  error:
    unknown,
) {
  const message =
    error instanceof
    Error
      ? error.message
      : "Ofis26 otomatik senkronizasyonu başarısız oldu.";

  return Response.json(
    {
      success:
        false,

      message,
    },
    {
      status:
        500,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}

function isAuthorized(
  request:
    Request,
): boolean {
  const configuredSecret =
    process.env
      .OFIS26_SYNC_SECRET
      ?.trim();

  /*
   * Secret production ortamında
   * tanımlı değilse endpoint
   * kesinlikle çalışmaz.
   */
  if (
    !configuredSecret
  ) {
    return false;
  }

  const authorization =
    request.headers
      .get(
        "authorization",
      )
      ?.trim();

  if (
    !authorization
  ) {
    return false;
  }

  const expected =
    `Bearer ${configuredSecret}`;

  return (
    authorization ===
    expected
  );
}

export async function POST(
  request:
    Request,
) {
  if (
    !isAuthorized(
      request,
    )
  ) {
    return unauthorizedResponse();
  }

  try {
    const summary =
      await Ofis26SupplierBatchSyncService
        .syncNextBatch();

    return Response.json(
      {
        success:
          true,

        sync:
          summary,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Ofis26 scheduled sync failed:",
      error,
    );

    return serverErrorResponse(
      error,
    );
  }
}

/*
 * GET ile yanlışlıkla browser'dan
 * senkron başlatılmasını engelliyoruz.
 */
export async function GET() {
  return Response.json(
    {
      success:
        false,

      message:
        "Method not allowed.",
    },
    {
      status:
        405,

      headers: {
        Allow:
          "POST",

        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}