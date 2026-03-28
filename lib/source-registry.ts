import type {
  UnifiedVideo,
  UnifiedSearchResponse,
  SortOrder,
  SearchParams,
  VideoSource,
  ScrapedVideo,
} from "./types"
import {
  searchVideos as searchEporner,
  getVideoById as getEpornerVideo,
} from "./eporner"
import { searchSxyprnQueryDirect, getSxyprnVideoDirect } from "./sxyprn"
import { browseXnxxDirect, searchXnxxDirect, getXnxxVideoDirect } from "./xnxx"
import {
  browseHqpornerDirect,
  searchHqpornerDirect,
  getHqpornerVideoDirect,
} from "./hqporner"
import {
  browseMotherlessDirect,
  searchMotherlessDirect,
  getMotherlessVideoDirect,
} from "./motherless"
import {
  browsePornhoarderDirect,
  searchPornhoarderDirect,
  getPornhoarderVideoDirect,
} from "./pornhoarder"
import {
  browse7mmtvDirect,
  search7mmtvDirect,
  get7mmtvVideoDirect,
} from "./sevenmm"
import {
  browseJavmostDirect,
  searchJavmostDirect,
  getJavmostVideoDirect,
} from "./javmost"
import { searchPornhubDirect, getPornhubVideoDirect } from "./pornhub"

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
    const hostPatterns = [
      "lulustream",
      "luluvdo",
      "vidara",
      "streamwish",
      "vidnest",
      "savefiles",
    ]
    for (const host of hostPatterns) {
      if (u.hostname.includes(host)) {
        const id = u.pathname.replace(/^\/[de]\//, "/").replace(/^\//, "")
        return `https://${u.hostname}/e/${id}`
      }
    }
  } catch {
    // fall through
  }
  return url
}

function sxyprnToUnified(v: import("./types").SxyprnVideo): UnifiedVideo {
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

function scrapedToUnified(v: ScrapedVideo, source: VideoSource): UnifiedVideo {
  return {
    id: `${source}-${v.id}`,
    source,
    title: v.title,
    keywords: v.tags.join(", "),
    views: v.views,
    rating: v.rating,
    url: v.url,
    added: v.added,
    durationSec: v.durationSec,
    durationStr: v.duration,
    embedUrl: v.embedUrl,
    thumb: v.thumb,
    thumbs: [v.thumb],
    quality: v.quality || undefined,
  }
}

// ─── Sort mapping ────────────────────────────────────────

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

// ─── Source registry ─────────────────────────────────────

interface SourceHandler {
  /** Prefix used in unified video IDs (e.g. "sxyprn-", "xnxx-") */
  idPrefix: string
  search: (params: SearchParams) => Promise<UnifiedSearchResponse>
  getVideo: (realId: string) => Promise<UnifiedVideo | null>
}

function scrapedResponse(
  videos: UnifiedVideo[],
  hasMore: boolean,
  page: number,
  perPage: number
): UnifiedSearchResponse {
  return {
    videos,
    totalCount: hasMore ? (page + 1) * perPage : page * videos.length,
    totalPages: hasMore ? page + 1 : page,
    page,
    perPage,
  }
}

export const SOURCE_HANDLERS: Record<VideoSource, SourceHandler> = {
  eporner: {
    idPrefix: "",
    search: async (params) => {
      const data = await searchEporner(params)
      return {
        videos: data.videos.map(epornerToUnified),
        totalCount: data.total_count,
        totalPages: Math.min(data.total_pages, 100),
        page: data.page,
        perPage: data.per_page,
      }
    },
    getVideo: async (id) => {
      const v = await getEpornerVideo(id)
      return v ? epornerToUnified(v) : null
    },
  },

  sxyporn: {
    idPrefix: "sxyprn-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const sxyprnPage = page - 1
      const data = await searchSxyprnQueryDirect(
        params.query || "",
        sxyprnPage,
        sortToSxyprnMode(params.order || "top-weekly")
      )
      return scrapedResponse(
        data.videos.map(sxyprnToUnified),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getSxyprnVideoDirect(id)
      return v ? sxyprnToUnified(v) : null
    },
  },

  xnxx: {
    idPrefix: "xnxx-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const xnxxPage = page - 1
      const data = params.query
        ? await searchXnxxDirect(params.query, xnxxPage)
        : await browseXnxxDirect(xnxxPage, "hits")
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "xnxx")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getXnxxVideoDirect(id)
      return v ? scrapedToUnified(v, "xnxx") : null
    },
  },

  hqporner: {
    idPrefix: "hqporner-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const data = params.query
        ? await searchHqpornerDirect(params.query, page)
        : await browseHqpornerDirect(page, "new")
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "hqporner")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getHqpornerVideoDirect(id)
      return v ? scrapedToUnified(v, "hqporner") : null
    },
  },

  motherless: {
    idPrefix: "motherless-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const data = params.query
        ? await searchMotherlessDirect(params.query, page)
        : await browseMotherlessDirect(page, "recent")
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "motherless")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getMotherlessVideoDirect(id)
      return v ? scrapedToUnified(v, "motherless") : null
    },
  },

  pornhoarder: {
    idPrefix: "pornhoarder-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const data = params.query
        ? await searchPornhoarderDirect(params.query, page)
        : await browsePornhoarderDirect(page)
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "pornhoarder")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getPornhoarderVideoDirect(id)
      return v ? scrapedToUnified(v, "pornhoarder") : null
    },
  },

  "7mmtv": {
    idPrefix: "7mmtv-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const data = params.query
        ? await search7mmtvDirect(params.query, page)
        : await browse7mmtvDirect(page, "censored")
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "7mmtv")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await get7mmtvVideoDirect(id)
      return v ? scrapedToUnified(v, "7mmtv") : null
    },
  },

  javmost: {
    idPrefix: "javmost-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const data = params.query
        ? await searchJavmostDirect(params.query, page)
        : await browseJavmostDirect(page, "new")
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "javmost")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getJavmostVideoDirect(id)
      return v ? scrapedToUnified(v, "javmost") : null
    },
  },

  pornhub: {
    idPrefix: "pornhub-",
    search: async (params) => {
      const page = params.page || 1
      const perPage = params.per_page || 36
      const data = await searchPornhubDirect(
        params.query || "",
        page,
        params.order
      )
      return scrapedResponse(
        data.videos.map((v) => scrapedToUnified(v, "pornhub")),
        data.hasMore,
        page,
        perPage
      )
    },
    getVideo: async (id) => {
      const v = await getPornhubVideoDirect(id)
      return v ? scrapedToUnified(v, "pornhub") : null
    },
  },
}

/** Detect source from a unified video ID and return the handler + real ID */
export function resolveHandler(
  id: string
): { handler: SourceHandler; realId: string; source: VideoSource } | null {
  for (const [source, handler] of Object.entries(SOURCE_HANDLERS)) {
    if (handler.idPrefix && id.startsWith(handler.idPrefix)) {
      return {
        handler,
        realId: id.slice(handler.idPrefix.length),
        source: source as VideoSource,
      }
    }
  }
  // Default: eporner (no prefix)
  return {
    handler: SOURCE_HANDLERS.eporner,
    realId: id,
    source: "eporner",
  }
}
