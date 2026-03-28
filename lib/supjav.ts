import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

const SUPJAV_BASE = "https://supjav.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchSupJAV(path: string): Promise<string> {
  const target = `${SUPJAV_BASE}${path}`
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

// ─── Parse SupJAV list page ──────────────────────────────

function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // SupJAV video cards — split on article/div with class containing "post" or "video"
  const chunks = html
    .split(
      /<(?:article|div)[^>]*class="[^"]*(?:post|video-item|item)[^"]*"[^>]*>/
    )
    .slice(1)

  for (const chunk of chunks.slice(0, 60)) {
    try {
      // URL: /{numeric-id}.html or /{code}.html
      const linkMatch =
        chunk.match(/href="https?:\/\/supjav\.com\/(\d+)\.html"/) ||
        chunk.match(/href="\/(\d+)\.html"/) ||
        chunk.match(/href="https?:\/\/supjav\.com\/([^/"]+)\.html"/) ||
        chunk.match(/href="\/([^/"]+)\.html"/)

      if (!linkMatch) continue
      const id = linkMatch[1]

      // Title
      const titleMatch =
        chunk.match(/<h\d[^>]*>([^<]+)<\/h\d>/) ||
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/title="([^"]+)"/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : id.replace(/-/g, " ").toUpperCase()

      // Thumbnail
      const thumbMatch = chunk.match(
        /(?:data-src|data-original|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Duration
      const durMatch =
        chunk.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})(?:\s*<|\s*$)/)
      const duration = durMatch ? durMatch[1].trim() : ""

      if (!id) continue

      videos.push({
        id,
        title: title || id,
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views: 0,
        rating: "",
        quality: chunk.includes("HD") || chunk.includes("1080") ? "HD" : "",
        tags: [],
        url: `${SUPJAV_BASE}/${id}.html`,
        embedUrl: `/api/supjav/player/${id}`,
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

// ─── Parse SupJAV video page ──────────────────────────────

function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    const titleMatch =
      html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/<title>([^<|–-]+)/)
    const title = titleMatch
      ? decodeHtml(titleMatch[1].trim())
      : id.toUpperCase()

    const thumbMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/)
    const thumb = thumbMatch ? thumbMatch[1] : ""

    const durMatch =
      html.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)</) ||
      html.match(/Duration[:\s]+([0-9:]+)/)
    const duration = durMatch ? durMatch[1].trim() : ""

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
      views: 0,
      rating: "",
      quality: "",
      tags,
      url: `${SUPJAV_BASE}/${id}.html`,
      embedUrl: `/api/supjav/player/${id}`,
      added: "",
    }
  } catch {
    return null
  }
}

// ─── API clients ──────────────────────────────────────────

function getProxyBase(): string {
  if (typeof window !== "undefined") return ""
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export async function browseSupjav(
  page = 1,
  mode: "popular" | "latest" | "new" = "new"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBase()
  const res = await fetch(`${base}/api/supjav/search?mode=${mode}&page=${page}`)
  if (!res.ok) throw new Error(`SupJAV browse error: ${res.status}`)
  return res.json()
}

export async function searchSupjav(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBase()
  const res = await fetch(
    `${base}/api/supjav/search?q=${encodeURIComponent(query)}&page=${page}`
  )
  if (!res.ok) throw new Error(`SupJAV search error: ${res.status}`)
  return res.json()
}

export async function getSupjavVideo(id: string): Promise<ScrapedVideo | null> {
  const base = getProxyBase()
  const res = await fetch(`${base}/api/supjav/video/${id}`)
  if (!res.ok) return null
  return res.json()
}

// ─── Direct scrapers (used by the proxy route) ───────────

export async function scrapeSupjavList(
  path: string
): Promise<ScrapedSearchResponse> {
  const html = await fetchSupJAV(path)
  const videos = parseListPage(html)
  return { videos, hasMore: videos.length >= 20, page: 1 }
}

export async function scrapeSupjavVideo(
  id: string
): Promise<ScrapedVideo | null> {
  const html = await fetchSupJAV(`/${id}.html`)
  return parseVideoPage(html, id)
}
