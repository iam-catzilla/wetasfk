import "server-only"

import { request as httpsRequest } from "node:https"
import { cache } from "react"
import type { UnifiedVideo, VideoSource } from "./types"
import { unifiedSearch } from "./server-video-data"
import { browseHqpornerActressDirect } from "./hqporner"
import {
  matchesPerformerName,
  normalizePerformerName,
  performerSlug,
} from "./performers"

export interface PerformerExternalLink {
  label: string
  url: string
}

export interface PerformerFact {
  label: string
  value: string
}

export interface PerformerProfile {
  name: string
  slug: string
  description?: string
  image?: string
  bannerImage?: string
  galleryImages: string[]
  stats: PerformerFact[]
  details: PerformerFact[]
  featuredIn: string[]
  externalLinks: PerformerExternalLink[]
}

const PERFORMER_SEARCH_SOURCES: VideoSource[] = [
  "sxyporn",
  "xnxx",
  "hqporner",
  "porntrex",
  "redtube",
  "motherless",
  "pornhoarder",
  "javmost",
]

const PROFILE_STAT_LABELS = new Set(["Model Rank", "Views", "Subscribers"])

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function proxyImage(url?: string): string | undefined {
  if (!url) {
    return undefined
  }

  const normalized = decodeHtml(url).replace(/\\/g, "/").trim()
  const absolute = normalized.startsWith("//")
    ? `https:${normalized}`
    : normalized

  return absolute ? `/api/img?url=${encodeURIComponent(absolute)}` : undefined
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function parseInfoStats(html: string): PerformerFact[] {
  return [
    ...html.matchAll(
      /<li class="info-stat">[\s\S]*?<p class="info-stat-label">([^<]+)<\/p>[\s\S]*?<p class="info-stat-data">([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi
    ),
  ]
    .map((match) => ({
      label: stripHtml(match[1]),
      value: stripHtml(match[2]),
    }))
    .filter((fact) => fact.label && fact.value)
}

async function requestText(
  url: string,
  headers: Record<string, string>,
  redirectsLeft = 5
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const req = httpsRequest(url, { headers }, (res) => {
      let body = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => {
        body += chunk
      })
      res.on("end", () => {
        const status = res.statusCode || 0
        const location = res.headers.location

        if (location && status >= 300 && status < 400 && redirectsLeft > 0) {
          requestText(
            new URL(location, url).toString(),
            headers,
            redirectsLeft - 1
          ).then(resolve)
          return
        }

        if (status < 200 || status >= 300) {
          resolve(null)
          return
        }

        resolve(body)
      })
    })

    req.on("error", () => resolve(null))
    req.end()
  })
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return null
    }

    return res.text()
  } catch {
    return null
  }
}

async function fetchPorntrexProfile(
  name: string
): Promise<Partial<PerformerProfile>> {
  const slug = performerSlug(name)
  const html = await fetchPage(`https://www.porntrex.com/models/${slug}/`)

  if (!html) {
    return {}
  }

  const text = stripHtml(html)
  const upperName = normalizePerformerName(name).toUpperCase()
  const videosMarker = `${upperName}'S NEW VIDEOS`
  const bioStart = text.indexOf("Fire up your jerking hand")
  const bioEnd = text.indexOf(videosMarker)
  const description =
    bioStart >= 0 && bioEnd > bioStart
      ? text.slice(bioStart, bioEnd).trim()
      : undefined

  const imageMatch = html.match(
    /(?:src|data-src)="(\/\/ptx\.cdntrex\.com\/contents\/models\/[^"]+)"/i
  )

  return {
    description,
    image: imageMatch ? proxyImage(`https:${imageMatch[1]}`) : undefined,
  }
}

async function fetchHqpornerProfile(
  name: string
): Promise<Partial<PerformerProfile>> {
  const slug = performerSlug(name)
  const html = await fetchPage(`https://hqporner.com/actress/${slug}`)

  if (!html) {
    return {}
  }

  const description = decodeHtml(
    html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || ""
  ).trim()
  const totalVideos = description.match(
    /We have\s+(\d+)\s+high quality porn videos/i
  )?.[1]

  const galleryImages = [
    ...html.matchAll(/<img id="cover_\d+" src="([^"]+)"/gi),
  ]
    .map((match) => proxyImage(match[1]))
    .filter((image): image is string => Boolean(image))
    .slice(0, 8)

  const stats = totalVideos
    ? [{ label: "HQPorner Videos", value: totalVideos }]
    : []

  return {
    description: description || undefined,
    image: galleryImages[0],
    galleryImages: dedupeStrings(galleryImages),
    stats,
  }
}

async function fetchRedtubeProfile(
  name: string
): Promise<Partial<PerformerProfile>> {
  const slug = encodeURIComponent(name).replace(/%20/g, "+")
  const html = await requestText(`https://www.redtube.net/pornstar/${slug}`, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: "showAgeDisclaimer=1; platform=pc; recommendations=1",
    Referer: "https://www.redtube.net/",
    Connection: "keep-alive",
  })

  if (!html || !/class="name-title"/i.test(html)) {
    return {}
  }

  const stats = parseInfoStats(html)
  const summaryStats = stats.filter((fact) =>
    PROFILE_STAT_LABELS.has(fact.label)
  )
  const details = stats.filter((fact) => !PROFILE_STAT_LABELS.has(fact.label))
  const totalVideos = html.match(/Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i)?.[1]

  if (totalVideos) {
    summaryStats.push({ label: "Videos", value: totalVideos })
  }

  const featuredIn = [
    ...html.matchAll(/class="known-for-text"[^>]*>([^<]+)</gi),
  ]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)

  const galleryImages: string[] = []
  const entries = html
    .split(/<div class="video_block_wrapper[^\"]*"/i)
    .slice(1, 9)
  for (const entry of entries) {
    const thumbMatch =
      entry.match(/data-o_thumb="([^"]+)"/i) ||
      entry.match(/data-src="([^"]+)"/i)

    const proxied = proxyImage(thumbMatch?.[1])
    if (proxied) {
      galleryImages.push(proxied)
    }
  }

  return {
    image: proxyImage(
      html.match(
        /class="lazy avatar-image[^"]*"[^>]*(?:data-src|src)="([^"]+)"/i
      )?.[1]
    ),
    bannerImage: proxyImage(
      html.match(
        /class="lazy banner-image[^"]*"[^>]*(?:data-src|src)="([^"]+)"/i
      )?.[1]
    ),
    galleryImages: dedupeStrings(galleryImages),
    stats: summaryStats,
    details,
    featuredIn: dedupeStrings(featuredIn),
  }
}

async function fetchHqpornerPerformerVideos(
  name: string
): Promise<UnifiedVideo[]> {
  try {
    const slug = performerSlug(name)
    const result = await browseHqpornerActressDirect(slug)
    const normalizedName = normalizePerformerName(name)

    return result.videos
      .filter((video) => {
        const titleMatch = normalizePerformerName(video.title)
          .toLowerCase()
          .includes(normalizedName.toLowerCase())
        const performerMatch = (video.performers || []).some((performer) => {
          return matchesPerformerName(performer, normalizedName)
        })

        return titleMatch || performerMatch
      })
      .map((video) => ({
        id: `hqporner-${video.id}`,
        source: "hqporner",
        title: video.title,
        keywords: video.tags.join(", "),
        performers:
          video.performers && video.performers.length > 0
            ? video.performers
            : [name],
        views: video.views,
        rating: video.rating,
        url: video.url,
        added: video.added,
        durationSec: video.durationSec,
        durationStr: video.duration,
        embedUrl: video.embedUrl,
        downloadUrl: video.downloadUrl,
        thumb: video.thumb,
        thumbs: [video.thumb],
        quality: video.quality || undefined,
      }))
  } catch {
    return []
  }
}

function mergeVideos(...videoLists: UnifiedVideo[][]): UnifiedVideo[] {
  const seen = new Set<string>()
  const merged: UnifiedVideo[] = []

  for (const videos of videoLists) {
    for (const video of videos) {
      const key = `${video.source}:${video.id}`
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      merged.push(video)
    }
  }

  return merged
}

function buildExternalLinks(name: string): PerformerExternalLink[] {
  const slug = performerSlug(name)
  return [
    {
      label: "Porntrex",
      url: `https://www.porntrex.com/models/${slug}/`,
    },
    {
      label: "HQPorner",
      url: `https://hqporner.com/actress/${slug}`,
    },
    {
      label: "RedTube",
      url: `https://www.redtube.net/pornstar/${encodeURIComponent(name).replace(/%20/g, "+")}`,
    },
  ]
}

export const getPerformerProfile = cache(
  async (name: string): Promise<PerformerProfile> => {
    const normalizedName = normalizePerformerName(name)
    const [porntrex, redtube, hqporner] = await Promise.all([
      fetchPorntrexProfile(normalizedName),
      fetchRedtubeProfile(normalizedName),
      fetchHqpornerProfile(normalizedName),
    ])

    const galleryImages = dedupeStrings([
      hqporner.image || "",
      redtube.image || "",
      ...(redtube.galleryImages || []),
      porntrex.image || "",
      ...(hqporner.galleryImages || []),
    ])

    const stats = dedupeStrings(
      [...(redtube.stats || []), ...(hqporner.stats || [])].map(
        (fact) => `${fact.label}::${fact.value}`
      )
    ).map((entry) => {
      const [label, value] = entry.split("::")
      return { label, value }
    })

    return {
      name: normalizedName,
      slug: performerSlug(normalizedName),
      description: porntrex.description || hqporner.description,
      image: hqporner.image || redtube.image || porntrex.image,
      bannerImage: redtube.bannerImage,
      galleryImages,
      stats,
      details: redtube.details || [],
      featuredIn: redtube.featuredIn || [],
      externalLinks: buildExternalLinks(normalizedName),
    }
  }
)

export const getPerformerVideos = cache(
  async (name: string): Promise<UnifiedVideo[]> => {
    const normalizedName = normalizePerformerName(name)
    const result = await unifiedSearch({
      query: normalizedName,
      order: "most-popular",
      per_page: 72,
      sources: PERFORMER_SEARCH_SOURCES,
    })

    const matchedSearchVideos = result.videos.filter((video) => {
      return video.performers.some((performer) => {
        return matchesPerformerName(performer, normalizedName)
      })
    })

    const hqVideos = await fetchHqpornerPerformerVideos(normalizedName)
    return mergeVideos(matchedSearchVideos, hqVideos)
  }
)

export function summarizePerformerSources(videos: UnifiedVideo[]): string[] {
  return [...new Set(videos.map((video) => video.source))]
}

/**
 * Lightweight image-only fetch for a performer. Tries HQPorner actress page
 * first (single fast request), but validates the result against the performer
 * name before returning it to avoid wrong-person covers. Falls back to
 * RedTube avatar when HQPorner returns nothing usable.
 */
export const getPerformerImage = cache(
  async (name: string): Promise<string | null> => {
    const normalized = normalizePerformerName(name)
    const slug = performerSlug(normalized)

    // 1. Try HQPorner actress page
    const hqHtml = await fetchPage(`https://hqporner.com/actress/${slug}`)
    if (hqHtml) {
      // Accept the cover only when the page title/h1 contains the performer name
      const titleText = (
        hqHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
        hqHtml.match(/<title>([^<]+)<\/title>/i)?.[1] ||
        ""
      ).toLowerCase()
      const nameLower = normalized.toLowerCase()
      const nameWords = nameLower.split(/\s+/)
      const nameMatches = nameWords.every((word) => titleText.includes(word))
      if (nameMatches) {
        const match =
          hqHtml.match(/<img\s+id="cover_1"\s+src="([^"]+)"/i) ??
          hqHtml.match(/<img\s+id="cover_\d+"\s+src="([^"]+)"/i)
        if (match?.[1]) return proxyImage(match[1]) ?? null
      }
    }

    // 2. Fallback: RedTube pornstar avatar
    const rtSlug = encodeURIComponent(normalized).replace(/%20/g, "+")
    const rtHtml = await requestText(
      `https://www.redtube.net/pornstar/${rtSlug}`,
      {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "showAgeDisclaimer=1; platform=pc; recommendations=1",
        Referer: "https://www.redtube.net/",
        Connection: "keep-alive",
      }
    )
    if (rtHtml && /class="name-title"/i.test(rtHtml)) {
      const avatarUrl = rtHtml.match(
        /class="lazy avatar-image[^"]*"[^>]*(?:data-src|src)="([^"]+)"/i
      )?.[1]
      if (avatarUrl) return proxyImage(avatarUrl) ?? null
    }

    return null
  }
)
