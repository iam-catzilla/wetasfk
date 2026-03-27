import type {
  UnifiedVideo,
  UnifiedSearchResponse,
  SortOrder,
  SearchParams,
  VideoSource,
} from "./types"
import {
  searchVideos as searchEporner,
  getVideoById as getEpornerVideo,
  formatViews,
  formatDuration,
  getKeywords,
} from "./eporner"
import { searchSxyprn, searchSxyprnQuery, getSxyprnVideo } from "./sxyprn"

export { formatViews, formatDuration, getKeywords }

// ─── Converters ──────────────────────────────────────────

function epornerToUnified(v: import("./types").EpornerVideo): UnifiedVideo {
  return {
    id: v.id,
    source: "eporner",
    title: v.title,
    keywords: v.keywords,
    views: v.views,
    rating: v.rate,
    url: v.url,
    added: v.added,
    durationSec: v.length_sec,
    durationStr: v.length_min,
    embedUrl: v.embed,
    thumb: v.default_thumb?.src || v.thumbs?.[0]?.src || "",
    thumbs: v.thumbs?.map((t) => t.src) || [],
    quality: v.default_thumb?.width >= 640 ? "HD" : undefined,
  }
}

/** Convert external host URLs to embeddable iframe URLs */
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    // lulustream.com/d/xxx or lulustream.com/xxx → lulustream.com/e/xxx
    if (u.hostname.includes("lulustream")) {
      const id = u.pathname.replace(/^\/[de]\//, "/").replace(/^\//, "")
      return `https://${u.hostname}/e/${id}`
    }
    // luluvdo.com — same pattern
    if (u.hostname.includes("luluvdo")) {
      const id = u.pathname.replace(/^\/[de]\//, "/").replace(/^\//, "")
      return `https://${u.hostname}/e/${id}`
    }
    // vidara.so/v/xxx → vidara.so/e/xxx
    if (u.hostname.includes("vidara")) {
      const id = u.pathname.replace(/^\/[ve]\//, "/").replace(/^\//, "")
      return `https://${u.hostname}/e/${id}`
    }
    // streamwish — /d/ or /e/ pattern
    if (u.hostname.includes("streamwish")) {
      const id = u.pathname.replace(/^\/[de]\//, "/").replace(/^\//, "")
      return `https://${u.hostname}/e/${id}`
    }
    // vidnest.io/xxx → vidnest.io/e/xxx
    if (u.hostname.includes("vidnest")) {
      const id = u.pathname.replace(/^\/[de]\//, "/").replace(/^\//, "")
      return `https://${u.hostname}/e/${id}`
    }
    // savefiles.com/xxx → savefiles.com/e/xxx
    if (u.hostname.includes("savefiles")) {
      const id = u.pathname.replace(/^\/[de]\//, "/").replace(/^\//, "")
      return `https://${u.hostname}/e/${id}`
    }
  } catch {
    // fall through
  }
  return url
}

function sxyprnToUnified(v: import("./types").SxyprnVideo): UnifiedVideo {
  // Use external embed links — CDN direct URLs are 403'd cross-origin
  let embedUrl = ""
  if (v.externalLinks.length > 0) {
    embedUrl = toEmbedUrl(v.externalLinks[0])
  } else if (v.cdnVideoPath) {
    const cdnFull = `https://sxyprn.com${v.cdnVideoPath}`
    embedUrl = `/api/sxyprn/stream?url=${encodeURIComponent(cdnFull)}`
  }

  return {
    id: `sxyprn-${v.id}`,
    source: "sxyporn",
    title: v.title,
    keywords: v.tags.join(", "),
    views: v.views,
    rating: "",
    url: `https://sxyprn.com/post/${v.id}.html`,
    added: v.added,
    durationSec: v.durationSec,
    durationStr: v.duration,
    embedUrl,
    thumb: v.thumb,
    thumbs: [v.thumb],
    quality: v.quality || undefined,
  }
}

// ─── Map sort orders ─────────────────────────────────────

function sortToSxyprnMode(
  order: SortOrder
): "trending" | "latest" | "top-viewed" | "top-rated" {
  switch (order) {
    case "latest":
      return "latest"
    case "most-popular":
    case "top-weekly":
    case "top-monthly":
      return "trending"
    case "top-rated":
      return "top-rated"
    default:
      return "trending"
  }
}

// ─── Unified search ──────────────────────────────────────

export async function unifiedSearch(
  params: SearchParams & { source?: VideoSource | "both" }
): Promise<UnifiedSearchResponse> {
  const source = params.source || "eporner"
  const page = params.page || 1
  const perPage = params.per_page || 36

  if (source === "eporner") {
    const data = await searchEporner(params)
    return {
      videos: data.videos.map(epornerToUnified),
      totalCount: data.total_count,
      totalPages: Math.min(data.total_pages, 100),
      page: data.page,
      perPage: data.per_page,
    }
  }

  if (source === "sxyporn") {
    const sxyprnPage = page - 1 // sxyprn is 0-indexed
    const data = params.query
      ? await searchSxyprnQuery(params.query, sxyprnPage)
      : await searchSxyprn(
          sxyprnPage,
          sortToSxyprnMode(params.order || "top-weekly")
        )

    return {
      videos: data.videos.map(sxyprnToUnified),
      totalCount: data.hasMore
        ? (page + 1) * perPage
        : page * data.videos.length,
      totalPages: data.hasMore ? page + 1 : page,
      page,
      perPage,
    }
  }

  // "both" — fetch from both in parallel, interleave results
  const [epornerResult, sxyprnResult] = await Promise.allSettled([
    searchEporner({ ...params, per_page: Math.ceil(perPage / 2) }),
    params.query
      ? searchSxyprnQuery(params.query, page - 1)
      : searchSxyprn(page - 1, sortToSxyprnMode(params.order || "top-weekly")),
  ])

  const eVideos =
    epornerResult.status === "fulfilled"
      ? epornerResult.value.videos.map(epornerToUnified)
      : []
  const sVideos =
    sxyprnResult.status === "fulfilled"
      ? sxyprnResult.value.videos.map(sxyprnToUnified)
      : []

  // Interleave: 2 eporner, 1 sxyprn
  const interleaved: UnifiedVideo[] = []
  let ei = 0,
    si = 0
  while (ei < eVideos.length || si < sVideos.length) {
    if (ei < eVideos.length) interleaved.push(eVideos[ei++])
    if (ei < eVideos.length) interleaved.push(eVideos[ei++])
    if (si < sVideos.length) interleaved.push(sVideos[si++])
  }

  const totalCount =
    epornerResult.status === "fulfilled"
      ? epornerResult.value.total_count
      : interleaved.length * 10

  return {
    videos: interleaved.slice(0, perPage),
    totalCount,
    totalPages: Math.min(
      epornerResult.status === "fulfilled"
        ? epornerResult.value.total_pages
        : 100,
      100
    ),
    page,
    perPage,
  }
}

// ─── Unified get video by ID ─────────────────────────────

export async function unifiedGetVideo(
  id: string
): Promise<UnifiedVideo | null> {
  // SxyPrn IDs are prefixed with "sxyprn-"
  if (id.startsWith("sxyprn-")) {
    const realId = id.replace("sxyprn-", "")
    const video = await getSxyprnVideo(realId)
    if (!video) return null
    return sxyprnToUnified(video)
  }

  // Otherwise it's an eporner ID
  const video = await getEpornerVideo(id)
  if (!video) return null
  return epornerToUnified(video)
}
