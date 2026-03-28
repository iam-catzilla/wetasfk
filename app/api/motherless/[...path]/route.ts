import { NextRequest, NextResponse } from "next/server"
import { parseListPage, parseVideoPage } from "@/lib/motherless"

const ML_BASE = "https://motherless.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchML(path: string): Promise<string> {
  const target = `${ML_BASE}${path}`
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
    // ─── /api/motherless/search ──────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const mode = sp.get("mode") || "recent"

      let mlPath: string
      if (query) {
        mlPath = `/search/videos?term=${encodeURIComponent(query)}&sort=date&page=${page}`
      } else {
        switch (mode) {
          case "favorited":
            mlPath =
              page <= 1 ? "/videos/favorited" : `/videos/favorited?page=${page}`
            break
          case "viewed":
            mlPath =
              page <= 1 ? "/videos/viewed" : `/videos/viewed?page=${page}`
            break
          case "popular":
            mlPath =
              page <= 1 ? "/videos/popular" : `/videos/popular?page=${page}`
            break
          case "recent":
          default:
            mlPath =
              page <= 1 ? "/videos/recent" : `/videos/recent?page=${page}`
            break
        }
      }

      const html = await fetchML(mlPath)
      const videos = parseListPage(html)

      const hasMore =
        html.includes("next_page") ||
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

    // ─── /api/motherless/video/:id ───────────────────
    if (joined.startsWith("video/")) {
      const id = path[1]
      if (!id || !/^[A-Z0-9]+$/i.test(id)) {
        return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
      }

      const html = await fetchML(`/${id}`)
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
    console.error("[Motherless Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from Motherless", details: String(err) },
      { status: 502 }
    )
  }
}
