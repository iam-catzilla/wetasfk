import { NextRequest, NextResponse } from "next/server"
import {
  browseRedtubeDirect,
  getRedtubeVideoDirect,
  searchRedtubeDirect,
} from "@/lib/redtube"

export const runtime = "nodejs"

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function renderDirectPlayerPage(url: string, isHls: boolean): string {
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
<video id="player" controls playsinline preload="metadata"></video>
${
  isHls
    ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.7/hls.min.js"></script>'
    : ""
}
<script>
  const video = document.getElementById("player");
  const mediaUrl = ${serializedUrl};

  function showError() {
    document.body.innerHTML = '<div class="error">Unable to load this RedTube stream.</div>';
  }

  if (${isHls ? "true" : "false"}) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = mediaUrl;
    } else if (window.Hls && window.Hls.isSupported()) {
      let mediaRecoveryAttempts = 0;
      const hls = new window.Hls({ enableWorker: false, autoStartLoad: true });
      hls.loadSource(mediaUrl);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data && data.fatal) {
          if (data.type === 'mediaError' && mediaRecoveryAttempts < 2) {
            mediaRecoveryAttempts += 1;
            hls.recoverMediaError();
            return;
          }

          console.error("[RedTube] HLS fatal error", data);
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

function isAllowedRedtubeAsset(url: URL): boolean {
  return ["redtube.net", ".redtube.net", ".rdtcdn.com"].some((allowed) => {
    return allowed.startsWith(".")
      ? url.hostname.endsWith(allowed)
      : url.hostname === allowed
  })
}

function toProxiedAssetUrl(request: NextRequest, assetUrl: string): string {
  const proxyUrl = new URL("/api/redtube/stream", request.nextUrl.origin)
  proxyUrl.searchParams.set("url", assetUrl)
  return proxyUrl.toString()
}

function getRedtubeRequestHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: "showAgeDisclaimer=1; platform=pc; recommendations=1",
    Referer: "https://www.redtube.net/",
  }
}

function parseBandwidth(value: string): number | undefined {
  const match = value.match(/(?:^|[_/])(\d{3,5})K(?:[_/.]|$)/i)
  if (!match) {
    return undefined
  }

  const parsed = parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed * 1000 : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function resolveStreamVariants(
  payload: unknown,
  target: URL
): Array<{
  url: string
  width?: number
  height?: number
  bandwidth?: number
  isDefault?: boolean
}> {
  if (typeof payload === "string") {
    const normalized = payload.replace(/\\\//g, "/").trim()
    if (!normalized) {
      return []
    }

    return [
      {
        url: new URL(normalized, target).toString(),
        bandwidth: parseBandwidth(normalized),
        isDefault: true,
      },
    ]
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => resolveStreamVariants(entry, target))
  }

  if (!payload || typeof payload !== "object") {
    return []
  }

  const record = payload as Record<string, unknown>
  const nestedUrl =
    typeof record.videoUrl === "string"
      ? record.videoUrl
      : typeof record.url === "string"
        ? record.url
        : ""

  if (!nestedUrl) {
    return []
  }

  return [
    {
      url: new URL(nestedUrl.replace(/\\\//g, "/"), target).toString(),
      width: getNumber(record.width),
      height: getNumber(record.height),
      isDefault: Boolean(record.defaultQuality),
      bandwidth:
        parseBandwidth(nestedUrl) ||
        (typeof record.quality === "string"
          ? parseBandwidth(record.quality)
          : undefined),
    },
  ]
}

function pickPreferredStreamUrl(
  target: URL,
  rawPayload: string
): string | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawPayload)
  } catch {
    return null
  }

  const variants = resolveStreamVariants(parsed, target)
    .filter((variant) => isAllowedRedtubeAsset(new URL(variant.url)))
    .sort((left, right) => {
      const defaultDelta =
        Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))
      if (defaultDelta !== 0) {
        return defaultDelta
      }

      return (right.bandwidth || 0) - (left.bandwidth || 0)
    })

  return variants[0]?.url || null
}

async function requestRedtubeTextAsset(
  assetUrl: string,
  redirectsLeft = 5,
  retriesLeft = 2
): Promise<string> {
  const { request } = await import("node:https")

  const isTransientNetworkError = (error: unknown) => {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code || "")
        : ""

    return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].includes(code)
  }

  return new Promise<string>((resolve, reject) => {
    const req = request(
      assetUrl,
      { headers: getRedtubeRequestHeaders() },
      (res) => {
        let body = ""
        res.setEncoding("utf8")
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => {
          const status = res.statusCode || 0
          const location = res.headers.location

          if (location && status >= 300 && status < 400 && redirectsLeft > 0) {
            const nextUrl = new URL(location, assetUrl).toString()
            requestRedtubeTextAsset(nextUrl, redirectsLeft - 1, retriesLeft)
              .then(resolve)
              .catch(reject)
            return
          }

          if (status < 200 || status >= 300) {
            reject(new Error(`redtube asset fetch error: ${status}`))
            return
          }

          resolve(body)
        })
      }
    )

    req.on("error", (error) => {
      if (retriesLeft > 0 && isTransientNetworkError(error)) {
        requestRedtubeTextAsset(assetUrl, redirectsLeft, retriesLeft - 1)
          .then(resolve)
          .catch(reject)
        return
      }

      reject(error)
    })
    req.end()
  })
}

async function resolvePlayableRedtubeUrl(assetUrl: string): Promise<string> {
  const target = new URL(assetUrl)
  if (!target.pathname.includes("/media/mp4")) {
    return assetUrl
  }

  const payload = await requestRedtubeTextAsset(assetUrl)
  return pickPreferredStreamUrl(target, payload) || assetUrl
}

async function fetchRedtubeAsset(assetUrl: string): Promise<Response> {
  return fetch(assetUrl, {
    headers: getRedtubeRequestHeaders(),
    cache: "no-store",
  })
}

async function proxyRedtubeStream(
  request: NextRequest,
  assetUrl: string
): Promise<NextResponse> {
  let target: URL
  try {
    target = new URL(assetUrl)
  } catch {
    return NextResponse.json({ error: "Invalid stream URL" }, { status: 400 })
  }

  if (!isAllowedRedtubeAsset(target)) {
    return NextResponse.json(
      { error: "Unsupported stream host" },
      { status: 400 }
    )
  }

  const upstream = await fetchRedtubeAsset(target.toString())
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream stream error: ${upstream.status}` },
      { status: 502 }
    )
  }

  const contentType = upstream.headers.get("content-type") || ""
  const isTextPayload =
    contentType.includes("mpegurl") ||
    contentType.includes("json") ||
    target.pathname.endsWith(".m3u8") ||
    target.pathname.includes("/media/hls")

  if (isTextPayload) {
    const payload = await upstream.text()
    const trimmedPayload = payload.trim()

    if (trimmedPayload.startsWith("#EXTM3U")) {
      const rewritten = payload
        .split("\n")
        .map((line) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith("#")) {
            return line
          }

          return toProxiedAssetUrl(request, new URL(trimmed, target).toString())
        })
        .join("\n")

      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "private, no-store",
        },
      })
    }

    const preferredStreamUrl = pickPreferredStreamUrl(target, payload)
    if (preferredStreamUrl) {
      return proxyRedtubeStream(request, preferredStreamUrl)
    }

    return NextResponse.json(
      {
        error: "Unsupported RedTube stream payload",
        details: trimmedPayload.slice(0, 200),
      },
      { status: 502 }
    )
  }

  const body = await upstream.arrayBuffer()
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const joined = path.join("/")
  const sp = request.nextUrl.searchParams

  try {
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const data = query
        ? await searchRedtubeDirect(query, page)
        : await browseRedtubeDirect(page)

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

      const video = await getRedtubeVideoDirect(id)
      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
      }

      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    if (joined.startsWith("player/")) {
      const id = path[1]
      if (!id) {
        return new NextResponse("Invalid video ID", { status: 400 })
      }

      const video = await getRedtubeVideoDirect(id)
      const streamUrl = video?.downloadUrl

      if (!streamUrl) {
        return new NextResponse("RedTube stream not available", { status: 404 })
      }

      const playerUrl = /\/media\/mp4(?:\?|$)/i.test(streamUrl)
        ? await resolvePlayableRedtubeUrl(streamUrl)
        : toProxiedAssetUrl(request, streamUrl)

      return new NextResponse(
        renderDirectPlayerPage(
          playerUrl,
          /(?:\.m3u8|\/media\/hls)(?:\?|$)/i.test(streamUrl)
        ),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Frame-Options": "SAMEORIGIN",
          },
        }
      )
    }

    if (joined === "stream") {
      const assetUrl = sp.get("url")
      if (!assetUrl) {
        return NextResponse.json(
          { error: "Missing stream URL" },
          { status: 400 }
        )
      }

      return proxyRedtubeStream(request, assetUrl)
    }

    if (joined === "resolve") {
      // Resolves an unresolved /media/mp4 JSON URL to a direct CDN MP4 URL
      // and responds with a 302 redirect so browsers can download it directly.
      const rawUrl = sp.get("url")
      if (!rawUrl) {
        return NextResponse.json({ error: "Missing url" }, { status: 400 })
      }

      let resolved: string
      try {
        resolved = await resolvePlayableRedtubeUrl(rawUrl)
      } catch {
        return NextResponse.json(
          { error: "Failed to resolve RedTube download URL" },
          { status: 502 }
        )
      }

      return NextResponse.redirect(resolved, { status: 302 })
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 })
  } catch (error) {
    console.error("[RedTube Proxy] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch from RedTube", details: String(error) },
      { status: 502 }
    )
  }
}
