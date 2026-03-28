import type { ScrapedVideo, ScrapedSearchResponse } from "./types"

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

function parseDurationText(text: string): { dur: string; sec: number } {
  // Formats: "10sec", "5min 30sec", "1h 23min 45sec", "5min", etc.
  const h = text.match(/(\d+)\s*h/)?.[1]
  const m = text.match(/(\d+)\s*min/)?.[1]
  const s = text.match(/(\d+)\s*sec/)?.[1]
  const hours = parseInt(h || "0")
  const mins = parseInt(m || "0")
  const secs = parseInt(s || "0")
  const total = hours * 3600 + mins * 60 + secs
  const parts: string[] = []
  if (hours) parts.push(`${hours}`)
  parts.push(hours ? String(mins).padStart(2, "0") : `${mins}`)
  parts.push(String(secs).padStart(2, "0"))
  return { dur: parts.join(":"), sec: total }
}

function parseViewsText(text: string): number {
  const match = text.match(/([\d.]+)\s*([kKmMbB]?)/)
  if (!match) return 0
  const num = parseFloat(match[1])
  const suffix = match[2].toLowerCase()
  if (suffix === "k") return Math.round(num * 1000)
  if (suffix === "m") return Math.round(num * 1000000)
  if (suffix === "b") return Math.round(num * 1000000000)
  return Math.round(num)
}

// ─── Parse XNXX list page ────────────────────────────────

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []
  const entries = html.split('class="thumb-block').slice(1)

  for (const entry of entries) {
    try {
      // Video data from data-video JSON attribute
      const dataVideoMatch = entry.match(/data-video='([^']+)'/)
      let numericId = ""
      let thumb = ""
      if (dataVideoMatch) {
        try {
          const data = JSON.parse(dataVideoMatch[1].replace(/\\\//g, "/"))
          numericId = String(data.id || "")
          thumb = data.mozaiqueListing || data.sfwThumbUrl || ""
        } catch {
          // fallback
        }
      }

      if (!thumb) {
        const thumbMatch = entry.match(/data-src="(https?:\/\/thumb[^"]+)"/)
        if (thumbMatch) thumb = thumbMatch[1]
      }

      if (!numericId) {
        const idMatch = entry.match(/id="video-thumb-(\d+)"/)
        if (idMatch) numericId = idMatch[1]
      }

      // Title from <a class="title"...>
      const titleMatch = entry.match(
        /<a\s+class="title"[^>]*title="([^"]*)"[^>]*>/
      )
      const title = titleMatch ? decodeHtml(titleMatch[1]) : ""

      const urlMatch = entry.match(/<a\s+class="title"[^>]*href="([^"]*)"/)
      const videoPath = urlMatch ? urlMatch[1] : ""

      // Extract encoded ID and slug from URL path like /video-hbwy3c6/slug_here
      // Store as "video-hbwy3c6~slug_here" (tilde separator) to avoid slashes in ID
      let id = ""
      if (videoPath) {
        const parts = videoPath.replace(/^\//, "").split("/")
        id = parts.join("~")
      }
      if (!id) id = numericId
      if (!id || !title) continue

      // Metadata
      const metaMatch = entry.match(/class="metadata">([\s\S]*?)<\/div>/)
      let viewsNum = 0
      let durationStr = ""
      let durationSec = 0
      let rating = ""
      let quality = ""

      if (metaMatch) {
        const meta = metaMatch[1]

        const leftSpan =
          meta.match(/class="left">([\s\S]*?)<\/span>/)?.[1] || ""
        const durText = leftSpan
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
        const durMatch = durText.match(
          /\d+\s*(?:h|min|sec)[\d\s]*(?:h|min|sec)?[\d\s]*(?:h|min|sec)?/
        )
        if (durMatch) {
          const parsed = parseDurationText(durMatch[0])
          durationStr = parsed.dur
          durationSec = parsed.sec
        }

        const qualityMatch = meta.match(/class="video-hd"[\s\S]*?(\d+p)/i)
        if (qualityMatch) quality = qualityMatch[1]

        const rightSpan =
          meta.match(/class="right">([\s\S]*?)<\/span>/)?.[1] || ""
        const viewsText = rightSpan.replace(/<[^>]+>/g, " ").trim()
        const viewsMatch = viewsText.match(/([\d.]+)\s*([kKmMbB]?)/)
        if (viewsMatch) viewsNum = parseViewsText(viewsMatch[0])

        const ratingMatch = meta.match(/class="superfluous">([^<]*)</)
        if (ratingMatch) rating = ratingMatch[1].trim()
      }

      videos.push({
        id,
        title,
        thumb,
        duration: durationStr,
        durationSec,
        views: viewsNum,
        rating,
        quality,
        tags: [],
        url: videoPath || `/${id.replace(/~/g, "/")}`,
        embedUrl: id ? `/api/xnxx/player/${id}` : "",
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

// ─── Parse XNXX video page ──────────────────────────────

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    // Title from meta or html5player
    const titleMatch =
      html.match(/html5player\.setVideoTitle\('([^']+)'\)/)?.[1] ||
      html.match(/<title>([^<]+)<\/title>/)?.[1] ||
      ""
    const title = decodeHtml(titleMatch.replace(/ - XNXX\.COM$/i, "").trim())

    // Thumbnail
    const thumbMatch = html.match(/html5player\.setThumbUrl\('([^']+)'\)/)
    const thumb = thumbMatch ? thumbMatch[1] : ""

    // Duration from meta tag or JSON-LD
    let durationSec = 0
    const durationMetaMatch = html.match(
      /property="video:duration"\s+content="(\d+)"/
    )
    if (durationMetaMatch) {
      durationSec = parseInt(durationMetaMatch[1])
    } else {
      // Try ISO 8601 from JSON-LD: "PT00H16M35S"
      const isoMatch = html.match(/"duration":\s*"PT(\d+)H(\d+)M(\d+)S"/)
      if (isoMatch) {
        durationSec =
          parseInt(isoMatch[1]) * 3600 +
          parseInt(isoMatch[2]) * 60 +
          parseInt(isoMatch[3])
      }
    }
    const mins = Math.floor(durationSec / 60)
    const secs = durationSec % 60
    const durationStr = `${mins}:${String(secs).padStart(2, "0")}`

    // Quality from available video URLs
    const hasHigh = html.includes("setVideoUrlHigh")
    const quality = hasHigh ? "HD" : ""

    // Views from JSON-LD
    const viewsMatch = html.match(/"userInteractionCount":\s*(\d+)/)
    const views = viewsMatch ? parseInt(viewsMatch[1], 10) : 0

    // Rating
    const ratingMatch = html.match(/(\d+)%\s*<\/span>\s*<\/span>/)
    const rating = ratingMatch ? `${ratingMatch[1]}%` : ""

    // Tags from keywords meta
    const tagsMatch = html.match(/name="keywords"\s+content="([^"]+)"/)
    const tags = tagsMatch
      ? tagsMatch[1]
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : []

    // Numeric ID for embed URL — from inline JSON or setVideoURL
    const numericIdMatch =
      html.match(/"id"\s*:\s*(\d{5,})/) || html.match(/video_id\s*=\s*(\d+)/)
    const numericId = numericIdMatch ? numericIdMatch[1] : ""

    return {
      id,
      title,
      thumb,
      duration: durationStr,
      durationSec,
      views,
      rating,
      quality,
      tags,
      url: `/${id.replace(/~/g, "/")}`,
      embedUrl: id ? `/api/xnxx/player/${id}` : "",
      added: "",
    }
  } catch {
    return null
  }
}

// ─── API client ─────────────────────────────────────────

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/xnxx`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/xnxx`
  }
  return "/api/xnxx"
}

export async function searchXnxx(
  query: string,
  page = 0
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`XNXX proxy error: ${res.status}`)
  return res.json()
}

export async function browseXnxx(
  page = 0,
  mode: "best" | "hits" | "new" = "hits"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`XNXX proxy error: ${res.status}`)
  return res.json()
}

export async function getXnxxVideo(id: string): Promise<ScrapedVideo | null> {
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

async function fetchXnxxDirect(path: string): Promise<string> {
  const res = await fetch(`https://www.xnxx.com${path}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`xnxx fetch error: ${res.status}`)
  return res.text()
}

export async function searchXnxxDirect(
  query: string,
  page = 0
): Promise<ScrapedSearchResponse> {
  const safeQuery = query.replace(/\s+/g, "+")
  const html = await fetchXnxxDirect(
    `/search/${encodeURIComponent(safeQuery)}/${page}`
  )
  const videos = parseListPage(html)
  const hasMore =
    html.includes('class="pagination"') ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function browseXnxxDirect(
  page = 0,
  mode: "hits" | "best" | "new" = "hits"
): Promise<ScrapedSearchResponse> {
  let xnxxPath: string
  switch (mode) {
    case "best":
      xnxxPath = page === 0 ? "/best" : `/best/${page}`
      break
    case "new":
      xnxxPath = page === 0 ? "/new/" : `/new/${page}`
      break
    default:
      xnxxPath = page === 0 ? "/hits" : `/hits/${page}`
      break
  }
  const html = await fetchXnxxDirect(xnxxPath)
  const videos = parseListPage(html)
  const hasMore =
    html.includes('class="pagination"') ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function getXnxxVideoDirect(
  id: string
): Promise<ScrapedVideo | null> {
  try {
    const videoPath = id.replace(/~/g, "/")
    const html = await fetchXnxxDirect(`/${videoPath}`)
    return parseVideoPage(html, id)
  } catch {
    return null
  }
}
