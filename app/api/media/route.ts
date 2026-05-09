import { NextRequest, NextResponse } from "next/server"

const ALLOWED_DOMAINS = ["coomer.st", "kemono.cr"]

function isAllowedHost(hostname: string) {
  return ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  )
}

function buildCoomerKemonoFallbacks(parsed: URL): string[] {
  const candidates = [parsed.toString()]
  const isCoomer =
    parsed.hostname === "coomer.st" || parsed.hostname.endsWith(".coomer.st")
  const isKemono =
    parsed.hostname === "kemono.cr" || parsed.hostname.endsWith(".kemono.cr")

  if (!isCoomer && !isKemono) {
    return candidates
  }

  const alt = new URL(parsed.toString())
  if (alt.pathname.startsWith("/data/")) {
    alt.pathname = alt.pathname.replace(/^\/data/, "")
  } else {
    alt.pathname = `/data${alt.pathname}`
  }

  const altUrl = alt.toString()
  if (altUrl !== candidates[0]) {
    candidates.push(altUrl)
  }

  return candidates
}

function getUpstreamHeaders(
  hostname: string,
  range?: string | null
): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "*/*",
  }

  if (hostname === "coomer.st" || hostname.endsWith(".coomer.st")) {
    headers["Referer"] = "https://official.coomer.com.co/"
  } else if (hostname === "kemono.cr" || hostname.endsWith(".kemono.cr")) {
    headers["Referer"] = "https://kemono.cr/"
  }

  if (range) {
    headers["Range"] = range
  }

  return headers
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return new NextResponse("Invalid url", { status: 400 })
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new NextResponse("Invalid protocol", { status: 400 })
  }

  if (!isAllowedHost(parsed.hostname)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const range = request.headers.get("range")
  const candidates = buildCoomerKemonoFallbacks(parsed)

  let upstream: Response | null = null
  for (const candidate of candidates) {
    let upstreamResponse: Response
    try {
      upstreamResponse = await fetch(candidate, {
        headers: getUpstreamHeaders(parsed.hostname, range),
      })
    } catch {
      continue
    }

    if (upstreamResponse.ok || upstreamResponse.status === 206) {
      upstream = upstreamResponse
      break
    }
  }

  if (!upstream) {
    return new NextResponse("Upstream media fetch failed", { status: 502 })
  }

  const responseHeaders: HeadersInit = {
    "Content-Type": upstream.headers.get("content-type") || "video/mp4",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    "Access-Control-Allow-Origin": "*",
  }

  const contentLength = upstream.headers.get("content-length")
  const contentRange = upstream.headers.get("content-range")
  const acceptRanges = upstream.headers.get("accept-ranges")
  const disposition = upstream.headers.get("content-disposition")

  if (contentLength) responseHeaders["Content-Length"] = contentLength
  if (contentRange) responseHeaders["Content-Range"] = contentRange
  if (acceptRanges) responseHeaders["Accept-Ranges"] = acceptRanges
  if (disposition) responseHeaders["Content-Disposition"] = disposition

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
