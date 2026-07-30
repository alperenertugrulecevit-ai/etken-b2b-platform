"use client";

import { usePathname } from "next/navigation";

import PublicFooter from "@/components/layout/PublicFooter";

const INTERNAL_ROUTE_PREFIXES = [
  "/admin",
  "/rf",
  "/login",
  "/access-denied",
  "/labels",
  "/change-password",
  "/wms-context",
];

export default function RouteAwareFooter() {
  const pathname = usePathname();

  const isInternalRoute =
    INTERNAL_ROUTE_PREFIXES.some(
      (prefix) =>
        pathname === prefix ||
        pathname.startsWith(
          `${prefix}/`,
        ),
    );

  if (isInternalRoute) {
    return null;
  }

  return <PublicFooter />;
}
