import { NextRequest, NextResponse } from "next/server"
import { parseListHtml, parseVideoPage } from "@/lib/javmost"

const JAVMOST_BASE = "https://www.javmost.ws"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchJM(url: string): Promise<string> {
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`, {
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
    // ─── /api/javmost/search ────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const mode = sp.get("mode") || "new"

      let apiUrl: string
      if (query) {
        // JavMost search uses showlist endpoint with search group
        apiUrl = `${JAVMOST_BASE}/showlist/search:${encodeURIComponent(query)}/${page}/update/`
      } else {
        switch (mode) {
          case "censor":
            apiUrl = `${JAVMOST_BASE}/showlist/censor/${page}/update/`
            break
          case "uncensor":
            apiUrl = `${JAVMOST_BASE}/showlist/uncensor/${page}/update/`
            break
          case "new":
          default:
            apiUrl = `${JAVMOST_BASE}/showlist/new/${page}/update/`
            break
        }
      }

      const rawJson = await fetchJM(apiUrl)
      let data: { status: string; data: string; msg?: string }

      try {
        data = JSON.parse(rawJson)
      } catch {
        // If it's a full page HTML, try to parse directly
        const videos = parseListHtml(rawJson)
        return NextResponse.json(
          { videos, page, hasMore: videos.length >= 20 },
          {
            headers: {
              "Cache-Control":
                "public, s-maxage=300, stale-while-revalidate=600",
            },
          }
        )
      }

      if (data.status?.toLowerCase() !== "success" || !data.data) {
        return NextResponse.json(
          { videos: [], page, hasMore: false },
          {
            headers: {
              "Cache-Control":
                "public, s-maxage=60, stale-while-revalidate=120",
            },
          }
        )
      }

      const videos = parseListHtml(data.data)
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

    // ─── /api/javmost/video/:code ─────────────────
    if (joined.startsWith("video/")) {
      const code = path.slice(1).join("/")
      if (!code) {
        return NextResponse.json(
          { error: "Invalid video code" },
          { status: 400 }
        )
      }

      const url = `${JAVMOST_BASE}/${code}/`
      const html = await fetchJM(url)
      const video = parseVideoPage(html, code)

      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    // ─── /api/javmost/player/:code ─────────────────
    if (joined.startsWith("player/")) {
      const code = path.slice(1).join("/")
      if (!code) {
        return new NextResponse("Invalid code", { status: 400 })
      }

      const url = `${JAVMOST_BASE}/${code}/`
      const pageHtml = await fetchJM(url)

      // ── 1. Extract JS variables and resolve video URL server-side ──
      // JavMost loads videos via AJAX (select_part → POST to /ri3123o235r/)
      // We replicate this call server-side to get the actual embed URL
      const varPatterns: Record<string, RegExp> = {
        value: /var\s+YWRzMQo\s*=\s*'([^']+)'/,
        group: /var\s+YWRzMg\s*=\s*'([^']+)'/,
        code4: /var\s+YWRzNA\s*=\s*'([^']+)'/,
        code5: /var\s+YWRzNQ\s*=\s*'([^']+)'/,
        code6: /var\s+YWRzNg\s*=\s*'([^']+)'/,
      }

      const vars: Record<string, string> = {}
      for (const [key, pat] of Object.entries(varPatterns)) {
        const m = pageHtml.match(pat)
        if (m) vars[key] = m[1]
      }

      let embedUrl = ""

      if (vars.value && vars.group && vars.code4 && vars.code5 && vars.code6) {
        try {
          const postUrl = `${JAVMOST_BASE}/ri3123o235r/`
          const formData = new URLSearchParams({
            group: vars.group,
            part: "1",
            code: vars.code4,
            code2: vars.code5,
            code3: vars.code6,
            value: vars.value,
            sound: "av",
          })

          const postRes = await fetch(postUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              Referer: `${JAVMOST_BASE}/${code}/`,
              Origin: JAVMOST_BASE,
            },
            body: formData.toString(),
          })

          if (postRes.ok) {
            const json = await postRes.json()
            if (json.status !== "error" && json.data?.[0]) {
              let u = json.data[0] as string
              if (u.startsWith("//")) u = `https:${u}`
              embedUrl = u
            }
          }
        } catch (e) {
          console.error("[JavMost] Failed to resolve video URL:", e)
        }
      }

      // ── 2. Fallback: try direct iframe/data-link extraction ──
      if (!embedUrl) {
        const knownHosts =
          /streamtape|streamwish|vidhide|dood|mixdrop|voe|upstream|javgg|jav\.guru|embedme/i

        const dataLink = pageHtml.match(/data-link="((?:https?:)?\/\/[^"]+)"/)
        if (dataLink) {
          const u = dataLink[1]
          embedUrl = u.startsWith("//") ? `https:${u}` : u
        }

        if (!embedUrl) {
          for (const m of pageHtml.matchAll(/<iframe[^>]+src="([^"]+)"/gi)) {
            const u = m[1].startsWith("//") ? `https:${m[1]}` : m[1]
            if (knownHosts.test(u)) {
              embedUrl = u
              break
            }
          }
        }

        if (!embedUrl) {
          const anyIframe = pageHtml.match(
            /<iframe[^>]+src="(https?:\/\/(?!(?:www\.)?javmost)[^"]+)"/i
          )
          if (anyIframe) embedUrl = anyIframe[1]
        }
      }

      if (embedUrl) {
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

      // ── 3. Last resort — serve cleaned page with CSS injection to isolate player ──
      const cleaned = pageHtml
        .replace(/;?\s*debugger\s*;?/g, ";")
        .replace(
          /setInterval\s*\(\s*function\s*\([^)]*\)\s*\{[^}]*debugger[^}]*\}\s*,\s*\d+\s*\)/gi,
          "0"
        )
        .replace(
          /\(function\s*\([^)]*\)\s*\{(?:[^{}]|\{[^{}]*\})*debugger(?:[^{}]|\{[^{}]*\})*\}\s*\)\s*\([^)]*\)\s*;?/gi,
          ""
        )
        .replace(/<meta[^>]*x-frame-options[^>]*>/gi, "")
        // Inject CSS to hide everything except the video player area
        .replace(
          "</head>",
          `<style>
#header,.sidebar,.sidebar-bg,.col-md-4,
[class*="adsbyexoclick"],[data-zoneid],
.nav-header,h1.page-header,.card-columns,.card-group,
script[src*="exosrv"],script[src*="realsrv"],
script[src*="wpadmngr"],script[src*="histats"],
noscript,.visually-hidden,
.row>.text-center,.row>.m-b-10,
#devtools-block-parent{display:none!important}
body,#page-container,#content{
  padding:0!important;margin:0!important;
  background:#000!important;min-height:100vh}
#page-container{padding-top:0!important}
#content{margin-left:0!important;padding:0!important}
.col-md-8{width:100%!important;padding:0!important}
.panel-inverse,.panel-body.bg-black{
  background:#000!important;border:none!important;
  margin:0!important;padding:0!important}
#show_player iframe{
  width:100vw!important;height:100vh!important;
  position:fixed!important;top:0!important;left:0!important;
  z-index:99999!important;border:0!important}
</style></head>`
        )

      return new NextResponse(cleaned, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Frame-Options": "SAMEORIGIN",
        },
      })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (err) {
    console.error("[JavMost Proxy] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch from JavMost", details: String(err) },
      { status: 502 }
    )
  }
}
