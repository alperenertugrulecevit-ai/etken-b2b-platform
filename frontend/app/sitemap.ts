import type { MetadataRoute } from "next";

import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = "https://" + SITE_CONFIG.domain;
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: siteUrl + "/products",
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: siteUrl + "/about",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: siteUrl + "/contact",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: siteUrl + "/legal/kvkk",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: siteUrl + "/legal/privacy",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: siteUrl + "/legal/b2b-sales",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: siteUrl + "/legal/delivery-returns",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
