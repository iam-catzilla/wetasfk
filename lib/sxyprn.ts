import type { SxyprnVideo, SxyprnSearchResponse } from "./types"

const SXYPRN_BASE = "https://sxyprn.com"

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/sxyprn`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/sxyprn`
  }
  return "/api/sxyprn"
}

// ─── HTML Parsing helpers ────────────────────────────────

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

function parseViewsStr(text: string): number {
  const match = text.match(/([\d,]+)\s*views/i)
  if (!match) return 0
  return parseInt(match[1].replace(/,/g, ""), 10) || 0
}

// ─── Parse list page HTML into video entries ─────────────

export function parseListPage(html: string): SxyprnVideo[] {
  const videos: SxyprnVideo[] = []

  // Split by post entries
  const entries = html.split("class='post_el_small'").slice(1)

  for (const entry of entries) {
    try {
      // Post ID from data-postid
      const postIdMatch = entry.match(/data-postid=['"]([a-f0-9]+)['"]/)
      if (!postIdMatch) continue
      const id = postIdMatch[1]

      // Thumbnail from data-src on lazyload img
      const thumbMatch = entry.match(/data-src=['"]([^'"]+)['"]/)
      const thumb = thumbMatch
        ? thumbMatch[1].startsWith("//")
          ? `https:${thumbMatch[1]}`
          : thumbMatch[1]
        : ""

      // Preview video
      const previewMatch = entry.match(
        /class='hvp_player'[^>]*src=['"]([^'"]+)['"]/
      )
      const previewVideo = previewMatch
        ? previewMatch[1].startsWith("//")
          ? `https:${previewMatch[1]}`
          : previewMatch[1]
        : ""

      // Duration — title attr contains '>' (e.g. title='s6->c10'), so don't use [^>]*
      const durationMatch = entry.match(
        /class='duration_small'[^<]*?(\d{1,3}:\d{2}(?::\d{2})?)/
      )
      const duration = durationMatch ? durationMatch[1].trim() : ""

      // Quality (HD badge)
      const qualityMatch = entry.match(/class='shd_small'[^>]*>([^<]+)</)
      const quality = qualityMatch ? qualityMatch[1].trim() : ""

      // Title from post_text — extract meaningful text
      const textBlock = entry.match(/class='post_text'[^>]*>([\s\S]*?)<\/div>/)
      let title = ""
      if (textBlock) {
        // Remove HTML tags, keep text
        title = decodeHtml(
          textBlock[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .replace(/#\w+/g, "")
            .trim()
        )
        // Remove "New" prefix
        title = title.replace(/^\s*New\s+/i, "").trim()
      }
      if (!title) continue

      // Tags from hash_link
      const tagMatches = entry.matchAll(
        /class="hash_link[^"]*"[^>]*label="([^"]+)"/g
      )
      const tags: string[] = []
      for (const m of tagMatches) tags.push(m[1])

      // Stars from ps_link
      const starMatches = entry.matchAll(
        /class='ps_link[^']*'[^>]*data-subkey='([^']+)'/g
      )
      const stars: string[] = []
      for (const m of starMatches) stars.push(m[1])

      // Views from post_control_time
      const viewsMatch = entry.match(/post_control_time[^>]*>[\s\S]*?<\/div>/)
      const views = viewsMatch ? parseViewsStr(viewsMatch[0]) : 0

      // Time added
      const timeMatch = entry.match(
        /post_control_time[^>]*>\s*<span>([^<]+)<\/span>/
      )
      const added = timeMatch ? timeMatch[1].trim() : ""

      // External links
      const extMatches = entry.matchAll(
        /href='(https?:\/\/(?:luluvdo|vidara|lulustream|streamwish|myvidplay|vidnest|savefiles)[^']+)'/g
      )
      const externalLinks: string[] = []
      for (const m of extMatches) {
        if (!externalLinks.includes(m[1])) externalLinks.push(m[1])
      }

      videos.push({
        id,
        title,
        thumb,
        previewVideo,
        duration,
        durationSec: parseDurationToSec(duration),
        views,
        quality,
        tags,
        stars,
        postUrl: `/post/${id}.html`,
        cdnVideoPath: "",
        externalLinks,
        added,
      })
    } catch {
      // skip malformed entries
    }
  }

  return videos
}

// ─── Parse single video page ─────────────────────────────

export function parseVideoPage(html: string, id: string): SxyprnVideo | null {
  try {
    // data-vnfo for CDN video path
    const vnfoMatch = html.match(/data-vnfo\s*=\s*'([^']+)'/)?.[1]
    let cdnVideoPath = ""
    if (vnfoMatch) {
      try {
        const parsed = JSON.parse(vnfoMatch.replace(/&quot;/g, '"'))
        cdnVideoPath = parsed[id] || Object.values(parsed)[0] || ""
      } catch {
        // vnfo not valid JSON
      }
    }

    // Schema.org meta data
    const titleMeta =
      html.match(/itemprop="name"\s+content="([^"]+)"/)?.[1] || ""
    const thumbMeta =
      html.match(/itemprop="thumbnailUrl"\s+content="([^"]+)"/)?.[1] || ""
    const durationMeta =
      html.match(/itemprop="duration"\s+content="PT([^"]+)"/)?.[1] || ""
    const uploadDate =
      html.match(/itemprop="uploadDate"\s+content="([^"]+)"/)?.[1] || ""

    // Parse ISO 8601 duration (PT33M48S)
    let durationSec = 0
    const dH = durationMeta.match(/(\d+)H/)
    const dM = durationMeta.match(/(\d+)M/)
    const dS = durationMeta.match(/(\d+)S/)
    if (dH) durationSec += parseInt(dH[1]) * 3600
    if (dM) durationSec += parseInt(dM[1]) * 60
    if (dS) durationSec += parseInt(dS[1])

    // Duration string from video info
    const durationStr = html.match(/duration:<b>([^<]+)<\/b>/)?.[1] || ""

    // Quality/resolution
    const quality = html.match(/resolution:<b>([^<]+)<\/b>/)?.[1] || ""

    // Views
    const viewsMatch = html.match(/post_control_time[^>]*>[\s\S]*?<\/div>/)
    const views = viewsMatch ? parseViewsStr(viewsMatch[0]) : 0

    // Tags
    const tagMatches = html.matchAll(
      /class="hash_link[^"]*"[^>]*label="([^"]+)"/g
    )
    const tags: string[] = []
    for (const m of tagMatches) tags.push(m[1])

    // Stars
    const starMatches = html.matchAll(
      /class='ps_link[^']*'[^>]*data-subkey='([^']+)'/g
    )
    const stars: string[] = []
    for (const m of starMatches) stars.push(m[1])

    // External video links
    const extMatches = html.matchAll(
      /href=['"](https?:\/\/(?:luluvdo|vidara|lulustream|streamwish|myvidplay|vidnest|savefiles)[^\s"'<>]+)/g
    )
    const externalLinks: string[] = []
    for (const m of extMatches) {
      if (!externalLinks.includes(m[1])) externalLinks.push(m[1])
    }

    const title = decodeHtml(titleMeta).replace(/#\w+/g, "").trim()
    const thumb = thumbMeta.startsWith("//") ? `https:${thumbMeta}` : thumbMeta

    return {
      id,
      title,
      thumb,
      previewVideo: "",
      duration: durationStr,
      durationSec,
      views,
      quality,
      tags,
      stars,
      postUrl: `/post/${id}.html`,
      cdnVideoPath,
      externalLinks,
      added: uploadDate,
    }
  } catch {
    return null
  }
}

// ─── API client (goes through local proxy) ────────────────

export async function searchSxyprn(
  page = 0,
  mode: "trending" | "latest" | "top-viewed" | "top-rated" = "trending"
): Promise<SxyprnSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`SxyPrn proxy error: ${res.status}`)
  return res.json()
}

export async function searchSxyprnQuery(
  query: string,
  page = 0
): Promise<SxyprnSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`SxyPrn proxy error: ${res.status}`)
  return res.json()
}

export async function getSxyprnVideo(id: string): Promise<SxyprnVideo | null> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/video/${id}`, {
    next: { revalidate: 600 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data
}

// ─── Direct server-side fetch (bypasses self-referential HTTP on Vercel) ──────
// Server-side has no CORS restrictions — fetch the site directly.

async function fetchSxyprnDirect(path: string): Promise<string> {
  const res = await fetch(`https://sxyprn.com${path}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`sxyprn fetch error: ${res.status}`)
  return res.text()
}

export async function searchSxyprnQueryDirect(
  query: string,
  page = 0,
  mode = "trending"
): Promise<SxyprnSearchResponse> {
  let sxyprnPath: string
  if (query) {
    const safeQuery = query.replace(/\s+/g, "-")
    sxyprnPath = `/${encodeURIComponent(safeQuery)}.html?sm=${mode}&p=${page}`
  } else {
    switch (mode) {
      case "top-viewed":
        sxyprnPath = `/popular/top-viewed.html?p=${page}`
        break
      case "top-rated":
        sxyprnPath = `/popular/top-pop.html?p=${page}`
        break
      case "latest":
        sxyprnPath = `/blog/all/${page}.html`
        break
      default:
        sxyprnPath = page === 0 ? "/" : `/?p=${page}`
        break
    }
  }
  const html = await fetchSxyprnDirect(sxyprnPath)
  const videos = parseListPage(html)
  const hasMore =
    html.includes("rel='next'") ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function getSxyprnVideoDirect(
  id: string
): Promise<SxyprnVideo | null> {
  try {
    const html = await fetchSxyprnDirect(`/post/${id}.html`)
    return parseVideoPage(html, id)
  } catch {
    return null
  }
}
