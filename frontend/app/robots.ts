import type { MetadataRoute } from "next";

import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://" + SITE_CONFIG.domain;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/admin/",
        "/api/",
        "/cart",
        "/change-password",
        "/checkout",
        "/customer-login",
        "/forgot-password",
        "/labels/",
        "/login",
        "/reset-password",
        "/rf/",
        "/wms-context/",
      ],
    },
    sitemap: siteUrl + "/sitemap.xml",
    host: siteUrl,
  };
}
