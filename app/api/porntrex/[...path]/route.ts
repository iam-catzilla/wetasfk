import { NextRequest, NextResponse } from "next/server"
import {
  browsePorntrexDirect,
  getPorntrexVideoDirect,
  searchPorntrexDirect,
} from "@/lib/porntrex"

export const runtime = "nodejs"

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function renderPorntrexPlayerPage(videoUrl: string): string {
  const serialized = JSON.stringify(videoUrl)
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
<video id="player" controls playsinline preload="metadata"></video>
<script>
  const video = document.getElementById("player");
  const src = ${serialized};
  video.src = src;
  video.onerror = function() {
    document.body.innerHTML = '<div class="error">Unable to load this video.</div>';
  };
</script>
</body>
</html>`
}

/**
 * Resolve a PornTrex /get_file/ URL server-side by following redirects with
 * the expected site cookies. Returns the final CDN URL, or null on failure.
 */
async function resolvePorntrexPlaybackUrl(url: string): Promise<string | null> {
  const { request } = await import("node:https")
  const { request: httpRequest } = await import("node:http")

  function followRedirects(
    target: string,
    redirectsLeft = 6
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const parsed = new URL(target)
      const makeRequest = parsed.protocol === "https:" ? request : httpRequest
      const req = makeRequest(
        target,
        {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            Accept: "video/*, */*",
            Referer: "https://www.porntrex.com/",
            Cookie: "confirmed=true; kt_tcookie=1",
          },
        },
        (res) => {
          res.resume()
          const status = res.statusCode || 0
          const location = res.headers.location
          if (location && status >= 300 && status < 400 && redirectsLeft > 0) {
            const next = new URL(location, target).toString()
            resolve(followRedirects(next, redirectsLeft - 1))
          } else if (status >= 200 && status < 300) {
            resolve(target)
          } else {
            resolve(null)
          }
        }
      )
      req.on("error", () => resolve(null))
      req.setTimeout(8000, () => {
        req.destroy()
        resolve(null)
      })
      req.end()
    })
  }

  return followRedirects(url)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const joined = path.join("/")
  const sp = request.nextUrl.searchParams

  try {
    if (joined.startsWith("player/")) {
      const id = path[1]
      if (!id) {
        return new NextResponse("<html><body>Invalid video ID</body></html>", {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      }

      const video = await getPorntrexVideoDirect(id)
      if (!video?.downloadUrl) {
        return new NextResponse(
          "<html><body>Video not found or no playback URL available.</body></html>",
          {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        )
      }

      let playbackUrl = video.downloadUrl
      if (!playbackUrl.startsWith("http")) {
        playbackUrl = `https://www.porntrex.com${playbackUrl}`
      }

      // Resolve /get_file/ redirect chain server-side so the browser
      // receives a direct CDN URL that doesn't require PHPSESSID.
      if (playbackUrl.includes("/get_file/")) {
        const resolved = await resolvePorntrexPlaybackUrl(playbackUrl)
        if (resolved) playbackUrl = resolved
      }

      return new NextResponse(
        renderPorntrexPlayerPage(escapeHtmlAttr(playbackUrl)),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "SAMEORIGIN",
            "Cache-Control": "no-store",
          },
        }
      )
    }

    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const data = query
        ? await searchPorntrexDirect(query, page)
        : await browsePorntrexDirect(page)

      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      })
    }

    if (joined.startsWith("video/")) {
      const id = path[1]
      if (!id) {
        return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
      }

      const video = await getPorntrexVideoDirect(id)
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
  } catch (error) {
    console.error("[PornTrex Proxy] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch from PornTrex", details: String(error) },
      { status: 502 }
    )
  }
}
