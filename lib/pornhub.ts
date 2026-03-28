import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

// ─── PornHub Webmaster API types ─────────────────────────

interface PHThumb {
  size: string
  src: string
  width: string
  height: string
}

interface PHVideoRaw {
  url: string
  title: string
  duration: string
  views: number
  rating: string
  ratings: number
  thumbs: PHThumb[]
  markers?: { hd?: boolean; premium?: boolean; vr?: boolean }
  tags?: { tag_name: string }[]
  categories?: { category: string }[]
  pornstars?: { pornstar_name: string }[]
  publish_date?: string
  embed?: string
}

interface PHSearchResponse {
  videos: PHVideoRaw[]
}

interface PHVideoResponse {
  video: PHVideoRaw
}

// ─── Helpers ──────────────────────────────────────────────

function parseDurationToSec(dur: string): number {
  const parts = dur.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function viewkeyFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.searchParams.get("viewkey") || ""
  } catch {
    return ""
  }
}

function phVideoToScraped(v: PHVideoRaw): ScrapedVideo | null {
  const viewkey = viewkeyFromUrl(v.url)
  if (!viewkey) return null

  const tags = [
    ...(v.tags?.map((t) => t.tag_name) ?? []),
    ...(v.categories?.map((c) => c.category) ?? []),
    ...(v.pornstars?.map((p) => p.pornstar_name) ?? []),
  ]

  // Pick the best available thumbnail
  const thumb =
    v.thumbs?.find((t) => t.size === "medium")?.src ||
    v.thumbs?.find((t) => t.size === "small")?.src ||
    v.thumbs?.[0]?.src ||
    ""

  return {
    id: viewkey,
    title: v.title,
    thumb: thumb ? `/api/img?url=${encodeURIComponent(thumb)}` : "",
    duration: v.duration,
    durationSec: parseDurationToSec(v.duration),
    views: v.views || 0,
    rating: v.rating ? `${v.rating}%` : "",
    quality: v.markers?.hd ? "HD" : "",
    tags,
    url: v.url,
    embedUrl: v.embed || `https://www.pornhub.com/embed/${viewkey}`,
    added: v.publish_date?.split(" ")[0] || "",
  }
}

// ─── Direct server-side fetch via codetabs proxy ─────────
// PornHub blocks datacenter IPs; codetabs routes around this.

const PH_API = "https://www.pornhub.com/webmasters"
const PH_PROXY = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchPHApiDirect(
  endpoint: string,
  params: Record<string, string>
): Promise<string> {
  const qs = new URLSearchParams({ ...params, format: "json" }).toString()
  const target = `${PH_API}/${endpoint}?${qs}`
  const res = await fetch(`${PH_PROXY}${encodeURIComponent(target)}`, {
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`pornhub proxy error: ${res.status}`)
  return res.text()
}

function sortToPhOrdering(order?: string): string {
  switch (order) {
    case "top-rated":
      return "rating"
    case "latest":
      return "hottest"
    case "most-popular":
    case "top-weekly":
    case "top-monthly":
    default:
      return "mostviewed"
  }
}

function sortToPhPeriod(order?: string): string {
  switch (order) {
    case "top-monthly":
      return "monthly"
    case "top-weekly":
      return "weekly"
    default:
      return "alltime"
  }
}

export async function searchPornhubDirect(
  query: string,
  page = 1,
  order?: string
): Promise<ScrapedSearchResponse> {
  const ordering = sortToPhOrdering(order)
  const period = sortToPhPeriod(order)

  const endpoint = query ? "search" : "videos_by_rating"
  const params: Record<string, string> = {
    thumbsize: "medium",
    per_page: "36",
    page: String(page),
    ordering,
    period,
  }
  if (query) params.query = query

  const raw = await fetchPHApiDirect(endpoint, params)
  let data: PHSearchResponse
  try {
    data = JSON.parse(raw)
  } catch {
    return { videos: [], page, hasMore: false }
  }

  if (!Array.isArray(data?.videos)) return { videos: [], page, hasMore: false }

  const videos = data.videos
    .map(phVideoToScraped)
    .filter((v): v is ScrapedVideo => v !== null)

  return {
    videos,
    page,
    hasMore: data.videos.length >= 32,
  }
}

export async function getPornhubVideoDirect(
  viewkey: string
): Promise<ScrapedVideo | null> {
  try {
    const raw = await fetchPHApiDirect("video_by_id", {
      id: viewkey,
      thumbsize: "medium",
    })
    const data: PHVideoResponse = JSON.parse(raw)
    if (!data?.video) return null
    return phVideoToScraped(data.video)
  } catch {
    return null
  }
}

// ─── Client-side API callers (go through /api/pornhub proxy) ─────────────────

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/pornhub`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/pornhub`
  }
  return "/api/pornhub"
}

export async function searchPornhub(
  query: string,
  page = 1,
  order?: string
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const params = new URLSearchParams({ page: String(page) })
  if (query) params.set("q", query)
  if (order) params.set("order", order)
  const res = await fetch(`${base}/search?${params}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`pornhub proxy error: ${res.status}`)
  return res.json()
}

export async function getPornhubVideo(
  viewkey: string
): Promise<ScrapedVideo | null> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/video/${viewkey}`, {
    next: { revalidate: 600 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data
}
