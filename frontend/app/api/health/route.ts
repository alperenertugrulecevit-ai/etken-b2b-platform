export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "ok",
      service: "etken-b2b",
      timestamp:
        new Date().toISOString(),
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}
