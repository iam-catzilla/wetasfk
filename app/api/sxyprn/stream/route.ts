import { NextRequest, NextResponse } from "next/server"

const ALLOWED_CDN_HOST = "sxyprn.com"

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")

  if (!rawUrl) {
    return new NextResponse("Missing url param", { status: 400 })
  }

  // Validate the URL is a SxyPrn CDN URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return new NextResponse("Invalid url", { status: 400 })
  }

  if (parsedUrl.hostname !== ALLOWED_CDN_HOST) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  if (!parsedUrl.pathname.startsWith("/cdn/")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // Forward Range header for video seeking
  const range = request.headers.get("range")
  const upstreamHeaders: HeadersInit = {
    Referer: "https://sxyprn.com/",
    Origin: "https://sxyprn.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  }
  if (range) {
    upstreamHeaders["Range"] = range
  }

  let upstream: Response
  try {
    upstream = await fetch(rawUrl, { headers: upstreamHeaders })
  } catch (err) {
    return new NextResponse("Upstream fetch failed", { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
    })
  }

  const contentType = upstream.headers.get("content-type") || "video/mp4"
  const contentLength = upstream.headers.get("content-length")
  const contentRange = upstream.headers.get("content-range")
  const acceptRanges = upstream.headers.get("accept-ranges")

  const responseHeaders: HeadersInit = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  }
  if (contentLength) responseHeaders["Content-Length"] = contentLength
  if (contentRange) responseHeaders["Content-Range"] = contentRange
  if (acceptRanges) responseHeaders["Accept-Ranges"] = acceptRanges

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
