"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function StoreVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    try {
      const key = "etken-visitor-id";
      let visitorId = localStorage.getItem(key);
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem(key, visitorId);
      }
      void fetch("/api/analytics/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    } catch { /* Analytics must not block storefront */ }
  }, [pathname]);
  return null;
}
