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

function parseDurationHQ(text: string): { dur: string; sec: number } {
  // Formats: "23m 27s", "1h 05m 30s", "45s"
  const h = text.match(/(\d+)\s*h/)?.[1]
  const m = text.match(/(\d+)\s*m/)?.[1]
  const s = text.match(/(\d+)\s*s/)?.[1]
  const hours = parseInt(h || "0")
  const mins = parseInt(m || "0")
  const secs = parseInt(s || "0")
  const total = hours * 3600 + mins * 60 + secs
  const parts: string[] = []
  if (hours) parts.push(`${hours}`)
  parts.push(hours ? String(mins).padStart(2, "0") : `${mins}`)
  parts.push(String(secs).padStart(2, "0"))
  return { dur: parts.join(":"), sec: total }
}

// ─── Parse HQPorner list page ────────────────────────────

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // Each video is in a <section class="box feature"> block
  // Split by section boundaries
  const sections = html.split(/<section\s+class="box feature">/i).slice(1)

  for (const section of sections) {
    try {
      // Video link: /hdporn/{id}-{slug}.html
      const linkMatch = section.match(/href="(\/hdporn\/(\d+)-([^"]+)\.html)"/)
      if (!linkMatch) continue
      const url = linkMatch[1]
      const id = linkMatch[2]

      // Thumbnail from defaultImage call — proxy through /api/img to bypass ISP blocks
      const thumbMatch = section.match(/defaultImage\("([^"]+)"/)
      let thumb = thumbMatch ? thumbMatch[1] : ""
      if (thumb.startsWith("//")) thumb = `https:${thumb}`
      if (thumb) thumb = `/api/img?url=${encodeURIComponent(thumb)}`

      // Title from click-trigger link
      const titleMatch = section.match(/class="click-trigger"[^>]*>([^<]+)</)
      const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : ""
      if (!title) continue

      // Duration: <span class="icon fa-clock-o meta-data">23m 27s</span>
      const durMatch = section.match(/fa-clock-o\s+meta-data"?>([^<]+)</)
      let duration = ""
      let durationSec = 0
      if (durMatch) {
        const parsed = parseDurationHQ(durMatch[1].trim())
        duration = parsed.dur
        durationSec = parsed.sec
      }

      videos.push({
        id,
        title,
        thumb,
        duration,
        durationSec,
        views: 0,
        rating: "",
        quality: "HD",
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

// ─── Parse HQPorner video page ──────────────────────────

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    // Title
    const titleMatch =
      html.match(/<h1[^>]*class="[^"]*main-h1[^"]*"[^>]*>([^<]+)</)?.[1] ||
      html
        .match(/<title>([^<]+)<\/title>/)?.[1]
        ?.replace(/ - HQporner.*$/i, "") ||
      ""
    const title = decodeHtml(titleMatch.trim())

    // Embed iframe URL from videoWrapper
    const iframeMatch = html.match(
      /id="playerWrapper"[\s\S]*?<iframe[^>]*src="([^"]+)"/
    )
    let embedUrl = iframeMatch ? iframeMatch[1] : ""
    if (embedUrl.startsWith("//")) embedUrl = `https:${embedUrl}`

    // Thumbnail — proxy through /api/img to bypass ISP blocks
    const thumbMatch = html.match(/defaultImage\("([^"]+)"/)
    let thumb = thumbMatch ? thumbMatch[1] : ""
    if (thumb.startsWith("//")) thumb = `https:${thumb}`
    if (thumb) thumb = `/api/img?url=${encodeURIComponent(thumb)}`

    // Duration
    const durMatch = html.match(/fa-clock-o\s+meta-data"?>([^<]+)</)
    let duration = ""
    let durationSec = 0
    if (durMatch) {
      const parsed = parseDurationHQ(durMatch[1].trim())
      duration = parsed.dur
      durationSec = parsed.sec
    }

    // Tags/categories
    const tagMatches = html.matchAll(/href="\/category\/[^"]*"[^>]*>([^<]+)</g)
    const tags: string[] = []
    for (const m of tagMatches) tags.push(m[1].trim())

    // Actresses
    const actressMatches = html.matchAll(
      /href="\/actress\/[^"]*"[^>]*>([^<]+)</g
    )
    for (const m of actressMatches) tags.push(m[1].trim())

    return {
      id,
      title,
      thumb,
      duration,
      durationSec,
      views: 0,
      rating: "",
      quality: "HD",
      tags,
      url: `/hdporn/${id}`,
      embedUrl: `/api/hqporner/player/${id}`,
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
      return `https://${process.env.VERCEL_URL}/api/hqporner`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/hqporner`
  }
  return "/api/hqporner"
}

export async function searchHqporner(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`HQPorner proxy error: ${res.status}`)
  return res.json()
}

export async function browseHqporner(
  page = 1,
  mode: "new" | "top" | "top-week" | "top-month" = "new"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HQPorner proxy error: ${res.status}`)
  return res.json()
}

export async function getHqpornerVideo(
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
