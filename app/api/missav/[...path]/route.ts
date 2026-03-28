import { NextRequest, NextResponse } from "next/server"

const MISSAV_BASE = "https://missav.ws"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchMissAV(path: string): Promise<string> {
  const target = `${MISSAV_BASE}${path}`
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

  // MissAV typically uses Tailwind CSS — split by video link/group element
  const chunks = html
    .split(
      /<(?:div|article)[^>]*class="[^"]*(?:thumbnail|group|video-item|item|relative)[^"]*"/
    )
    .slice(1)

  for (const chunk of chunks.slice(0, 60)) {
    try {
      const linkMatch =
        chunk.match(/href="https?:\/\/missav\.ws\/en\/([^/"]+)"/) ||
        chunk.match(/href="\/en\/([^/"]+)"/) ||
        chunk.match(/href="https?:\/\/missav\.ws\/([A-Za-z][^/"]+)"/) ||
        chunk.match(/href="\/([A-Za-z][A-Za-z0-9-]+)"/)
      if (!linkMatch) continue

      const code = linkMatch[1]
      // Sanity check: JAV codes look like ABC-123
      if (!code || code.length < 3 || !/[A-Za-z]/.test(code)) continue
      if (code.includes("?") || code === "en" || code.startsWith("page")) {
        continue
      }

      const titleMatch =
        chunk.match(/alt="([^"]{5,})"/) ||
        chunk.match(/title="([^"]{5,})"/) ||
        chunk.match(/<h\d[^>]*>([^<]+)</) ||
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : code.toUpperCase()

      const thumbMatch = chunk.match(
        /(?:data-src|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      )
      const thumb = thumbMatch ? thumbMatch[1] : ""

      const durMatch = chunk.match(
        /(?:class="[^"]*duration[^"]*"|<time[^>]*>)([^<]+)</
      )
      const duration = durMatch ? durMatch[1].trim() : ""

      if (!title) continue

      videos.push({
        id: code,
        title,
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views: 0,
        rating: "",
        quality: "",
        tags: [],
        url: `${MISSAV_BASE}/en/${code}`,
        embedUrl: `/api/missav/player/${code}`,
        added: "",
      })
    } catch {
      // skip
    }
  }

  return videos
}

function extractM3u8(html: string): string {
  const patterns = [
    /source\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
    /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
    /<source[^>]+src=["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
    /["'](https?:\/\/surrit\.com\/[^"']+\.m3u8[^"']*)["']/i,
    /["'](https?:\/\/[^"'\s]+\/playlist\.m3u8[^"']*)["']/i,
    /["'](https?:\/\/[^"'\s]{20,}\.m3u8)["']/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1]
  }
  return ""
}

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
    // ─── /api/missav/search ───────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const mode = sp.get("mode") || "new"

      let browsePath: string
      if (query) {
        browsePath =
          page <= 1
            ? `/en/search/${encodeURIComponent(query)}`
            : `/en/search/${encodeURIComponent(query)}?page=${page}`
      } else if (mode === "popular") {
        browsePath = page <= 1 ? "/en/today-hot" : `/en/today-hot?page=${page}`
      } else {
        browsePath = page <= 1 ? "/en/new" : `/en/new?page=${page}`
      }

      const html = await fetchMissAV(browsePath)
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

    // ─── /api/missav/video/:code ──────────────────────
    if (joined.startsWith("video/")) {
      const code = path.slice(1).join("/")
      if (!code) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 })
      }

      const html = await fetchMissAV(`/en/${code}`)

      const titleMatch =
        html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
        html.match(/property="og:title"[^>]*content="([^"]+)"/) ||
        html.match(/<title>([^<|]+)/)
      const title = titleMatch
        ? decodeHtml(titleMatch[1].trim())
        : code.toUpperCase()

      const thumbMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/)
      const thumb = thumbMatch ? thumbMatch[1] : ""

      const durMatch =
        html.match(
          /(?:class="[^"]*duration[^"]*"|itemprop="duration")[^>]*>([^<]+)</
        ) || html.match(/"duration":\s*"([^"]+)"/)
      const duration = durMatch ? durMatch[1].trim() : ""

      const tagMatches = html.matchAll(
        /class="[^"]*(?:tag|genre|label)[^"]*"[^>]*href="[^"]*"[^>]*>([^<]+)</g
      )
      const tags: string[] = []
      for (const m of tagMatches) tags.push(m[1].trim())

      const video = {
        id: code,
        title,
        thumb,
        duration,
        durationSec: parseDurationToSec(duration),
        views: 0,
        rating: "",
        quality: "",
        tags,
        url: `${MISSAV_BASE}/en/${code}`,
        embedUrl: `/api/missav/player/${code}`,
        added: "",
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    // ─── /api/missav/player/:code ─────────────────────
    if (joined.startsWith("player/")) {
      const code = path.slice(1).join("/")
      if (!code) {
        return new NextResponse("Invalid player code", { status: 400 })
      }

      const html = await fetchMissAV(`/en/${code}`)

      // 1. Try to extract m3u8 for native HLS playback (best quality)
      const m3u8Url = extractM3u8(html)
      if (m3u8Url) {
        const posterMatch = html.match(
          /property="og:image"[^>]*content="([^"]+)"/
        )
        const poster = posterMatch ? posterMatch[1] : ""

        return new NextResponse(hlsPlayerHtml(m3u8Url, poster), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Frame-Options": "SAMEORIGIN",
          },
        })
      }

      // 2. Try iframe embed from known video hosts as fallback
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
    console.error("[MissAV Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from MissAV", details: String(err) },
      { status: 502 }
    )
  }
}
