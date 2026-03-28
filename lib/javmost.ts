import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
}

// ─── Parse JavMost AJAX response HTML ────────────────────

export function parseListHtml(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // Unescape JSON string if needed
  const clean = html
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")

  // Each video card: <div class="col-md-4 col-sm-6">...<a href="https://www.javmost.ws/{CODE}/"...
  const cards = clean.split(/class="[^"]*\bcol-md-4\b[^"]*"/).slice(1)

  for (const card of cards) {
    try {
      // URL: href="https://www.javmost.ws/{CODE}/"
      const linkMatch = card.match(
        /href="https?:\/\/(?:www\.)?javmost\.ws\/([^/"]+)\//
      )
      if (!linkMatch) continue

      const code = linkMatch[1]
      if (!code || code === "page" || code === "search" || code === "category")
        continue

      // Thumbnail: data-src="https://img3.javmost.ws/images/{CODE}.webp"
      const thumbMatch = card.match(
        /data-src="(https?:\/\/img\d*\.javmost\.ws\/images\/[^"]+)"/
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Title: from <h1 class="card-title">{CODE}</h1> or alt attribute
      const titleMatch =
        card.match(/class="card-title[^"]*"[^>]*>([^<]+)</) ||
        card.match(/alt="([^"]+)"/)
      const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : code

      const url = `https://www.javmost.ws/${code}/`

      videos.push({
        id: code,
        title,
        thumb,
        duration: "",
        durationSec: 0,
        views: 0,
        rating: "",
        quality: "",
        tags: [],
        url,
        embedUrl: "", // resolved from video page
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

// ─── Parse JavMost video page ────────────────────────────

export function parseVideoPage(
  html: string,
  code: string
): ScrapedVideo | null {
  try {
    // Title
    const titleMatch =
      html
        .match(/<title>([^<]+)<\/title>/)?.[1]
        ?.replace(/\s*[-–|]\s*(?:JavMost|Watch Free).*/i, "") || code
    const title = decodeHtml(titleMatch.trim())

    // Thumbnail
    const thumbMatch = html.match(
      /data-src="(https?:\/\/img\d*\.javmost\.ws\/images\/[^"]+)"/
    )
    const thumb = thumbMatch ? thumbMatch[1] : ""

    // Tags/categories from the page
    const tags: string[] = []
    for (const m of html.matchAll(
      /href="https?:\/\/(?:www\.)?javmost\.ws\/category\/([^/"]+)\//g
    )) {
      tags.push(decodeURIComponent(m[1].replace(/-/g, " ")))
    }

    // Actresses/stars
    for (const m of html.matchAll(
      /href="https?:\/\/(?:www\.)?javmost\.ws\/pornstar\/([^/"]+)\//g
    )) {
      const name = decodeURIComponent(m[1].replace(/-/g, " "))
      if (name !== "all") tags.push(name)
    }

    // Look for iframe embeds (video player)
    let embedUrl = ""
    const iframeMatch = html.match(/<iframe[^>]+src="(https?:\/\/[^"]+)"/i)
    if (iframeMatch) {
      embedUrl = iframeMatch[1]
    }

    // If no iframe, look for player JavaScript with stream URLs
    if (!embedUrl) {
      // JavMost uses data-link or player setup
      const dataLink = html.match(/data-link="([^"]+)"/)
      if (dataLink) {
        embedUrl = dataLink[1]
        if (embedUrl.startsWith("//")) embedUrl = `https:${embedUrl}`
      }
    }

    // Fallback to player proxy
    if (!embedUrl) {
      embedUrl = `/api/javmost/player/${encodeURIComponent(code)}`
    }

    return {
      id: code,
      title,
      thumb,
      duration: "",
      durationSec: 0,
      views: 0,
      rating: "",
      quality: "",
      tags,
      url: `https://www.javmost.ws/${code}/`,
      embedUrl,
      added: "",
    }
  } catch {
    return null
  }
}

// ─── API client ─────────────────────────────────────────

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/javmost`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/javmost`
  }
  return "/api/javmost"
}

export async function searchJavmost(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`JavMost proxy error: ${res.status}`)
  return res.json()
}

export async function browseJavmost(
  page = 1,
  mode: "new" | "censor" | "uncensor" = "new"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`JavMost proxy error: ${res.status}`)
  return res.json()
}

export async function getJavmostVideo(
  code: string
): Promise<ScrapedVideo | null> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/video/${encodeURIComponent(code)}`, {
    next: { revalidate: 600 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data
}
