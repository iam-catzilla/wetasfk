import type { ScrapedSearchResponse, ScrapedVideo } from "./types"

async function requestText(
  url: string,
  headers: Record<string, string>,
  redirectsLeft = 5,
  retriesLeft = 2
) {
  const { request } = await import("node:https")

  const isTransientNetworkError = (error: unknown) => {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code || "")
        : ""

    return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].includes(code)
  }

  return new Promise<string>((resolve, reject) => {
    const req = request(url, { headers }, (res) => {
      let body = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => {
        body += chunk
      })
      res.on("end", () => {
        const status = res.statusCode || 0
        const location = res.headers.location

        if (location && status >= 300 && status < 400 && redirectsLeft > 0) {
          const nextUrl = new URL(location, url).toString()
          requestText(nextUrl, headers, redirectsLeft - 1, retriesLeft)
            .then(resolve)
            .catch(reject)
          return
        }

        if (status < 200 || status >= 300) {
          reject(new Error(`redtube fetch error: ${status}`))
          return
        }
        resolve(body)
      })
    })

    req.on("error", (error) => {
      if (retriesLeft > 0 && isTransientNetworkError(error)) {
        requestText(url, headers, redirectsLeft, retriesLeft - 1)
          .then(resolve)
          .catch(reject)
        return
      }

      reject(error)
    })
    req.end()
  })
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function proxyThumb(url: string): string {
  if (!url) {
    return ""
  }

  return `/api/img?url=${encodeURIComponent(url)}`
}

function proxyPreview(url: string): string {
  if (!url) {
    return ""
  }

  return `/api/redtube/stream?url=${encodeURIComponent(url)}`
}

function normalizeAssetUrl(url: string): string {
  const normalized = decodeHtml(url || "").trim()
  if (!normalized) {
    return ""
  }

  return normalized.startsWith("//") ? `https:${normalized}` : normalized
}

function isDataUrl(url: string): boolean {
  return url.startsWith("data:")
}

function pickThumbAsset(entry: string): string {
  const matches = [
    ...entry.matchAll(
      /(?:data-src|src|data-thumb|data-mediumthumb|data-big_thumb|poster)=["']([^"']+)["']/gi
    ),
  ]

  for (const match of matches) {
    const assetUrl = normalizeAssetUrl(match[1])
    if (assetUrl && !isDataUrl(assetUrl)) {
      return assetUrl
    }
  }

  return ""
}

function parseDuration(value: string): { dur: string; sec: number } {
  const normalized = value.trim()
  const parts = normalized.split(":").map((part) => parseInt(part, 10))
  const total =
    parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1]
  return { dur: normalized, sec: total }
}

function parseViews(value: string): number {
  const match = value.trim().match(/([\d.]+)\s*([kKmMbB]?)/)
  if (!match) {
    return 0
  }

  const amount = parseFloat(match[1])
  const suffix = match[2].toLowerCase()
  if (suffix === "k") {
    return Math.round(amount * 1_000)
  }
  if (suffix === "m") {
    return Math.round(amount * 1_000_000)
  }
  if (suffix === "b") {
    return Math.round(amount * 1_000_000_000)
  }
  return Math.round(amount)
}

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []
  const entries = html.split(/<div class="video_block_wrapper[^"]*"/i).slice(1)

  for (const entry of entries) {
    try {
      const idMatch = entry.match(/href="\/(\d+)"/i)
      if (!idMatch) {
        continue
      }

      const id = idMatch[1]
      const titleMatch = entry.match(
        /class="video-title-text[^>]*"[^>]*>([\s\S]*?)<\/a>/i
      )
      const title = titleMatch
        ? decodeHtml(
            titleMatch[1]
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          )
        : ""
      if (!title) {
        continue
      }

      const previewAsset = normalizeAssetUrl(
        entry.match(/data-mediabook=["']([^"']+)["']/i)?.[1] ||
          entry.match(/<video[^>]+src=["']([^"']+)["']/i)?.[1] ||
          ""
      )
      const thumbAsset = pickThumbAsset(entry)
      const durationText =
        entry.match(
          /class="video-properties tm_video_duration">([^<]+)</i
        )?.[1] || "0:00"
      const viewsText = entry.match(/class="info-views">([^<]+)</i)?.[1] || "0"
      const rating =
        entry.match(/class="info-rating">([^<]+)</i)?.[1]?.trim() || ""
      const performers = [
        ...entry.matchAll(/href="\/pornstar\/[^"/]+"[^>]*title="([^"]+)"/gi),
      ]
        .map((match) => decodeHtml(match[1].trim()))
        .filter(Boolean)

      videos.push({
        id,
        title,
        thumb: proxyThumb(thumbAsset),
        previewUrl: previewAsset ? proxyPreview(previewAsset) : undefined,
        duration: parseDuration(durationText).dur,
        durationSec: parseDuration(durationText).sec,
        views: parseViews(viewsText),
        rating,
        quality: "",
        tags: [],
        performers: [...new Set(performers)],
        url: `/${id}`,
        embedUrl: `https://embed.redtube.net/?id=${id}`,
        added: "",
      })
    } catch {
      // skip malformed cards
    }
  }

  return videos
}

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    const title = decodeHtml(
      html
        .match(/<title>([^<]+)<\/title>/i)?.[1]
        ?.replace(/\s*-\s*Free Sex Video.*$/i, "") || ""
    ).trim()

    if (!title) {
      return null
    }

    const thumb = proxyThumb(
      html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] || ""
    )
    const durationSeconds = parseInt(
      html.match(/property="video:duration"\s+content="(\d+)"/i)?.[1] ||
        html.match(/"video_duration"\s*:\s*"?(\d+)"?/i)?.[1] ||
        "0",
      10
    )
    const duration = durationSeconds
      ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}`
      : "0:00"

    const views = parseInt(
      html.match(/"userInteractionCount"\s*:\s*"?(\d+)"?/i)?.[1] || "0",
      10
    )
    const rating = html.match(/class="percent">([^<]+)</i)?.[1]?.trim() || ""
    const tags =
      html
        .match(/name="keywords"\s+content="([^"]+)"/i)?.[1]
        ?.split(",")
        .map((tag) => decodeHtml(tag.trim()))
        .filter(Boolean)
        .slice(0, 12) || []
    const performerBlock =
      html.match(/class="performers-list"[\s\S]*?<\/div>/i)?.[0] || ""
    const performers = [
      ...performerBlock.matchAll(/href="\/pornstar\/[^"/]+"[^>]*>([^<]+)</gi),
    ]
      .map((match) => decodeHtml(match[1].trim()))
      .filter(Boolean)
    const added = html.match(/"uploadDate"\s*:\s*"([^"]+)"/i)?.[1] || ""
    const mp4Path =
      html
        .match(/"format"\s*:\s*"mp4"[\s\S]*?"videoUrl"\s*:\s*"([^\"]+)"/i)?.[1]
        ?.replace(/\\\//g, "/") || ""
    const hlsPath =
      html
        .match(/"format"\s*:\s*"hls"[\s\S]*?"videoUrl"\s*:\s*"([^\"]+)"/i)?.[1]
        ?.replace(/\\\//g, "/") ||
      html.match(/"videoUrl"\s*:\s*"([^\"]+)"/i)?.[1]?.replace(/\\\//g, "/") ||
      ""
    const mediaPath = mp4Path || hlsPath
    const embedPath =
      html.match(/embed\.redtube\.net\/\?id=\d+/i)?.[0] ||
      `embed.redtube.net/?id=${id}`

    return {
      id,
      title,
      thumb,
      duration,
      durationSec: durationSeconds,
      views,
      rating,
      quality: "",
      tags: [...new Set(tags)],
      performers: [...new Set(performers)],
      url: `/${id}`,
      embedUrl: `/api/redtube/player/${id}`,
      downloadUrl: mediaPath
        ? `https://www.redtube.net${mediaPath}`
        : undefined,
      added,
    }
  } catch {
    return null
  }
}

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/redtube`
    }

    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/redtube`
  }

  return "/api/redtube"
}

export async function searchRedtube(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) {
    throw new Error(`RedTube proxy error: ${res.status}`)
  }
  return res.json()
}

export async function browseRedtube(page = 1): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    throw new Error(`RedTube proxy error: ${res.status}`)
  }
  return res.json()
}

export async function getRedtubeVideo(
  id: string
): Promise<ScrapedVideo | null> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/video/${id}`, {
    next: { revalidate: 600 },
  })
  if (!res.ok) {
    return null
  }
  const data = await res.json()
  return data.error ? null : data
}

async function fetchRedtubeDirect(path: string): Promise<string> {
  return requestText(`https://www.redtube.net${path}`, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: "showAgeDisclaimer=1; platform=pc; recommendations=1",
    Referer: "https://www.redtube.net/",
    Connection: "keep-alive",
  })
}

export async function searchRedtubeDirect(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const search = encodeURIComponent(query.trim())
  const suffix =
    page <= 1 ? `/?search=${search}` : `/?search=${search}&page=${page}`
  const html = await fetchRedtubeDirect(suffix)
  const videos = parseListPage(html)
  const hasMore = html.includes("pagination") || videos.length >= 20
  return { videos, page, hasMore }
}

export async function browseRedtubeDirect(
  page = 1
): Promise<ScrapedSearchResponse> {
  const path = page <= 1 ? "/" : `/?page=${page}`
  const html = await fetchRedtubeDirect(path)
  const videos = parseListPage(html)
  const hasMore = html.includes("pagination") || videos.length >= 20
  return { videos, page, hasMore }
}

export async function getRedtubeVideoDirect(
  id: string
): Promise<ScrapedVideo | null> {
  try {
    const html = await fetchRedtubeDirect(`/${id}`)
    return parseVideoPage(html, id)
  } catch {
    return null
  }
}
