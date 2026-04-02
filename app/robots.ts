import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wetasfk.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/trending",
          "/search",
          "/posts/",
          "/models/",
          "/watch/",
          "/user/",
          "/post/",
        ],
        disallow: [
          "/api/",
          "/favorites",
          "/history",
          "/library",
          "/feed",
          "/originals",
          "/*?*sources=",
        ],
      },
      // Block AI scrapers / content harvesters that don't drive traffic
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "CCBot",
          "anthropic-ai",
          "ClaudeBot",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
