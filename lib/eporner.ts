import type { EpornerSearchResponse, EpornerVideo, SearchParams } from "./types"

const EPORNER_API_DIRECT = "https://www.eporner.com/api/v2"

async function fetchEpornerDirect(
  path: string,
  query: string
): Promise<Response> {
  const target = `${EPORNER_API_DIRECT}/${path}${query ? `?${query}` : ""}`
  return fetch(target, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  })
}

export async function searchVideos(
  params: SearchParams = {}
): Promise<EpornerSearchResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set("query", params.query || "all")
  searchParams.set("per_page", String(params.per_page || 36))
  searchParams.set("page", String(params.page || 1))
  searchParams.set("order", params.order || "top-weekly")
  searchParams.set("thumbsize", params.thumbsize || "big")
  searchParams.set("gay", String(params.gay ?? 0))
  searchParams.set("lq", String(params.lq ?? 0))
  searchParams.set("format", "json")

  const res = await fetchEpornerDirect("video/search/", searchParams.toString())

  if (!res.ok) {
    throw new Error(`Eporner API error: ${res.status}`)
  }

  return res.json()
}

export async function getVideoById(id: string): Promise<EpornerVideo | null> {
  const searchParams = new URLSearchParams()
  searchParams.set("id", id)
  searchParams.set("thumbsize", "big")
  searchParams.set("format", "json")

  const res = await fetchEpornerDirect("video/id/", searchParams.toString())

  if (!res.ok) {
    return null
  }

  const data = await res.json()
  if (Array.isArray(data) && data.length === 0) {
    return null
  }

  return data
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`
  return String(views)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export function getKeywords(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 12)
}
