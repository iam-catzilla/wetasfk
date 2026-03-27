import { NextRequest, NextResponse } from "next/server"
import { parseListPage, parseVideoPage } from "@/lib/sxyprn"

const SXYPRN_BASE = "https://sxyprn.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchSxyprn(path: string): Promise<string> {
  const target = `${SXYPRN_BASE}${path}`
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
    // ─── /api/sxyprn/search ──────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "0", 10)
      const mode = sp.get("mode") || "trending"

      let sxyprnPath: string
      if (query) {
        // Search by keyword — sxyprn uses /{keyword}.html?sm=trending
        const safeQuery = query.replace(/\s+/g, "-")
        sxyprnPath = `/${encodeURIComponent(safeQuery)}.html?sm=${mode}&p=${page}`
      } else {
        // Browse modes
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
          case "trending":
          default:
            sxyprnPath = page === 0 ? "/" : `/?p=${page}`
            break
        }
      }

      const html = await fetchSxyprn(sxyprnPath)
      const videos = parseListPage(html)

      // Check if there's a next page link
      const hasMore =
        html.includes("rel='next'") ||
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

    // ─── /api/sxyprn/video/:id ───────────────────────
    if (joined.startsWith("video/")) {
      const id = path[1]
      if (!id || !/^[a-f0-9]+$/.test(id)) {
        return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
      }

      const html = await fetchSxyprn(`/post/${id}.html`)
      const video = parseVideoPage(html, id)

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
    console.error("[SxyPrn Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from SxyPrn", details: String(err) },
      { status: 502 }
    )
  }
}
