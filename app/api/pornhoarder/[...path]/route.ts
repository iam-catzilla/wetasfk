import { NextRequest, NextResponse } from "next/server"
import { parseListPage, parseVideoPage } from "@/lib/pornhoarder"

const PH_BASE = "https://pornhoarder.tv"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="
const ALL_SERVERS = [
  "33",
  "47",
  "21",
  "40",
  "45",
  "12",
  "35",
  "25",
  "41",
  "44",
  "42",
  "43",
  "48",
  "29",
]

async function fetchPH(path: string): Promise<string> {
  const target = `${PH_BASE}${path}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`)
  if (!res.ok) {
    throw new Error(`Codetabs proxy error: ${res.status}`)
  }
  return res.text()
}

async function ajaxSearch(
  query: string,
  page: number,
  sort = "0"
): Promise<string> {
  const params = new URLSearchParams()
  params.set("search", query)
  params.set("sort", sort)
  params.set("page", String(page))
  for (const s of ALL_SERVERS) params.append("servers[]", s)

  const res = await fetch(`${PH_BASE}/ajax_search.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`AJAX search error: ${res.status}`)
  return res.text()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const joined = path.join("/")
  const sp = request.nextUrl.searchParams

  try {
    // ─── /api/pornhoarder/search ─────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)

      let html: string
      if (query) {
        // Try direct AJAX search first (works without ISP blocking)
        try {
          html = await ajaxSearch(query, page, "1")
        } catch {
          // Fallback: browse /welcome/ (codetabs proxy) when ISP blocks direct
          const phPath = page <= 1 ? "/welcome/" : `/welcome/?page=${page}`
          html = await fetchPH(phPath)
        }
      } else {
        const phPath = page <= 1 ? "/welcome/" : `/welcome/?page=${page}`
        html = await fetchPH(phPath)
      }

      const videos = parseListPage(html)
      const hasMore = videos.length >= 20

      return NextResponse.json(
        { videos, page, hasMore },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    }

    // ─── /api/pornhoarder/video/:slug~:encodedId ────
    if (joined.startsWith("video/")) {
      const videoId = path.slice(1).join("/")
      if (!videoId) {
        return NextResponse.json(
          { error: "Invalid video path" },
          { status: 400 }
        )
      }

      // ID format: slug~encodedId (tilde separator, full base64 encodedId)
      const tildeIdx = videoId.indexOf("~")
      if (tildeIdx === -1) {
        return NextResponse.json(
          { error: "Invalid video ID format" },
          { status: 400 }
        )
      }
      const slug = videoId.slice(0, tildeIdx)
      const encodedId = videoId.slice(tildeIdx + 1)

      const html = await fetchPH(`/pornvideo/${slug}/${encodedId}`)
      const video = parseVideoPage(html, videoId)

      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    // ─── /api/pornhoarder/player/:slug~:encodedId ───
    if (joined.startsWith("player/")) {
      const videoId = path.slice(1).join("/")
      if (!videoId) {
        return new NextResponse("Invalid player path", { status: 400 })
      }

      const tildeIdx = videoId.indexOf("~")
      if (tildeIdx === -1) {
        return new NextResponse("Invalid video ID format", { status: 400 })
      }
      const slug = videoId.slice(0, tildeIdx)
      const encodedId = videoId.slice(tildeIdx + 1)

      const html = await fetchPH(`/pornvideo/${slug}/${encodedId}`)

      // Try to extract embed iframe URL — try both attribute orders
      const iframePatterns = [
        /<iframe[^>]+src="(https?:\/\/[^"]+)"[^>]*allow(?:fullscreen)?/i,
        /<iframe[^>]+src="(\/\/[^"]+)"[^>]*allow(?:fullscreen)?/i,
        /<iframe[^>]+allow(?:fullscreen)?[^>]+src="(https?:\/\/[^"]+)"/i,
        /<iframe[^>]+allow(?:fullscreen)?[^>]+src="(\/\/[^"]+)"/i,
        /<iframe[^>]+src="(https?:\/\/[^"]+)"/i,
      ]

      let embedUrl = ""
      for (const pattern of iframePatterns) {
        const m = html.match(pattern)
        if (m) {
          embedUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1]
          break
        }
      }

      if (!embedUrl) {
        return new NextResponse("Embed URL not found", { status: 502 })
      }

      // Build a minimal player page that embeds the external player
      const playerHtml = `<!DOCTYPE html>
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
<iframe src="${embedUrl}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
</body>
</html>`

      return new NextResponse(playerHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Frame-Options": "SAMEORIGIN",
        },
      })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (err) {
    console.error("[PornHoarder Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from PornHoarder", details: String(err) },
      { status: 502 }
    )
  }
}
