import { NextRequest, NextResponse } from "next/server"
import { parseListPage, parseVideoPage } from "@/lib/hqporner"

const HQ_BASE = "https://hqporner.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchHQ(path: string): Promise<string> {
  const target = `${HQ_BASE}${path}`
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
    // ─── /api/hqporner/search ────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const mode = sp.get("mode") || "new"

      let hqPath: string
      if (query) {
        hqPath =
          page <= 1
            ? `/?q=${encodeURIComponent(query)}`
            : `/?q=${encodeURIComponent(query)}&p=${page}`
      } else {
        switch (mode) {
          case "top":
            hqPath = page <= 1 ? "/top" : `/top/${page}`
            break
          case "top-week":
            hqPath = page <= 1 ? "/top/week" : `/top/week/${page}`
            break
          case "top-month":
            hqPath = page <= 1 ? "/top/month" : `/top/month/${page}`
            break
          case "new":
          default:
            hqPath = page <= 1 ? "/hdporn" : `/hdporn/${page}`
            break
        }
      }

      const html = await fetchHQ(hqPath)
      const videos = parseListPage(html)

      const hasMore =
        html.includes(">Next<") ||
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

    // ─── /api/hqporner/video/:id ─────────────────────
    if (joined.startsWith("video/")) {
      const id = path[1]
      if (!id || !/^\d+$/.test(id)) {
        return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
      }

      // We need the full slug to fetch the page. Try to find it.
      // First try to get the video page HTML by searching for the ID
      const searchHtml = await fetchHQ(`/?q=${id}`)
      const linkMatch = searchHtml.match(
        new RegExp(`href="(/hdporn/${id}-[^"]+\\.html)"`)
      )

      let html: string
      if (linkMatch) {
        html = await fetchHQ(linkMatch[1])
      } else {
        // Try direct path with just the ID
        html = await fetchHQ(`/hdporn/${id}.html`)
      }

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
    console.error("[HQPorner Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from HQPorner", details: String(err) },
      { status: 502 }
    )
  }
}
