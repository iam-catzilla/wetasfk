import { NextRequest, NextResponse } from "next/server"
import { parseListPage, parseVideoPage } from "@/lib/sevenmm"

const BASE = "https://7mmtv.sx"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetch7mm(path: string): Promise<string> {
  const target = `${BASE}${path}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
  })
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
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
    // ─── /api/7mmtv/search ────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const mode = sp.get("mode") || "censored"

      let mmPath: string
      if (query) {
        // 7mmtv uses Google CSE for search — not easily scrapable
        // Fall back to browsing with keyword in URL
        mmPath = `/en/censored_list/all/${page}.html`
      } else {
        switch (mode) {
          case "uncensored":
            mmPath = `/en/uncensored_list/all/${page}.html`
            break
          case "amateur":
            mmPath = `/en/amateurjav_list/all/${page}.html`
            break
          case "all":
            mmPath = `/en/censored_list/all/${page}.html`
            break
          case "censored":
          default:
            mmPath = `/en/censored_list/all/${page}.html`
            break
        }
      }

      const html = await fetch7mm(mmPath)
      const videos = parseListPage(html)

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

    // ─── /api/7mmtv/video/:type-:id ──────────────
    if (joined.startsWith("video/")) {
      const videoId = path.slice(1).join("/")
      if (!videoId) {
        return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
      }

      // videoId format: "censored-199862" or just "199862"
      const parts = videoId.match(/^(?:(\w+)-)?(\d+)$/)
      if (!parts) {
        return NextResponse.json(
          { error: "Invalid video ID format" },
          { status: 400 }
        )
      }

      const type = parts[1] || "censored"
      const numId = parts[2]

      // We need the code to build the URL. Search for it in the list page.
      // Try fetching the latest list and finding the ID
      const listHtml = await fetch7mm(`/en/${type}_list/all/1.html`)
      const linkMatch = listHtml.match(
        new RegExp(
          `href="https?://7mmtv\\.sx/en/${type}_content/${numId}/([^"]+)\\.html"`
        )
      )

      let html: string
      if (linkMatch) {
        html = await fetch7mm(
          `/en/${type}_content/${numId}/${linkMatch[1]}.html`
        )
      } else {
        // Try broader search across list pages
        // For now, try a few common patterns
        const searchHtml = await fetch7mm(`/en/${type}_list/all/1.html`)
        const broadMatch = searchHtml.match(
          new RegExp(`/en/\\w+_content/${numId}/([^"]+)\\.html`)
        )
        if (broadMatch) {
          html = await fetch7mm(
            `/en/${type}_content/${numId}/${broadMatch[1]}.html`
          )
        } else {
          return NextResponse.json(
            { error: "Video not found" },
            { status: 404 }
          )
        }
      }

      const video = parseVideoPage(html, videoId)
      if (!video) {
        return NextResponse.json(
          { error: "Failed to parse video page" },
          { status: 502 }
        )
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    // ─── /api/7mmtv/player/:id ────────────────────
    if (joined.startsWith("player/")) {
      const numId = path[1]
      if (!numId || !/^\d+$/.test(numId)) {
        return new NextResponse("Invalid ID", { status: 400 })
      }

      // Find the video page URL from a list. Try each type.
      let pageHtml = ""
      for (const type of ["censored", "uncensored", "amateurjav"]) {
        try {
          const listHtml = await fetch7mm(`/en/${type}_list/all/1.html`)
          const match = listHtml.match(
            new RegExp(
              `href="(https?://7mmtv\\.sx/en/${type}_content/${numId}/[^"]+\\.html)"`
            )
          )
          if (match) {
            pageHtml = await fetch7mm(new URL(match[1]).pathname)
            break
          }
        } catch {
          continue
        }
      }

      if (!pageHtml) {
        return new NextResponse("Video not found", { status: 404 })
      }

      // Try to extract embed URLs from the mvarr JS variable.
      // 7mmtv structure: mvarr['Name'] = [['Name', 'baseUrl', 'videoId', 'quality']]
      const embedUrls: string[] = []
      const mvarrRe = /mvarr\[['"][^'"]*['"]\]\s*=\s*\[\[([^\]]+)\]\]/g
      for (const mv of pageHtml.matchAll(mvarrRe)) {
        const parts = [...mv[1].matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1])
        // parts[0]=name, parts[1]=baseUrl, parts[2]=videoId
        if (parts.length >= 3 && parts[1].startsWith("http") && parts[2]) {
          const base = parts[1].endsWith("/") ? parts[1] : parts[1] + "/"
          embedUrls.push(base + parts[2])
        }
      }

      // Also look for direct iframe srcs pointing to known video hosts
      const knownHosts =
        /streamtape|streamwish|vidhide|dood|mixdrop|voe|upstream|tapewithadblock/
      for (const m of pageHtml.matchAll(/<iframe[^>]+src="([^"]+)"/gi)) {
        if (knownHosts.test(m[1])) {
          const u = m[1].startsWith("//") ? `https:${m[1]}` : m[1]
          if (!embedUrls.includes(u)) embedUrls.push(u)
        }
      }

      if (embedUrls.length > 0) {
        // Serve a minimal player with the first embed URL
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
<iframe src="${embedUrls[0]}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
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

      // Fallback: inject CSS into the full page to hide site chrome
      const chromeHideStyle = `<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#000}
  header,.navbar,nav,#navbar,#header,footer,#footer,
  aside,.sidebar,#sidebar,.breadcrumb,.col-12.col-lg-4,
  .col-md-3,.col-sm-3,.related,.comments,.page-header,
  .ads,.ad,.social-share,.video-info-section,.description,
  h1,h2,h3,.title-wrap{display:none!important}
  .container,.container-fluid{padding:0!important;max-width:100%!important}
  .embed-responsive{padding-bottom:0!important;height:100vh!important}
  .embed-responsive-item,iframe,video{
    position:fixed!important;inset:0!important;
    width:100%!important;height:100%!important;
  }
</style>`

      const injected = pageHtml
        .replace(/<\/head>/i, `${chromeHideStyle}</head>`)
        .replace(/<meta[^>]*x-frame-options[^>]*>/gi, "")

      return new NextResponse(injected, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Frame-Options": "SAMEORIGIN",
        },
      })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (err) {
    console.error("[7mmtv Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from 7mmtv", details: String(err) },
      { status: 502 }
    )
  }
}
