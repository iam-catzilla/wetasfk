import { NextRequest, NextResponse } from "next/server"
import { searchPornhubDirect, getPornhubVideoDirect } from "@/lib/pornhub"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const joined = path.join("/")
  const sp = request.nextUrl.searchParams

  try {
    // ─── /api/pornhub/search ─────────────────────────
    if (joined === "search") {
      const query = sp.get("q") || ""
      const page = parseInt(sp.get("page") || "1", 10)
      const order = sp.get("order") || undefined
      const data = await searchPornhubDirect(query, page, order)
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      })
    }

    // ─── /api/pornhub/video/:viewkey ─────────────────
    if (joined.startsWith("video/")) {
      const viewkey = path[1]
      if (!viewkey) {
        return NextResponse.json({ error: "Missing viewkey" }, { status: 400 })
      }
      const video = await getPornhubVideoDirect(viewkey)
      if (!video) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json(video, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      })
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
