import { NextRequest, NextResponse } from "next/server"

// Only allow proxying images from these domains (SSRF prevention)
const ALLOWED_DOMAINS = [
  "fastporndelivery.hqporner.com",
  "img.hqporner.com",
  "n1.1024cdn.sx",
  "n1.1026cdn.sx",
  "n19s.1024cdn.sx",
  "img3.javmost.ws",
  "tbi.sb-cd.com",
  "cdn.javmiku.com",
]

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    )
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 })
  }

  if (
    !ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    )
  ) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 })
  }

  try {
    // Fetch directly (server-to-server, bypasses browser ISP blocks)
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    })

    if (!res.ok) {
      return new NextResponse("Image fetch failed", { status: 502 })
    }

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get("Content-Type") || "image/jpeg"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    console.error("[img proxy]", err)
    return new NextResponse("Image proxy error", { status: 502 })
  }
}
