import { SITE_CONFIG } from "@/modules/site/constants/site.constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = `https://${SITE_CONFIG.domain}`;

  const urls = [
    {
      loc: siteUrl,
      changefreq: "weekly",
      priority: "1.0",
    },
    {
      loc: `${siteUrl}/products`,
      changefreq: "daily",
      priority: "0.9",
    },
    {
      loc: `${siteUrl}/about`,
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: `${siteUrl}/contact`,
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: `${siteUrl}/legal/kvkk`,
      changefreq: "yearly",
      priority: "0.2",
    },
    {
      loc: `${siteUrl}/legal/privacy`,
      changefreq: "yearly",
      priority: "0.2",
    },
    {
      loc: `${siteUrl}/legal/b2b-sales`,
      changefreq: "yearly",
      priority: "0.2",
    },
    {
      loc: `${siteUrl}/legal/delivery-returns`,
      changefreq: "yearly",
      priority: "0.2",
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}