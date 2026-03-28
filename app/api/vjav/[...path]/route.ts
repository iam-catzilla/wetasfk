import { NextRequest, NextResponse } from "next/server"

const VJAV_BASE = "https://vjav.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchVJAV(path: string): Promise<string> {
  const target = `${VJAV_BASE}${path}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`)
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.text()
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseDurationToSec(dur: string): number {
  const parts = dur.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function parseListPage(html: string) {
  const videos: {
    id: string
    title: string
    thumb: string
    duration: string
    durationSec: number
    views: number
    rating: string
    quality: string
    tags: string[]
    url: string
    embedUrl: string
    added: string
  }[] = []

  const chunks = html
    .split(
      /<(?:article|div)[^>]*class="[^"]*(?:video-box|item|video-item|thumb)[^"]*"/
    )
    .slice(1)

  for (const chunk of chunks.slice(0, 60)) {
    try {
      const linkMatch =
        chunk.match(/href="\/videos\/(\d+)\/([^/"]+)\/"/) ||
        chunk.match(/href="https?:\/\/vjav\.com\/videos\/(\d+)\/([^/"]+)\/"/)
      if (!linkMatch) continue

      const id = linkMatch[1]
      const slug = linkMatch[2] ?? ""

      const titleMatch =
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/title="([^"]{5,})"/) ||
        chunk.match(
          /<a[^>]*href="\/videos\/\d+[^"]*"[^>]*>\s*([^<]{5,})\s*<\/a>/
        )
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : decodeHtml(slug.replace(/-/g, " "))

      const thumbMatch = chunk.match(
        /(?:data-src|data-original|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      const durMatch =
        chunk.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/class="[^"]*time[^"]*"[^>]*>([^<]+)</)
      const duration = durMatch ? durMatch[1].trim() : ""

      if (!id) continue

      videos.push({
        id,
        title: title || slug.replace(/-/g, " "),
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views: 0,
        rating: "",
        quality: chunk.includes("HD") ? "HD" : "",
        tags: [],
        url: `${VJAV_BASE}/videos/${id}/${slug}/`,
        embedUrl: `/api/vjav/player/${id}`,
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

const minimalPlayerHtml = (src: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  iframe{width:100%;height:100%;border:0;display:block}
</style>
</head>
<body>
<iframe src="${src}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
</body>
</html>`

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const joined = path.join("/")
  const sp = request.nextUrl.searchParams

  try {
    // ─── /api/vjav/search ─────────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const mode = sp.get("mode") || "latest"

      let browsePath: string
      if (query) {
        browsePath = `/page/${page}/?s=${encodeURIComponent(query)}`
      } else if (mode === "popular") {
        browsePath =
          page <= 1 ? "/most-popular/" : `/most-popular/page/${page}/`
      } else {
        browsePath =
          page <= 1 ? "/latest-updates/" : `/latest-updates/page/${page}/`
      }

      const html = await fetchVJAV(browsePath)
      const videos = parseListPage(html)

      return NextResponse.json(
        { videos, page, hasMore: videos.length >= 20 },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    }

    // ─── /api/vjav/video/:id ──────────────────────────
    if (joined.startsWith("video/")) {
      const id = path.slice(1).join("/")
      if (!id) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      }

      const html = await fetchVJAV(`/videos/${id}/`)

      const titleMatch =
        html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
        html.match(/property="og:title"[^>]*content="([^"]+)"/) ||
        html.match(/<title>([^<|]+)/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : "Unknown Title"

      const thumbMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/)
      const thumb = thumbMatch ? thumbMatch[1] : ""

      const durMatch = html.match(
        /(?:class="[^"]*duration[^"]*"|itemprop="duration")[^>]*>([^<]+)</
      )
      const duration = durMatch ? durMatch[1].trim() : ""

      const tagMatches = html.matchAll(
        /class="[^"]*tag[^"]*"[^>]*href="[^"]*"[^>]*>([^<]+)</g
      )
      const tags: string[] = []
      for (const m of tagMatches) tags.push(m[1].trim())

      const video = {
        id,
        title,
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views: 0,
        rating: "",
        quality: "",
        tags,
        url: `${VJAV_BASE}/videos/${id}/`,
        embedUrl: `/api/vjav/player/${id}`,
        added: "",
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    // ─── /api/vjav/player/:id ─────────────────────────
    if (joined.startsWith("player/")) {
      const id = path.slice(1).join("/")
      if (!id) {
        return new NextResponse("Invalid player ID", { status: 400 })
      }

      const html = await fetchVJAV(`/videos/${id}/`)

      const knownHosts =
        /streamtape|streamwish|vidhide|dood|mixdrop|voe|upstream|embedo|jav\.guru/i

      let embedUrl = ""

      // data-link attribute
      const dataLink = html.match(/data-link="((?:https?:)?\/\/[^"]+)"/)
      if (dataLink) {
        const u = dataLink[1]
        embedUrl = u.startsWith("//") ? `https:${u}` : u
      }

      // <iframe src="..."> pointing to known video hosts
      if (!embedUrl) {
        for (const m of html.matchAll(/<iframe[^>]+src="([^"]+)"/gi)) {
          const u = m[1].startsWith("//") ? `https:${m[1]}` : m[1]
          if (knownHosts.test(u)) {
            embedUrl = u
            break
          }
        }
      }

      // Any external iframe (fallback)
      if (!embedUrl) {
        const anyIframe = html.match(
          /<iframe[^>]+src="(https?:\/\/(?!(?:www\.)?vjav)[^"]+)"/i
        )
        if (anyIframe) embedUrl = anyIframe[1]
      }

      if (!embedUrl) {
        return new NextResponse("Video embed not found", { status: 502 })
      }

      return new NextResponse(minimalPlayerHtml(embedUrl), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Frame-Options": "SAMEORIGIN",
        },
      })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (err) {
    console.error("[VJAV Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from VJAV", details: String(err) },
      { status: 502 }
    )
  }
}
