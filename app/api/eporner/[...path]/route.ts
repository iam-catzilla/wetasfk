import { NextRequest, NextResponse } from "next/server"

const EPORNER_API = "https://www.eporner.com/api/v2"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const joinedPath = path.join("/")
  const query = request.nextUrl.searchParams.toString()

  const target = `${EPORNER_API}/${joinedPath}/${query ? `?${query}` : ""}`

  try {
    const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`, {
      headers: { Accept: "application/json" },
    })

    const contentType = res.headers.get("content-type") || ""

    if (!res.ok) {
      const text = await res.text()
      console.error(
        "[API Proxy] Upstream error:",
        res.status,
        text.slice(0, 300)
      )
      return NextResponse.json(
        { error: "Upstream proxy error", status: res.status },
        { status: 502 }
      )
    }

    if (contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "Upstream returned HTML — API may be blocked" },
        { status: 502 }
      )
    }

    const body = await res.text()

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (err) {
    console.error("[API Proxy] Fetch error:", err)
    return NextResponse.json(
      { error: "Failed to reach upstream API", details: String(err) },
      { status: 502 }
    )
  }
}
