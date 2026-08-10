export class ClientIpService {
  static getFromHeaders(
    requestHeaders: Headers,
  ): string | null {
    const forwardedFor =
      requestHeaders.get(
        "x-forwarded-for",
      );

    if (forwardedFor) {
      const addresses =
        forwardedFor
          .split(",")
          .map((value) =>
            value.trim(),
          )
          .filter(Boolean);

      /*
       * Google Cloud Load Balancer / Cloud Run zincirinde
       * son değer proxy/LB olabilir.
       *
       * En az iki IP varsa sondan ikinciyi tercih ediyoruz.
       */
      if (addresses.length >= 2) {
        return (
          addresses[
            addresses.length - 2
          ] ?? null
        );
      }

      if (addresses.length === 1) {
        return addresses[0] ?? null;
      }
    }

    const realIp =
      requestHeaders
        .get("x-real-ip")
        ?.trim();

    return realIp || null;
  }
}