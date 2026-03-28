import type {
  UnifiedVideo,
  UnifiedSearchResponse,
  SearchParams,
  VideoSource,
} from "./types"
import { formatViews, formatDuration, getKeywords } from "./eporner"
import { SOURCE_HANDLERS, resolveHandler } from "./source-registry"

export { formatViews, formatDuration, getKeywords }

// ─── Unified search ──────────────────────────────────────

export async function unifiedSearch(
  params: SearchParams & { sources?: VideoSource[] }
): Promise<UnifiedSearchResponse> {
  const sources = params.sources?.length
    ? params.sources
    : ["eporner" as VideoSource]
  const page = params.page || 1
  const perPage = params.per_page || 36

  // Single source — direct passthrough
  if (sources.length === 1) {
    return SOURCE_HANDLERS[sources[0]].search(params)
  }

  // Multiple sources — fetch in parallel, interleave results evenly
  const perSource = Math.max(Math.ceil(perPage / sources.length), 6)
  const results = await Promise.allSettled(
    sources.map((src) =>
      SOURCE_HANDLERS[src].search({ ...params, per_page: perSource })
    )
  )

  const buckets: UnifiedVideo[][] = results.map((r) =>
    r.status === "fulfilled" ? r.value.videos : []
  )

  // Round-robin interleave from each bucket
  const interleaved: UnifiedVideo[] = []
  const indices = buckets.map(() => 0)
  let added = true
  while (added && interleaved.length < perPage) {
    added = false
    for (let b = 0; b < buckets.length; b++) {
      if (indices[b] < buckets[b].length && interleaved.length < perPage) {
        interleaved.push(buckets[b][indices[b]++])
        added = true
      }
    }
  }

  // Estimate totals from the first fulfilled result
  const firstFulfilled = results.find((r) => r.status === "fulfilled")
  const est =
    firstFulfilled?.status === "fulfilled" ? firstFulfilled.value : null

  return {
    videos: interleaved,
    totalCount: est ? est.totalCount * sources.length : interleaved.length * 10,
    totalPages: est ? Math.min(est.totalPages, 100) : 100,
    page,
    perPage,
  }
}

// ─── Unified get video by ID ─────────────────────────────

export async function unifiedGetVideo(
  id: string
): Promise<UnifiedVideo | null> {
  const resolved = resolveHandler(id)
  if (!resolved) return null
  return resolved.handler.getVideo(resolved.realId)
}
