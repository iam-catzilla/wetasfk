import https from "node:https"
import { NextRequest, NextResponse } from "next/server"
import { parseListHtml, parseVideoPage } from "@/lib/javmost"

export const runtime = "nodejs"

const JAVMOST_BASE = "https://www.javmost.ws"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="
const MOSTPLAYER_URL_RE = /https?:\/\/(?:www\.)?mostplayer\.com\/embed\/e\//i

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const

function normalizeExternalUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function isDirectMediaUrl(url: string): boolean {
  return /^https?:\/\/[^\s]+\.(?:mp4|m3u8)(?:\?|$)/i.test(url)
}

function readMetaContent(html: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(
      `<meta[^>]+name=(?:["'])?${escapedName}(?:["'])?[^>]+content=(?:["'])?([^"'\\s>]+)(?:["'])?[^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=(?:["'])?([^"'\\s>]+)(?:["'])?[^>]+name=(?:["'])?${escapedName}(?:["'])?[^>]*>`,
      "i"
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

async function requestText(
  url: string,
  init: {
    method?: "GET" | "POST"
    headers?: Record<string, string>
    body?: string
  } = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: init.method || "GET",
        headers: init.headers,
      },
      (res) => {
        let body = ""
        res.setEncoding("utf8")
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, body })
        })
      }
    )

    req.on("error", reject)

    if (init.body) {
      req.write(init.body)
    }

    req.end()
  })
}

function renderIframePage(url: string): string {
  return `<!DOCTYPE html>
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
<iframe src="${escapeHtmlAttr(url)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
</body>
</html>`
}

function renderDirectPlayerPage(url: string): string {
  const isHls = /\.m3u8(?:\?|$)/i.test(url)
  const serializedUrl = JSON.stringify(url)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  body{display:flex}
  video{width:100%;height:100%;display:block;background:#000}
  .error{margin:auto;padding:16px;color:#fff;font:14px/1.4 system-ui,sans-serif;text-align:center}
</style>
</head>
<body>
<video id="player" controls playsinline preload="metadata" crossorigin="anonymous"></video>
${
  isHls
    ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.7/hls.min.js"></script>'
    : ""
}
<script>
  const video = document.getElementById("player");
  const mediaUrl = ${serializedUrl};

  function showError() {
    document.body.innerHTML = '<div class="error">Unable to load this video source.</div>';
  }

  if (${isHls ? "true" : "false"}) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = mediaUrl;
    } else if (window.Hls && window.Hls.isSupported()) {
      let mediaRecoveryAttempts = 0;
      let hasStartedLoad = false;
      const startLoad = () => {
        if (hasStartedLoad) return;
        hasStartedLoad = true;
        hls.startLoad();
      };
      const hls = new window.Hls({ enableWorker: false, autoStartLoad: false });
      hls.loadSource(mediaUrl);
      hls.attachMedia(video);
      video.addEventListener("play", startLoad, { once: true });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data && data.fatal) {
          if (data.type === 'mediaError' && mediaRecoveryAttempts < 2) {
            mediaRecoveryAttempts += 1;
            hls.recoverMediaError();
            return;
          }

          console.error("[JavMost] HLS fatal error", data);
          showError();
        }
      });
    } else {
      showError();
    }
  } else {
    video.src = mediaUrl;
  }
</script>
</body>
</html>`
}

async function resolveMostPlayerStream(
  embedUrl: string,
  pageUrl: string
): Promise<string | null> {
  const embedResponse = await requestText(embedUrl, {
    headers: {
      ...BROWSER_HEADERS,
      Referer: pageUrl,
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
    },
  })

  if (embedResponse.status < 200 || embedResponse.status >= 300) {
    throw new Error(`MostPlayer embed fetch failed: ${embedResponse.status}`)
  }

  const embedHtml = embedResponse.body
  const token = readMetaContent(embedHtml, "x-embed-token")
  const api = readMetaContent(embedHtml, "x-embed-api")
  const et = readMetaContent(embedHtml, "x-embed-et")
  const sig = readMetaContent(embedHtml, "x-embed-sig")

  if (!token || !api || !et || !sig) {
    return null
  }

  const requestBody = JSON.stringify({ ref: new URL(embedUrl).origin })
  const apiResponse = await requestText(`${api}${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      "Content-Length": String(Buffer.byteLength(requestBody)),
      "User-Agent": BROWSER_HEADERS["User-Agent"],
      Referer: embedUrl,
      Origin: new URL(embedUrl).origin,
      "x-embed-auth": "1",
      "x-embed-et": et,
      "x-embed-sig": sig,
    },
    body: requestBody,
  })

  if (apiResponse.status < 200 || apiResponse.status >= 300) {
    throw new Error(`MostPlayer stream API failed: ${apiResponse.status}`)
  }

  const data = JSON.parse(apiResponse.body) as { ok?: boolean; url?: string }
  return data.ok && data.url ? normalizeExternalUrl(data.url) : null
}

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

      const pageUrl = `${JAVMOST_BASE}/${code}/`
      const pageHtml = await fetchJM(pageUrl)

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
              u = normalizeExternalUrl(u)
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
          embedUrl = normalizeExternalUrl(dataLink[1])
        }

        if (!embedUrl) {
          for (const m of pageHtml.matchAll(/<iframe[^>]+src="([^"]+)"/gi)) {
            const u = normalizeExternalUrl(m[1])
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

      let directMediaUrl = isDirectMediaUrl(embedUrl) ? embedUrl : ""

      if (!directMediaUrl && MOSTPLAYER_URL_RE.test(embedUrl)) {
        try {
          directMediaUrl =
            (await resolveMostPlayerStream(embedUrl, pageUrl)) || ""
        } catch (error) {
          console.error("[JavMost] Failed to resolve MostPlayer stream:", error)
        }
      }

      if (directMediaUrl) {
        return new NextResponse(renderDirectPlayerPage(directMediaUrl), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Frame-Options": "SAMEORIGIN",
          },
        })
      }

      if (embedUrl) {
        return new NextResponse(renderIframePage(embedUrl), {
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
