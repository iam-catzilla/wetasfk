import { NextRequest, NextResponse } from "next/server"
import { unifiedGetVideo } from "@/lib/server-video-data"
import { getVideoDownloadUrl } from "@/lib/downloads"

export async function GET(request: NextRequest) {
  const ids = [
    ...request.nextUrl.searchParams.getAll("id"),
    ...(request.nextUrl.searchParams.get("ids")?.split(",") || []),
  ]
    .map((id) => id.trim())
    .filter(Boolean)

  if (!ids.length) {
    return NextResponse.json(
      { error: "Missing id query parameters" },
      { status: 400 }
    )
  }

  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const video = await unifiedGetVideo(id)
        const downloadUrl = video ? getVideoDownloadUrl(video) : null

        return {
          id,
          title: video?.title || id,
          watchUrl: `${request.nextUrl.origin}/watch/${id}`,
          downloadUrl: downloadUrl
            ? new URL(downloadUrl, request.nextUrl.origin).toString()
            : null,
          downloadable: Boolean(downloadUrl),
        }
      } catch {
        return {
          id,
          title: id,
          watchUrl: `${request.nextUrl.origin}/watch/${id}`,
          downloadUrl: null,
          downloadable: false,
        }
      }
    })
  )

  return NextResponse.json({ items })
}
