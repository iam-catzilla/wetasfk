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
    .replace(/â/g, "")
}

// ─── Parse 7mmtv listing page ────────────────────────────

export function parseListPage(html: string): ScrapedVideo[] {
  const videos: ScrapedVideo[] = []

  // Each video is in <div class='col-6 col-md-4 col-lg-3 col-item'>
  const cards = html.split(/class='col-6 col-md-4 col-lg-3 col-item'/i).slice(1)

  for (const card of cards) {
    try {
      // Video URL: /en/{type}_content/{id}/{code}.html
      const linkMatch = card.match(
        /href="https?:\/\/7mmtv\.sx\/en\/(\w+)_content\/(\d+)\/([^"]+)\.html"/
      )
      if (!linkMatch) continue

      const type = linkMatch[1] // censored, uncensored, amateur, reducing-mosaic
      const id = linkMatch[2]
      const code = linkMatch[3]

      // Thumbnail: data-src='https://n1.1024cdn.sx/{type}/m/{thumbId}_{code}.jpg'
      const thumbMatch = card.match(/data-src='([^']+\.(jpg|webp|png))'/)
      const thumb = thumbMatch ? thumbMatch[1] : ""

      // Title: in <h3 class='video-title'><a ...>{title}</a></h3>
      // or from the alt attribute
      const titleMatch =
        card.match(/class='video-title'[^>]*>\s*<a[^>]*>([^<]+)</) ||
        card.match(/alt='([^']+)'/)
      const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : code

      // Date: <span class='small text-muted'>{date}</span>
      const dateMatch = card.match(/class='small text-muted'[^>]*>\s*([^<]+)</)
      const added = dateMatch ? dateMatch[1].trim() : ""

      // Channel/uploader: <div class='video-channel'>{uploader}</div>
      // const uploaderMatch = card.match(/class='video-channel'[^>]*>([^<]+)</)

      const url = `/en/${type}_content/${id}/${code}.html`

      videos.push({
        id: `${type}-${id}`,
        title,
        thumb,
        duration: "",
        durationSec: 0,
        views: 0,
        rating: "",
        quality: type === "uncensored" ? "Uncensored" : "",
        tags: [type],
        url,
        embedUrl: "", // resolved on video page
        added,
      })
    } catch {
      // skip malformed entries
    }
  }

  return videos
}

// ─── Parse 7mmtv video page ─────────────────────────────

export function parseVideoPage(html: string, id: string): ScrapedVideo | null {
  try {
    // Title: <title>{title} - 7mmtv.sx ...</title> or <h3> or breadcrumb
    const titleMatch =
      html.match(/<title>([^<]+?)\s*[-–]\s*7mmtv/)?.[1] ||
      html.match(/breadcrumb-item active[^>]*><a[^>]*>([^<]+)/)?.[1] ||
      ""
    const title = decodeHtml(titleMatch.trim())

    // Thumbnail from cover image
    const thumbMatch = html.match(
      /src="(https?:\/\/n1\.(?:1024|1026)cdn\.sx\/[^"]+\.(jpg|webp))"/
    )
    const thumb = thumbMatch ? thumbMatch[1] : ""

    // Duration from page metadata (e.g. "146分")
    let duration = ""
    let durationSec = 0
    const durMatch = html.match(/(\d+)分/)
    if (durMatch) {
      const mins = parseInt(durMatch[1])
      durationSec = mins * 60
      const h = Math.floor(mins / 60)
      const m = mins % 60
      duration = h > 0 ? `${h}:${String(m).padStart(2, "0")}:00` : `${m}:00`
    }

    // Categories/tags from genre links
    const tags: string[] = []
    for (const m of html.matchAll(
      /\/en\/\w+_category\/\d+\/([^/]+)\/\d+\.html/g
    )) {
      tags.push(decodeURIComponent(m[1].replace(/%20/g, " ")))
    }

    // JAV code from title or URL
    const codeMatch = title.match(/^([A-Z]+-\d[A-Z0-9-]*)/)
    if (codeMatch) tags.unshift(codeMatch[1])

    // Type from URL path in the page
    const typeMatch = html.match(/\/en\/(\w+)_content\//)
    const type = typeMatch ? typeMatch[1] : "censored"

    // Extract embed URL from mvarr data — try to get the base URLs
    let embedUrl = ""

    // Look for streamtape/vidhide/streamwish base URLs in mvarr
    const mvarrMatches = html.matchAll(
      /mvarr\[['"][^'"]+['"]\]\s*=\s*\[\[([^\]]+)\]\]/g
    )
    for (const mv of mvarrMatches) {
      const entry = mv[1]
      // Extract base URL (4th element in the array)
      const urlMatch = entry.match(
        /'(https?:\/\/[^']+(?:tapewithadblock|streamtape|streamwish|vidhide|dood|mixdrop|voe)[^']*)'/
      )
      if (urlMatch) {
        // We found a base URL but need the decoded video ID to construct the full URL.
        // For now, save the base URL info — the player proxy will handle the full page
        embedUrl = urlMatch[1]
        break
      }
    }

    // If no explicit embed URL found, use the player proxy
    const numericId = id.replace(
      /^(censored|uncensored|amateur|reducing-mosaic)-/,
      ""
    )
    if (!embedUrl) {
      embedUrl = `/api/7mmtv/player/${numericId}`
    } else {
      // We have a base URL but can't construct the full embed without decryption
      // Use the player proxy instead
      embedUrl = `/api/7mmtv/player/${numericId}`
    }

    return {
      id,
      title,
      thumb,
      duration,
      durationSec,
      views: 0,
      rating: "",
      quality: type === "uncensored" ? "Uncensored" : "",
      tags,
      url: "",
      embedUrl,
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
      return `https://${process.env.VERCEL_URL}/api/7mmtv`
    }
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}/api/7mmtv`
  }
  return "/api/7mmtv"
}

export async function search7mmtv(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(
    `${base}/search?q=${encodeURIComponent(query)}&page=${page}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`7mmtv proxy error: ${res.status}`)
  return res.json()
}

export async function browse7mmtv(
  page = 1,
  mode: "censored" | "uncensored" | "amateur" | "all" = "censored"
): Promise<ScrapedSearchResponse> {
  const base = getProxyBaseUrl()
  const res = await fetch(`${base}/search?page=${page}&mode=${mode}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`7mmtv proxy error: ${res.status}`)
  return res.json()
}

export async function get7mmtvVideo(id: string): Promise<ScrapedVideo | null> {
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

async function fetch7mmDirect(path: string): Promise<string> {
  const res = await fetch(`https://7mmtv.sx${path}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://7mmtv.sx/",
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`7mmtv fetch error: ${res.status}`)
  return res.text()
}

export async function search7mmtvDirect(
  query: string,
  page = 1
): Promise<ScrapedSearchResponse> {
  // 7mmtv does not support keyword search via scraping — browse list instead
  const html = await fetch7mmDirect(`/en/censored_list/all/${page}.html`)
  const videos = parseListPage(html)
  const hasMore =
    html.includes("rel='next'") ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function browse7mmtvDirect(
  page = 1,
  mode: "censored" | "uncensored" | "amateur" | "all" = "censored"
): Promise<ScrapedSearchResponse> {
  const mmPath =
    mode === "uncensored"
      ? `/en/uncensored_list/all/${page}.html`
      : mode === "amateur"
        ? `/en/amateurjav_list/all/${page}.html`
        : `/en/censored_list/all/${page}.html`
  const html = await fetch7mmDirect(mmPath)
  const videos = parseListPage(html)
  const hasMore =
    html.includes("rel='next'") ||
    html.includes('rel="next"') ||
    videos.length >= 20
  return { videos, page, hasMore }
}

export async function get7mmtvVideoDirect(
  id: string
): Promise<ScrapedVideo | null> {
  try {
    const parts = id.match(/^(?:(\w+)-)?(\d+)$/)
    if (!parts) return null
    const type = parts[1] || "censored"
    const numId = parts[2]
    const listHtml = await fetch7mmDirect(`/en/${type}_list/all/1.html`)
    const linkMatch = listHtml.match(
      new RegExp(
        `href="https?://7mmtv\\.sx/en/${type}_content/${numId}/([^"]+)\\.html"`
      )
    )
    if (!linkMatch) return null
    const html = await fetch7mmDirect(
      `/en/${type}_content/${numId}/${linkMatch[1]}.html`
    )
    return parseVideoPage(html, id)
  } catch {
    return null
  }
}
