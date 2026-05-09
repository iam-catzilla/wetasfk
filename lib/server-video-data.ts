import "server-only"

import { cache } from "react"
import { unstable_cache } from "next/cache"
import type {
  SearchParams,
  UnifiedSearchResponse,
  UnifiedVideo,
  VideoSource,
} from "./types"
import { SOURCE_HANDLERS, resolveHandler } from "./source-registry"

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function videoSignature(video: UnifiedVideo): string {
  const normalizedUrl = video.url.replace(/^https?:\/\//, "")

  return [
    normalizeTitle(video.title),
    video.durationSec || video.durationStr,
    normalizedUrl,
  ].join("|")
}

function dedupeVideos(videos: UnifiedVideo[]): UnifiedVideo[] {
  const seen = new Set<string>()
  const deduped: UnifiedVideo[] = []

  for (const video of videos) {
    const signature = videoSignature(video)
    if (seen.has(signature)) {
      continue
    }

    seen.add(signature)
    deduped.push(video)
  }

  return deduped
}

const cachedSourceSearch = unstable_cache(
  async (source: VideoSource, params: SearchParams) => {
    return SOURCE_HANDLERS[source].search(params)
  },
  ["source-search"],
  { revalidate: 300 }
)

const cachedSourceVideo = unstable_cache(
  async (source: VideoSource, realId: string) => {
    return SOURCE_HANDLERS[source].getVideo(realId)
  },
  ["source-video"],
  { revalidate: 600 }
)

function emptyResponse(page: number, perPage: number): UnifiedSearchResponse {
  return {
    videos: [],
    totalCount: 0,
    totalPages: 0,
    page,
    perPage,
  }
}

export const unifiedSearch = cache(
  async (
    params: SearchParams & { sources?: VideoSource[] }
  ): Promise<UnifiedSearchResponse> => {
    const page = params.page || 1
    const perPage = params.per_page || 36
    const allSources = params.sources?.length
      ? params.sources
      : (["eporner"] as VideoSource[])

    const sources = [...new Set(allSources)].filter((source) => {
      return source in SOURCE_HANDLERS
    })

    if (!sources.length) {
      return emptyResponse(page, perPage)
    }

    if (sources.length === 1) {
      try {
        const response = await cachedSourceSearch(sources[0], params)
        const videos = dedupeVideos(response.videos)
        return {
          ...response,
          videos,
          totalCount: Math.max(response.totalCount, videos.length),
        }
      } catch {
        return emptyResponse(page, perPage)
      }
    }

    const perSource = Math.max(Math.ceil(perPage / sources.length), 6)
    const settled = await Promise.allSettled(
      sources.map((source) =>
        cachedSourceSearch(source, { ...params, per_page: perSource })
      )
    )

    const buckets = settled.map((result) => {
      if (result.status !== "fulfilled") {
        return [] as UnifiedVideo[]
      }

      return dedupeVideos(result.value.videos)
    })

    const interleaved: UnifiedVideo[] = []
    const seen = new Set<string>()
    const indices = buckets.map(() => 0)
    let added = true

    while (added && interleaved.length < perPage) {
      added = false

      for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex++) {
        const bucket = buckets[bucketIndex]

        while (indices[bucketIndex] < bucket.length) {
          const video = bucket[indices[bucketIndex]++]
          const signature = videoSignature(video)

          if (seen.has(signature)) {
            continue
          }

          seen.add(signature)
          interleaved.push(video)
          added = true
          break
        }

        if (interleaved.length >= perPage) {
          break
        }
      }
    }

    const firstFulfilled = settled.find(
      (result) => result.status === "fulfilled"
    )
    const estimate =
      firstFulfilled?.status === "fulfilled" ? firstFulfilled.value : null

    return {
      videos: interleaved,
      totalCount: estimate
        ? Math.max(estimate.totalCount * sources.length, interleaved.length)
        : interleaved.length,
      totalPages: estimate ? Math.min(estimate.totalPages, 100) : 1,
      page,
      perPage,
    }
  }
)

export const unifiedGetVideo = cache(
  async (id: string): Promise<UnifiedVideo | null> => {
    const resolved = resolveHandler(id)
    if (!resolved) {
      return null
    }

    const cachedVideo = await cachedSourceVideo(
      resolved.source,
      resolved.realId
    )
    if (cachedVideo) {
      return cachedVideo
    }

    return resolved.handler.getVideo(resolved.realId)
  }
)
