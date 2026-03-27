export interface EpornerVideo {
  id: string
  title: string
  keywords: string
  views: number
  rate: string
  url: string
  added: string
  length_sec: number
  length_min: string
  embed: string
  default_thumb: EpornerThumb
  thumbs: EpornerThumb[]
}

export interface EpornerThumb {
  size: string
  width: number
  height: number
  src: string
}

export interface EpornerSearchResponse {
  count: number
  start: number
  per_page: number
  page: number
  time_ms: number
  total_count: number
  total_pages: number
  videos: EpornerVideo[]
}

export type SortOrder =
  | "latest"
  | "longest"
  | "shortest"
  | "top-rated"
  | "most-popular"
  | "top-weekly"
  | "top-monthly"

export interface SearchParams {
  query?: string
  page?: number
  per_page?: number
  order?: SortOrder
  thumbsize?: "small" | "medium" | "big"
  gay?: 0 | 1 | 2
  lq?: 0 | 1 | 2
}

export interface FavoriteItem {
  id: string
  title: string
  thumb: string
  duration: string
  addedAt: number
}

export interface WatchHistoryItem {
  id: string
  title: string
  thumb: string
  duration: string
  watchedAt: number
}

// ─── Unified video model ─────────────────────────────────
export type VideoSource = "eporner" | "sxyporn"

export interface UnifiedVideo {
  id: string
  source: VideoSource
  title: string
  keywords: string
  views: number
  rating: string
  url: string
  added: string
  durationSec: number
  durationStr: string
  /** iframe embed URL (eporner) or direct .vid CDN url (sxyprn) */
  embedUrl: string
  thumb: string
  thumbs: string[]
  /** extra: resolution label like "HD" */
  quality?: string
}

export interface UnifiedSearchResponse {
  videos: UnifiedVideo[]
  totalCount: number
  totalPages: number
  page: number
  perPage: number
}

// ─── SxyPrn specific ────────────────────────────────────
export interface SxyprnVideo {
  id: string
  title: string
  thumb: string
  previewVideo: string
  duration: string
  durationSec: number
  views: number
  quality: string
  tags: string[]
  stars: string[]
  postUrl: string
  cdnVideoPath: string
  externalLinks: string[]
  added: string
}

export interface SxyprnSearchResponse {
  videos: SxyprnVideo[]
  page: number
  hasMore: boolean
}
