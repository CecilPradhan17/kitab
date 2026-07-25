import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// login/register are already excluded via robots: { index: false } in their
// own layouts, and profile pages are meant to be crawlable (see the sitemap
// decision below) - nothing here needs a blanket disallow.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
