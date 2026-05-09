import type { ScrapedSearchResponse, ScrapedVideo } from "./types"

const PORNTREX_BASE = "https://www.porntrex.com"
const PORNTREX_PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="
const PORNTREX_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "confirmed=true; kt_tcookie=1",
  Referer: `${PORNTREX_BASE}/`,
} as const

function isTransientNetworkError(error: unknown): boolean {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code || "")
      : ""

  return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].includes(code)
}

async function requestText(
  url: string,
  headers: Record<string, string>,
  redirectsLeft = 5,
  retriesLeft = 2
): Promise<string> {
  const { request } = await import("node:https")

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
          reject(new Error(`porntrex fetch error: ${status}`))
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

  const absolute = url.startsWith("//") ? `https:${url}` : url
  return `/api/img?url=${encodeURIComponent(absolute)}`
}

function parseDuration(value: string): { dur: string; sec: number } {
  const normalized = value.trim()

  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized)) {
    const parts = normalized.split(":").map((part) => parseInt(part, 10))
    const total =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1]
    return { dur: normalized, sec: total }
  }

  const hours = parseInt(normalized.match(/(\d+)\s*h/i)?.[1] || "0", 10)
  const minutes = parseInt(normalized.match(/(\d+)\s*min/i)?.[1] || "0", 10)
  const seconds = parseInt(normalized.match(/(\d+)\s*sec/i)?.[1] || "0", 10)

  const total = hours * 3600 + minutes * 60 + seconds
  const parts: string[] = []

  if (hours) {
    parts.push(`${hours}`)
  }

  parts.push(hours ? String(minutes).padStart(2, "0") : `${minutes}`)
  parts.push(String(seconds).padStart(2, "0"))

  return {
    dur: parts.join(":"),
    sec: total,
  }
}

function parseViews(value: string): number {
  const digits = value.replace(/[^\d]/g, "")
  return digits ? parseInt(digits, 10) : 0
}

function slugifyQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractLinkedNames(
  html: string,
  sectionLabel: string,
  itemHrefPattern: RegExp
): string[] {
  const section = html.match(
    new RegExp(
      `<span class="title-item">${sectionLabel}:<\\/span>[\\s\\S]*?<div class="items-holder[^"]*">([\\s\\S]*?)<\\/div>`,
      "i"
    )
  )?.[1]

  if (!section) {
    return []
  }

  return [...section.matchAll(itemHrefPattern)]
    .map((match) => decodeHtml(match[1].trim()))
    .filter(Boolean)
}

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []
  const entries = html
    .split(/<div class="video-preview-screen video-item thumb-item[^"]*"/i)
    .slice(1)

  for (const entry of entries) {
    try {
      const hrefMatch = entry.match(
        /href="https?:\/\/www\.porntrex\.com\/video\/(\d+)\/([^"/?#]+)"/i
      )
      if (!hrefMatch) {
        continue
      }

      const numericId = hrefMatch[1]
      const slug = hrefMatch[2]
      const id = `${numericId}~${slug}`

      const titleMatch =
        entry.match(/<p class="inf"><a[^>]*title="([^"]+)"/i) ||
        entry.match(/alt="([^"]+)"/i)
      const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : ""
      if (!title) {
        continue
      }

      const thumbMatch =
        entry.match(/data-src="(\/\/ptx\.cdntrex\.com\/[^\"]+)"/i) ||
        entry.match(/data-src="(https?:\/\/[^\"]+)"/i)
      const thumb = proxyThumb(thumbMatch?.[1] || "")

      const durationText =
        entry.match(/<div class="durations">[\s\S]*?<\/i>\s*([^<]+)/i)?.[1] ||
        ""
      const duration = parseDuration(durationText)

      const viewsText =
        entry.match(/<div class="viewsthumb">([^<]+)<\/div>/i)?.[1] || ""
      const rating =
        entry.match(/fa-thumbs-o-up<\/i>\s*([^<]+)/i)?.[1]?.trim() || ""
      const qualityText =
        entry.match(/<span class="quality">([^<]+)<\/span>/i)?.[1]?.trim() || ""
      const hdBadge = /<span class="hd-icon">HD<\/span>/i.test(entry)
      const added =
        entry
          .match(/<ul class="list-unstyled">[\s\S]*?<li>([^<]+)<\/li>/i)?.[1]
          ?.trim() || ""

      videos.push({
        id,
        title,
        thumb,
        duration: duration.dur,
        durationSec: duration.sec,
        views: parseViews(viewsText),
        rating,
        quality: hdBadge && qualityText ? `${qualityText} HD` : qualityText,
        tags: [],
        url: `/video/${numericId}/${slug}`,
        embedUrl: `/api/porntrex/player/${id}`,
        added,
      })
    } catch {
      // skip malformed cards
    }
  }

  return videos
}

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    const [numericId, slug = ""] = id.split("~")

    const flashvarsMatch = html.match(
      /var flashvars = \{([\s\S]*?)\n\s*}\s*;/i
    )?.[1]
    const title = decodeHtml(
      flashvarsMatch?.match(/video_title:\s*'([^']+)'/i)?.[1] ||
        html
          .match(/<title>([^<]+)<\/title>/i)?.[1]
          ?.replace(/\s*\|\s*PornTrex.*$/i, "") ||
        ""
    ).trim()

    if (!title) {
      return null
    }

    const videoUrl = flashvarsMatch?.match(/video_url:\s*'([^']+)'/i)?.[1] || ""
    const qualityText =
      flashvarsMatch?.match(/format_video:\s*'([^']+)'/i)?.[1] || "HD"

    const thumb = proxyThumb(
      html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] || ""
    )

    const text = stripHtml(html)
    const added = text.match(/Published by .*? (\d+\s+\w+\s+ago)/i)?.[1] || ""
    const viewsText =
      text.match(
        /Published by .*? \d+\s+\w+\s+ago\s+([\d ]+)\s+\d+min/i
      )?.[1] || ""
    const durationText =
      text.match(
        /Published by .*? ([\d ]+\s+views)?\s*(\d+\s*min(?:\s*\d+\s*sec)?|\d+\s*sec)/i
      )?.[2] ||
      text.match(/(\d+\s*min(?:\s*\d+\s*sec)?|\d+\s*sec)/i)?.[1] ||
      ""
    const duration = parseDuration(durationText)

    const performers = extractLinkedNames(
      html,
      "Models",
      /href="https?:\/\/www\.porntrex\.com\/models\/[^"/]+\/"[^>]*>(?:<i[^>]*><\/i>\s*)?([^<]+)/gi
    )

    const tags = extractLinkedNames(
      html,
      "Categories",
      /href="https?:\/\/www\.porntrex\.com\/categories\/[^"/]+\/"[^>]*>([^<]+)/gi
    )

    return {
      id,
      title,
      thumb,
      duration: duration.dur,
      durationSec: duration.sec,
      views: parseViews(viewsText),
      rating: html.match(/fa-thumbs-o-up<\/i>\s*([^<]+)/i)?.[1]?.trim() || "",
      quality: qualityText,
      tags: [...new Set(tags)],
      performers: [...new Set(performers)],
      url: slug ? `/video/${numericId}/${slug}` : `/video/${numericId}`,
      embedUrl: `/api/porntrex/player/${id}`,
      downloadUrl: videoUrl || undefined,
      added,
    }
  } catch {
    return null
  }
}

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/porntrex`
    }

    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/porntrex`
  }

  return "/api/porntrex"
}

export async function searchPorntrex(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) {
    throw new Error(`PornTrex proxy error: ${res.status}`)
  }
  return res.json()
}

export async function browsePorntrex(page = 1): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    throw new Error(`PornTrex proxy error: ${res.status}`)
  }
  return res.json()
}

export async function getPorntrexVideo(
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

async function fetchPorntrexDirect(path: string): Promise<string> {
  const target = `${PORNTREX_BASE}${path}`

  try {
    return await requestText(target, PORNTREX_HEADERS)
  } catch {
    const proxied = await fetch(
      `${PORNTREX_PROXY_URL}${encodeURIComponent(target)}`,
      {
        headers: PORNTREX_HEADERS,
        next: { revalidate: 300 },
      }
    )

    if (!proxied.ok) {
      throw new Error(`porntrex proxy error: ${proxied.status}`)
    }

    return proxied.text()
  }
}

export async function searchPorntrexDirect(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const slug = slugifyQuery(query)
  const path = page <= 1 ? `/search/${slug}/` : `/search/${slug}/${page}/`
  const html = await fetchPorntrexDirect(path)
  const videos = parseListPage(html)
  const hasMore = html.includes("next") || videos.length >= 20
  return { videos, page, hasMore }
}

export async function browsePorntrexDirect(
  page = 1
): Promise<ScrapedSearchResponse> {
  const path = page <= 1 ? "/" : `/latest-updates/${page}/`
  const html = await fetchPorntrexDirect(path)
  const videos = parseListPage(html)
  const hasMore = html.includes("next") || videos.length >= 20
  return { videos, page, hasMore }
}

export async function getPorntrexVideoDirect(
  id: string
): Promise<ScrapedVideo | null> {
  try {
    const [numericId, slug = ""] = id.split("~")
    const path = slug ? `/video/${numericId}/${slug}` : `/video/${numericId}`
    const html = await fetchPorntrexDirect(path)
    return parseVideoPage(html, id)
  } catch {
    return null
  }
}
