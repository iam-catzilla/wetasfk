import { NextRequest, NextResponse } from "next/server"

const SUPJAV_BASE = "https://supjav.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchSupJAV(path: string): Promise<string> {
  const target = `${SUPJAV_BASE}${path}`
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
      /<(?:article|div)[^>]*class="[^"]*(?:post|video-item|item)[^"]*"[^>]*>/
    )
    .slice(1)

  for (const chunk of chunks.slice(0, 60)) {
    try {
      const linkMatch =
        chunk.match(/href="https?:\/\/supjav\.com\/(\d+)\.html"/) ||
        chunk.match(/href="\/(\d+)\.html"/) ||
        chunk.match(/href="https?:\/\/supjav\.com\/([A-Za-z0-9-]+)\.html"/) ||
        chunk.match(/href="\/([A-Za-z0-9-]+)\.html"/)
      if (!linkMatch) continue

      const id = linkMatch[1]

      const titleMatch =
        chunk.match(/<h\d[^>]*>([^<]+)<\/h\d>/) ||
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/title="([^"]+)"/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : id.replace(/-/g, " ").toUpperCase()

      const thumbMatch = chunk.match(
        /(?:data-src|data-original|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      const durMatch =
        chunk.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)</) ||
        chunk.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/)
      const duration = durMatch ? durMatch[1].trim() : ""

      if (!id) continue

      videos.push({
        id,
        title: title || id,
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views: 0,
        rating: "",
        quality: chunk.includes("HD") || chunk.includes("1080") ? "HD" : "",
        tags: [],
        url: `${SUPJAV_BASE}/${id}.html`,
        embedUrl: `/api/supjav/player/${id}`,
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

// Build an HLS player for m3u8 URLs
function hlsPlayerHtml(m3u8Url: string, poster = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  video{width:100%;height:100%;display:block}
</style>
</head>
<body>
<video id="v" controls autoplay playsinline${poster ? ` poster="${poster}"` : ""}></video>
<script>
  var video = document.getElementById('v');
  var src = ${JSON.stringify(m3u8Url)};
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
  }
</script>
</body>
</html>`
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
    // ─── /api/supjav/search ───────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)

      let browsePath: string
      if (query) {
        browsePath = `/page/${page}/?s=${encodeURIComponent(query)}`
      } else {
        browsePath = page <= 1 ? "/" : `/page/${page}/`
      }

      const html = await fetchSupJAV(browsePath)
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

    // ─── /api/supjav/video/:id ────────────────────────
    if (joined.startsWith("video/")) {
      const id = path.slice(1).join("/")
      if (!id) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      }

      const html = await fetchSupJAV(`/${id}.html`)

      const titleMatch =
        html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
        html.match(/property="og:title"[^>]*content="([^"]+)"/) ||
        html.match(/<title>([^<|–-]+)/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : id.toUpperCase()

      const thumbMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/)
      const thumb = thumbMatch ? thumbMatch[1] : ""

      const tagMatches = html.matchAll(
        /class="[^"]*tag[^"]*"[^>]*href="[^"]*"[^>]*>([^<]+)</g
      )
      const tags: string[] = []
      for (const m of tagMatches) tags.push(m[1].trim())

      const video = {
        id,
        title,
        thumb,
        duration: "",
        durationSec: 0,
        views: 0,
        rating: "",
        quality: "",
        tags,
        url: `${SUPJAV_BASE}/${id}.html`,
        embedUrl: `/api/supjav/player/${id}`,
        added: "",
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    // ─── /api/supjav/player/:id ───────────────────────
    if (joined.startsWith("player/")) {
      const id = path.slice(1).join("/")
      if (!id) {
        return new NextResponse("Invalid player ID", { status: 400 })
      }

      const html = await fetchSupJAV(`/${id}.html`)

      // 1. Try m3u8 first (SupJAV often has HLS streams)
      const m3u8Patterns = [
        /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
        /<source[^>]+src=["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
        /["'](https?:\/\/[^"'\s]+\/master\.m3u8[^"']*)["']/i,
        /["'](https?:\/\/[^"'\s]+\.m3u8(?:\?[^"'\s]*)?)["']/i,
      ]
      let m3u8Url = ""
      for (const re of m3u8Patterns) {
        const m = html.match(re)
        if (m) {
          m3u8Url = m[1]
          break
        }
      }

      if (m3u8Url) {
        return new NextResponse(hlsPlayerHtml(m3u8Url), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Frame-Options": "SAMEORIGIN",
          },
        })
      }

      // 2. Try iframe embed URL from known video hosts
      const knownHosts =
        /streamtape|streamwish|vidhide|dood|mixdrop|voe|upstream/i
      let embedUrl = ""

      const dataLink = html.match(/data-link="((?:https?:)?\/\/[^"]+)"/)
      if (dataLink) {
        const u = dataLink[1]
        embedUrl = u.startsWith("//") ? `https:${u}` : u
      }

      if (!embedUrl) {
        for (const m of html.matchAll(/<iframe[^>]+src="([^"]+)"/gi)) {
          const u = m[1].startsWith("//") ? `https:${m[1]}` : m[1]
          if (knownHosts.test(u)) {
            embedUrl = u
            break
          }
        }
      }

      if (embedUrl) {
        return new NextResponse(minimalPlayerHtml(embedUrl), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Frame-Options": "SAMEORIGIN",
          },
        })
      }

      return new NextResponse("Video source not found", { status: 502 })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (err) {
    console.error("[SupJAV Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from SupJAV", details: String(err) },
      { status: 502 }
    )
  }
}
