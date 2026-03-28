import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
}

function parseDurationToSec(dur: string): number {
  const parts = dur.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function parseViewsML(text: string): number {
  const match = text.match(/([\d,]+)/)
  if (!match) return 0
  return parseInt(match[1].replace(/,/g, ""), 10) || 0
}

// ─── Parse Motherless list page ─────────────────────────

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []
  const entries = html.split(/class="thumb-container video"/).slice(1)

  for (const entry of entries) {
    try {
      // Video ID from data-codename
      const idMatch = entry.match(/data-codename="([A-Z0-9]+)"/)
      if (!idMatch) continue
      const id = idMatch[1]

      // Only process videos
      const mediaType = entry.match(/data-mediatype="([^"]+)"/)
      if (mediaType && mediaType[1] !== "video") continue

      // Thumbnail - use the static image, not the placeholder
      const thumbMatch = entry.match(/class="static"\s+src="([^"]+)"/)
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Duration from span.size
      const durMatch = entry.match(/<span class="size">([^<]+)</)
      const duration = durMatch ? durMatch[1].trim() : ""
      const durationSec = parseDurationToSec(duration)

      // Title from caption title link (title attr may come before or after class)
      const titleMatch =
        entry.match(
          /title="([^"]+)"[^>]*class="caption title[^"]*"[^>]*>([^<]*)</
        ) ||
        entry.match(
          /class="caption title[^"]*"[^>]*title="([^"]+)"[^>]*>([^<]*)</
        )
      const title = titleMatch
        ? decodeHtml(titleMatch[1] || titleMatch[2]).trim()
        : ""
      if (!title) continue

      // Views from .hits span > .value
      const viewsMatch = entry.match(
        /class="hits"[\s\S]*?class="value">([^<]*)</
      )
      const views = viewsMatch ? parseViewsML(viewsMatch[1]) : 0

      videos.push({
        id,
        title,
        thumb,
        duration,
        durationSec,
        views,
        rating: "",
        quality: "",
        tags: [],
        url: `https://motherless.com/${id}`,
        embedUrl: `/api/motherless/player/${id}`,
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

// ─── Parse Motherless video page ────────────────────────

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    // Title
    const titleMatch =
      html.match(/<h1[^>]*>([^<]+)</)?.[1] ||
      html
        .match(/<title>([^<]+)<\/title>/)?.[1]
        ?.replace(/ - Motherless.*$/i, "") ||
      ""
    const title = decodeHtml(titleMatch.trim())

    // Thumbnail from data-poster
    const posterMatch = html.match(/data-poster="([^"]+)"/)
    const thumb = posterMatch ? posterMatch[1] : ""

    // Direct MP4 source URLs (signed, time-limited)
    const sourceMatches = html.matchAll(
      /<source\s+src="([^"]+)"[^>]*res="([^"]+)"/g
    )
    const sources: { url: string; res: string }[] = []
    for (const m of sourceMatches) {
      sources.push({ url: m[1], res: m[2] })
    }

    // __fileurl for highest quality
    const fileUrlMatch = html.match(/__fileurl\s*=\s*'([^']+)'/)

    const embedUrl = `/api/motherless/player/${id}`

    // Duration from video player or meta
    const durMatch = html.match(/data-duration="(\d+)"/)
    let durationSec = durMatch ? parseInt(durMatch[1]) : 0
    if (!durationSec) {
      // Try parsing from page text
      const durText = html.match(/(\d+:\d{2}(?::\d{2})?)/)?.[1]
      if (durText) durationSec = parseDurationToSec(durText)
    }
    const mins = Math.floor(durationSec / 60)
    const secs = durationSec % 60
    const durationStr = `${mins}:${String(secs).padStart(2, "0")}`

    // Views
    const viewsMatch = html.match(/([\d,]+)\s*views/i)
    const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, ""), 10) : 0

    // Tags
    const tagMatches = html.matchAll(/class="tag-button[^"]*"[^>]*>([^<]+)</g)
    const tags: string[] = []
    for (const m of tagMatches) tags.push(m[1].trim())

    // Upload date
    const dateMatch = html.match(/class="submitted"[^>]*>([^<]*\d{4}[^<]*)</)
    const added = dateMatch ? dateMatch[1].trim() : ""

    return {
      id,
      title,
      thumb,
      duration: durationStr,
      durationSec,
      views,
      rating: "",
      quality: sources.some((s) => s.res === "720p") ? "HD" : "",
      tags,
      url: `https://motherless.com/${id}`,
      embedUrl,
      added,
    }
  } catch {
    return null
  }
}

// ─── API client ─────────────────────────────────────────

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/motherless`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/motherless`
  }
  return "/api/motherless"
}

export async function searchMotherless(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`Motherless proxy error: ${res.status}`)
  return res.json()
}

export async function browseMotherless(
  page = 1,
  mode: "recent" | "favorited" | "viewed" | "popular" = "recent"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Motherless proxy error: ${res.status}`)
  return res.json()
}

export async function getMotherlessVideo(
  id: string
): Promise<ScrapedVideo | null> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/video/${id}`, {
    next: { revalidate: 600 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data
}

// ─── Direct server-side fetch (bypasses self-referential HTTP on Vercel) ──────
// Server-side has no CORS restrictions — fetch the site directly.

async function fetchMLDirect(path: string): Promise<string> {
  const res = await fetch(`https://motherless.com${path}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`motherless fetch error: ${res.status}`)
  return res.text()
}

export async function searchMotherlessDirect(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const html = await fetchMLDirect(
    `/search/videos?term=${encodeURIComponent(query)}&sort=date&page=${page}`
  )
  const videos = parseListPage(html)
  const hasMore =
    html.includes("next_page") ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function browseMotherlessDirect(
  page = 1,
  mode: "recent" | "popular" | "viewed" | "favorited" = "recent"
): Promise<ScrapedSearchResponse> {
  let mlPath: string
  switch (mode) {
    case "favorited":
      mlPath =
        page <= 1 ? "/videos/favorited" : `/videos/favorited?page=${page}`
      break
    case "viewed":
      mlPath = page <= 1 ? "/videos/viewed" : `/videos/viewed?page=${page}`
      break
    case "popular":
      mlPath = page <= 1 ? "/videos/popular" : `/videos/popular?page=${page}`
      break
    default:
      mlPath = page <= 1 ? "/videos/recent" : `/videos/recent?page=${page}`
      break
  }
  const html = await fetchMLDirect(mlPath)
  const videos = parseListPage(html)
  const hasMore =
    html.includes("next_page") ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function getMotherlessVideoDirect(
  id: string
): Promise<ScrapedVideo | null> {
  try {
    const html = await fetchMLDirect(`/${id}`)
    return parseVideoPage(html, id)
  } catch {
    return null
  }
}
