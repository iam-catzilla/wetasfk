import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

const MISSAV_BASE = "https://missav.ws"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchMissAV(path: string): Promise<string> {
  const target = `${MISSAV_BASE}${path}`
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

// ─── Parse MissAV list page ───────────────────────────────

function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // MissAV video cards — split by <div with class containing "group" or "thumbnail"
  // MissAV typically uses Tailwind CSS: class="group ..."
  const chunks = html
    .split(
      /<(?:div|article)[^>]*class="[^"]*(?:thumbnail|group|video-item|item)[^"]*"/
    )
    .slice(1)

  for (const chunk of chunks.slice(0, 60)) {
    try {
      // URL: /en/{code} or /{code}
      const linkMatch =
        chunk.match(/href="https?:\/\/missav\.ws\/en\/([^/"]+)"/) ||
        chunk.match(/href="\/en\/([^/"]+)"/) ||
        chunk.match(/href="https?:\/\/missav\.ws\/([^/"]+)"/) ||
        chunk.match(/href="\/([^/"]+)"/)
      if (!linkMatch) continue

      const code = linkMatch[1]
      // Basic sanity check — JAV codes look like ABC-123 or start with a letter
      if (!/[A-Za-z]/.test(code) || code.includes("?") || code.length < 3) {
        continue
      }

      // Title
      const titleMatch =
        chunk.match(/alt="([^"]{5,})"/) ||
        chunk.match(/title="([^"]{5,})"/) ||
        chunk.match(/<h\d[^>]*>([^<]+)</) ||
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : code.toUpperCase()

      // Thumbnail
      const thumbMatch = chunk.match(
        /(?:data-src|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Duration
      const durMatch = chunk.match(
        /(?:class="[^"]*duration[^"]*"[^>]*>|<time[^>]*>)([^<]+)</
      )
      const duration = durMatch ? durMatch[1].trim() : ""

      // Views
      const viewMatch = chunk.match(/([\d,.]+)\s*(?:views?|再生)/i)
      const viewStr = viewMatch ? viewMatch[1].replace(/,/g, "") : "0"
      const views = parseInt(viewStr) || 0

      if (!code || !title) continue

      videos.push({
        id: code,
        title,
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views,
        rating: "",
        quality: "",
        tags: [],
        url: `${MISSAV_BASE}/en/${code}`,
        embedUrl: `/api/missav/player/${code}`,
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

// ─── Parse MissAV video page ──────────────────────────────

export function parseVideoPage(
  html: string,
  code: string
): ScrapedVideo | null {
  try {
    const titleMatch =
      html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
      html.match(/property="og:title"[^>]*content="([^"]+)"/) ||
      html.match(/<title>([^<|]+)/)
    const title = titleMatch
      ? decodeHtml(titleMatch[1].trim())
      : code.toUpperCase()

    const thumbMatch =
      html.match(/property="og:image"[^>]*content="([^"]+)"/) ||
      html.match(/name="thumbnail"[^>]*content="([^"]+)"/)
    const thumb = thumbMatch ? thumbMatch[1] : ""

    const durMatch =
      html.match(
        /(?:class="[^"]*duration[^"]*"|itemprop="duration")[^>]*>([^<]+)</
      ) || html.match(/"duration":\s*"([^"]+)"/)
    const duration = durMatch ? durMatch[1].trim() : ""

    // Tags / genres
    const tagMatches = html.matchAll(
      /class="[^"]*(?:tag|genre|label)[^"]*"[^>]*href="[^"]*"[^>]*>([^<]+)</g
    )
    const tags: string[] = []
    for (const m of tagMatches) tags.push(m[1].trim())

    return {
      id: code,
      title,
      thumb,
      duration,
      durationSec: parseDurationToSec(duration),
      views: 0,
      rating: "",
      quality: "",
      tags,
      url: `${MISSAV_BASE}/en/${code}`,
      embedUrl: `/api/missav/player/${code}`,
      added: "",
    }
  } catch {
    return null
  }
}

// ─── Extract m3u8 URL from MissAV video page ─────────────

export function extractM3u8(html: string): string {
  // MissAV typically serves m3u8 from surrit.com CDN.
  // Patterns found in the wild:
  //   source = "https://surrit.com/HASH/playlist.m3u8"
  //   file: "https://....m3u8"
  //   <source src="https://...m3u8">

  const patterns = [
    /source\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
    /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
    /<source[^>]+src=["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
    /["'](https?:\/\/surrit\.com\/[^"']+\.m3u8[^"']*)["']/i,
    /["'](https?:\/\/[^"'\s]+\/playlist\.m3u8[^"']*)["']/i,
    // Also catch evaluation-encrypted blobs where URL is present in decoded form
    /["'](https?:\/\/[^"'\s]{20,}\.m3u8)["']/i,
  ]

  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1]
  }
  return ""
}

// ─── API clients ──────────────────────────────────────────

function getProxyBase(): string {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export async function browseMissav(
  page = 1,
  mode: "popular" | "latest" | "new" = "new"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBase()
  const res = await fetch(`${base}/api/missav/search?mode=${mode}&page=${page}`)
  if (!res.ok) throw new Error(`MissAV browse error: ${res.status}`)
  return res.json()
}

export async function searchMissav(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBase()
  const res = await fetch(
    `${base}/api/missav/search?q=${encodeURIComponent(query)}&page=${page}`
  )
  if (!res.ok) throw new Error(`MissAV search error: ${res.status}`)
  return res.json()
}

export async function getMissavVideo(
  code: string
): Promise<ScrapedVideo | null> {
  const base = getProxyBase()
  const res = await fetch(`${base}/api/missav/video/${code}`)
  if (!res.ok) return null
  return res.json()
}

// ─── Direct scrapers (used by the proxy route) ───────────

export async function scrapeMissavList(
  path: string
): Promise<ScrapedSearchResponse> {
  const html = await fetchMissAV(path)
  const videos = parseListPage(html)
  return { videos, hasMore: videos.length >= 20, page: 1 }
}

export async function scrapeMissavVideo(
  code: string
): Promise<ScrapedVideo | null> {
  const html = await fetchMissAV(`/en/${code}`)
  return parseVideoPage(html, code)
}

export async function scrapeMissavM3u8(code: string): Promise<string> {
  const html = await fetchMissAV(`/en/${code}`)
  return extractM3u8(html)
}
