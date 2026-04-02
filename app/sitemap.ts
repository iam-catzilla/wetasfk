import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wetasfk.com"

// Commonly searched adult content categories / tags for deep-link SEO
const POPULAR_TAGS = [
  "amateur",
  "milf",
  "teen",
  "lesbian",
  "anal",
  "blowjob",
  "creampie",
  "hardcore",
  "big-tits",
  "asian",
  "latina",
  "ebony",
  "redhead",
  "brunette",
  "blonde",
  "threesome",
  "solo",
  "pov",
  "outdoor",
  "orgy",
  "gangbang",
  "squirting",
  "hentai",
  "jav",
  "cosplay",
  "massage",
  "casting",
  "bdsm",
  "feet",
  "handjob",
]

// Popular model search queries
const MODEL_SEARCHES = ["popular", "trending", "new", "featured"]

function url(
  path: string,
  options: {
    priority?: number
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]
    lastModified?: Date
  } = {}
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path}`,
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency ?? "daily",
    priority: options.priority ?? 0.7,
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    url("/", { priority: 1.0, changeFrequency: "always" }),
    url("/trending", { priority: 0.95, changeFrequency: "hourly" }),
    url("/search", { priority: 0.8, changeFrequency: "daily" }),
    url("/posts/popular", { priority: 0.85, changeFrequency: "hourly" }),
    url("/posts/recent", { priority: 0.85, changeFrequency: "always" }),
    url("/posts/random", { priority: 0.6, changeFrequency: "always" }),
    url("/posts/tags", { priority: 0.75, changeFrequency: "weekly" }),
    url("/models/recent", { priority: 0.8, changeFrequency: "daily" }),
    url("/models/random", { priority: 0.6, changeFrequency: "daily" }),
    url("/models/search", { priority: 0.7, changeFrequency: "daily" }),
  ]

  // Tag pages – high-intent search landing pages
  const tagPages: MetadataRoute.Sitemap = POPULAR_TAGS.map((tag) =>
    url(`/posts/tags?tag=${tag}`, {
      priority: 0.75,
      changeFrequency: "daily",
      lastModified: now,
    })
  )

  // Trending with order variants
  const trendingVariants: MetadataRoute.Sitemap = [
    url("/trending?order=top-weekly", {
      priority: 0.9,
      changeFrequency: "hourly",
    }),
    url("/trending?order=most-popular", {
      priority: 0.85,
      changeFrequency: "daily",
    }),
    url("/trending?order=newest", { priority: 0.8, changeFrequency: "hourly" }),
  ]

  // Model search pages
  const modelPages: MetadataRoute.Sitemap = MODEL_SEARCHES.map((q) =>
    url(`/models/search?q=${q}`, {
      priority: 0.65,
      changeFrequency: "daily",
      lastModified: now,
    })
  )

  return [...staticPages, ...trendingVariants, ...tagPages, ...modelPages]
}
