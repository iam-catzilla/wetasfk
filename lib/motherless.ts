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
