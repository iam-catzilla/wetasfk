import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

const VJAV_BASE = "https://vjav.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchVJAV(path: string): Promise<string> {
  const target = `${VJAV_BASE}${path}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`)
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.text()
}

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

// ─── Parse VJAV list page ─────────────────────────────────

function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // VJAV video cards — split on <article or on video-item divs
  const chunks = html
    .split(
      /<(?:article|div)[^>]*class="[^"]*(?:video-box|item|video-item)[^"]*"/
    )
    .slice(1)

  for (const chunk of chunks.slice(0, 60)) {
    try {
      // URL: /videos/{id}/{slug}/
      const linkMatch =
        chunk.match(/href="\/videos\/(\d+)\/([^/"]+)\/"/) ||
        chunk.match(/href="(\/videos\/(\d+)\/[^"]+)"/)

      if (!linkMatch) continue
      const id = linkMatch[1]
      const slug = linkMatch[2] ?? ""

      // Title
      const titleMatch =
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/title="([^"]+)"/) ||
        chunk.match(/<a[^>]*href="\/videos\/\d+[^"]*"[^>]*>([^<]{5,})<\/a>/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : decodeHtml(slug.replace(/-/g, " "))

      // Thumbnail
      const thumbMatch = chunk.match(
        /(?:data-src|data-original|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Duration
      const durMatch =
        chunk.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/class="[^"]*time[^"]*"[^>]*>([^<]+)</)
      const duration = durMatch ? durMatch[1].trim() : ""

      // Views
      const viewMatch = chunk.match(
        /class="[^"]*(?:views?|count|view-count)[^"]*"[^>]*>([\d,.KkMm]+)/
      )
      const viewStr = viewMatch
        ? viewMatch[1]
            .replace(/,/g, "")
            .replace(/[Kk]$/, "000")
            .replace(/[Mm]$/, "000000")
        : "0"
      const views = parseInt(viewStr) || 0

      if (!id || !title) continue

      videos.push({
        id,
        title: title || decodeHtml(slug.replace(/-/g, " ")),
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views,
        rating: "",
        quality: chunk.includes("HD") ? "HD" : "",
        tags: [],
        url: `/videos/${id}/${slug}/`,
        embedUrl: `/api/vjav/player/${id}`,
        added: "",
      })
    } catch {
      // skip malformed entries
    }
  }

  return videos
}

// ─── Parse VJAV video page ────────────────────────────────

function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    const titleMatch =
      html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/<title>([^<|]+)/)
    const title = titleMatch
      ? decodeHtml(titleMatch[1].trim())
      : "Unknown Title"

    const thumbMatch = html.match(
      /(?:property="og:image"|name="thumbnail")[^>]*content="([^"]+)"/
    )
    const thumb = thumbMatch ? thumbMatch[1] : ""

    const durMatch =
      html.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)</) ||
      html.match(/Duration[:\s]+([0-9:]+)/)
    const duration = durMatch ? durMatch[1].trim() : ""

    const viewMatch = html.match(/class="[^"]*views?[^"]*"[^>]*>([\d,KkMm]+)/)
    const viewStr = viewMatch
      ? viewMatch[1]
          .replace(/,/g, "")
          .replace(/[Kk]$/, "000")
          .replace(/[Mm]$/, "000000")
      : "0"
    const views = parseInt(viewStr) || 0

    const tagMatches = html.matchAll(
      /class="[^"]*tag[^"]*"[^>]*href="[^"]*"[^>]*>([^<]+)</g
    )
    const tags: string[] = []
    for (const m of tagMatches) tags.push(m[1].trim())

    return {
      id,
      title,
      thumb,
      duration,
      durationSec: parseDurationToSec(duration),
      views,
      rating: "",
      quality: "",
      tags,
      url: `https://vjav.com/videos/${id}/`,
      embedUrl: `/api/vjav/player/${id}`,
      added: "",
    }
  } catch {
    return null
  }
}

// ─── API clients (server-side only) ──────────────────────

function getProxyBase(): string {
  if (typeof window !== "undefined") {
    return ""
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export async function browseVjav(
  page = 1,
  mode: "popular" | "latest" | "new" = "latest"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBase()
  const path = mode === "popular" ? "/most-popular/" : "/latest-updates/"
  const url = `${base}/api/vjav/search?mode=${mode}&page=${page}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`VJAV browse error: ${res.status}`)
  return res.json()
}

export async function searchVjav(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBase()
  const res = await fetch(
    `${base}/api/vjav/search?q=${encodeURIComponent(query)}&page=${page}`
  )
  if (!res.ok) throw new Error(`VJAV search error: ${res.status}`)
  return res.json()
}

export async function getVjavVideo(id: string): Promise<ScrapedVideo | null> {
  const base = getProxyBase()
  const res = await fetch(`${base}/api/vjav/video/${id}`)
  if (!res.ok) return null
  return res.json()
}

// ─── Direct scrapers (used by the proxy route) ───────────

export async function scrapeVjavList(
  path: string
): Promise<ScrapedSearchResponse> {
  const html = await fetchVJAV(path)
  const videos = parseListPage(html)
  const hasMore = videos.length >= 20
  return { videos, hasMore, page: 1 }
}

export async function scrapeVjavVideo(
  id: string
): Promise<ScrapedVideo | null> {
  // Find the canonical slug for this ID — try /videos/{id}/ which may redirect
  const html = await fetchVJAV(`/videos/${id}/`)
  return parseVideoPage(html, id)
}
