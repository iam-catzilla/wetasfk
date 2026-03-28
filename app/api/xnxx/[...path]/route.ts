import { NextRequest, NextResponse } from "next/server"
import { parseListPage, parseVideoPage } from "@/lib/xnxx"

const XNXX_BASE = "https://www.xnxx.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchXnxx(path: string): Promise<string> {
  const target = `${XNXX_BASE}${path}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`)
  if (!res.ok) {
    throw new Error(`Codetabs proxy error: ${res.status}`)
  }
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
    // ─── /api/xnxx/search ────────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "0", 10)
      const mode = sp.get("mode") || "hits"

      let xnxxPath: string
      if (query) {
        const safeQuery = query.replace(/\s+/g, "+")
        xnxxPath = `/search/${encodeURIComponent(safeQuery)}/${page}`
      } else {
        switch (mode) {
          case "best":
            xnxxPath = page === 0 ? "/best" : `/best/${page}`
            break
          case "new":
            xnxxPath = page === 0 ? "/new/" : `/new/${page}`
            break
          case "hits":
          default:
            xnxxPath = page === 0 ? "/hits" : `/hits/${page}`
            break
        }
      }

      const html = await fetchXnxx(xnxxPath)
      const videos = parseListPage(html)

      const hasMore =
        html.includes('class="pagination"') ||
        html.includes('rel="next"') ||
        videos.length >= 20

      return NextResponse.json(
        { videos, page, hasMore },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    }

    // ─── /api/xnxx/video/:path+ ─────────────────────────
    if (joined.startsWith("video/")) {
      // ID uses tilde as separator: "video-hbwy3c6~slug_here"
      // Convert back to URL path: "/video-hbwy3c6/slug_here"
      const rawId = path.slice(1).join("/")
      if (!rawId) {
        return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
      }

      const videoPath = rawId.replace(/~/g, "/")
      const html = await fetchXnxx(`/${videoPath}`)
      const video = parseVideoPage(html, rawId)

      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (err) {
    console.error("[XNXX Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from XNXX", details: String(err) },
      { status: 502 }
    )
  }
}
