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

// ─── Parse PornHoarder list page ────────────────────────

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // Split by video article blocks
  const entries = html.split(/<article[\s>]/).slice(1)

  for (const entry of entries) {
    try {
      // Video link: /pornvideo/{slug}/{base64Id}
      const linkMatch = entry.match(
        /href="(\/pornvideo\/([^/]+)\/([^"]+))"[^>]*class="video-link"/
      )
      if (!linkMatch) continue
      const url = linkMatch[1]
      const slug = linkMatch[2]
      const encodedId = linkMatch[3]
      // Store full slug~encodedId so we can reconstruct the URL later
      const id = `${slug}~${encodedId}`

      // Title from video-link title attribute or slug
      const titleMatch =
        entry.match(/class="video-link"[^>]*title="([^"]*)"/) ||
        entry.match(/title="([^"]*)"[^>]*class="video-link"/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : slug.replace(/-/g, " ")

      // Thumbnail from b-lazy data-src
      const thumbMatch = entry.match(
        /class="video-image primary b-lazy"\s*data-src="([^"]+)"/
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Duration from video-length
      const durMatch = entry.match(/class="video-length"[^>]*>([^<]+)</)
      const duration = durMatch ? durMatch[1].trim() : ""
      const durationSec = parseDurationToSec(duration)

      // Quality badge
      const qualityMatch = entry.match(
        /class="video-badge[^"]*"[^>]*>([^<]*(?:HD|4K|1080|720)[^<]*)</
      )
      const quality = qualityMatch ? qualityMatch[1].trim() : ""

      if (!slug) continue

      videos.push({
        id,
        title: title || slug.replace(/-/g, " "),
        thumb,
        duration,
        durationSec,
        views: 0,
        rating: "",
        quality,
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

// ─── Parse PornHoarder video page ───────────────────────

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    // Title — try multiple patterns, skip whitespace-only matches
    let title = ""
    // Try h1 tags — skip ones with only whitespace or child tags
    const h1Matches = html.matchAll(/<h1[^>]*>([^<]+)</g)
    for (const m of h1Matches) {
      const t = m[1].trim()
      if (t && !t.match(/^porn\s*hoarder$/i)) {
        title = decodeHtml(t)
        break
      }
    }
    // Fallback to <title>
    if (!title) {
      const tMatch = html.match(/<title>([^<]+)<\/title>/)
      if (tMatch) {
        title = decodeHtml(
          tMatch[1].replace(/\s*[-|]\s*PornHoarder.*$/i, "").trim()
        )
      }
    }

    // Always use the player proxy — direct iframe src extraction is unreliable
    // and the proxy handles Referer/CORS issues on the embed host
    const embedUrl = `/api/pornhoarder/player/${id}`

    // Thumbnail
    const thumbMatch = html.match(
      /class="video-image[^"]*"\s*(?:data-src|src)="([^"]+)"/
    )
    const thumb = thumbMatch ? thumbMatch[1] : ""

    // Duration
    const durMatch = html.match(/class="video-length"[^>]*>([^<]+)</)
    const duration = durMatch ? durMatch[1].trim() : ""
    const durationSec = parseDurationToSec(duration)

    // Tags
    const tagMatches = html.matchAll(
      /class="tag[^"]*"[^>]*href="\/tag\/[^"]*"[^>]*>([^<]+)</g
    )
    const tags: string[] = []
    for (const m of tagMatches) tags.push(m[1].trim())

    return {
      id,
      title,
      thumb,
      duration,
      durationSec,
      views: 0,
      rating: "",
      quality: "",
      tags,
      url: "",
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
      return `https://${process.env.VERCEL_URL}/api/pornhoarder`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/pornhoarder`
  }
  return "/api/pornhoarder"
}

export async function searchPornhoarder(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`PornHoarder proxy error: ${res.status}`)
  return res.json()
}

export async function browsePornhoarder(
  page = 1,
  mode: "new" | "top" | "popular" = "new"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`PornHoarder proxy error: ${res.status}`)
  return res.json()
}

export async function getPornhoarderVideo(
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
