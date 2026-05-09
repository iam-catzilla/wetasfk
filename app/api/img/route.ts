import { NextRequest, NextResponse } from "next/server"

// Only allow proxying images from these domains (SSRF prevention)
const ALLOWED_DOMAINS = [
  "fastporndelivery.hqporner.com",
  "img.hqporner.com",
  "ptx.cdntrex.com",
  "rdtcdn.com",
  "phncdn.com",
  "n1.1024cdn.sx",
  "n1.1025cdn.sx",
  "n1.1026cdn.sx",
  "n19s.1024cdn.sx",
  "img3.javmost.ws",
  "img2.javmost.ws",
  "pornhoarder.pictures",
  "tbi.sb-cd.com",
  "cdn.javmiku.com",
  "img.coomer.st",
  "coomer.st",
  "kemono.cr",
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
    let referer: string | undefined
    let userAgent = "Mozilla/5.0 (compatible; Googlebot/2.1)"
    const accept = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
    if (parsed.hostname.endsWith(".javmost.ws")) {
      referer = "https://www.javmost.ws/"
    } else if (parsed.hostname.endsWith(".hqporner.com")) {
      referer = "https://hqporner.com/"
    } else if (parsed.hostname.endsWith(".cdntrex.com")) {
      referer = "https://www.porntrex.com/"
    } else if (parsed.hostname.endsWith(".rdtcdn.com")) {
      referer = "https://www.redtube.net/"
      userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
    } else if (parsed.hostname.endsWith(".phncdn.com")) {
      referer = "https://www.redtube.net/pornstars/"
      userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
    } else if (parsed.hostname === "pornhoarder.pictures") {
      referer = "https://pornhoarder.tv/"
    } else if (
      parsed.hostname === "img.coomer.st" ||
      parsed.hostname.endsWith(".coomer.st")
    ) {
      referer = "https://official.coomer.com.co/"
      userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    } else if (parsed.hostname.endsWith(".kemono.cr")) {
      referer = "https://kemono.cr/"
      userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    // Fetch directly (server-to-server, bypasses browser ISP blocks)
    const fetchHeaders: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: accept,
      ...(referer ? { Referer: referer } : {}),
    }
    // phncdn performer avatars sit behind an age-gate cookie
    if (parsed.hostname.endsWith(".phncdn.com")) {
      fetchHeaders["Cookie"] =
        "showAgeDisclaimer=1; platform=pc; recommendations=1"
    }
    const res = await fetch(url, { headers: fetchHeaders })

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
