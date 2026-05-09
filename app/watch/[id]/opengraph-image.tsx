import { ImageResponse } from "next/og"
import { unifiedGetVideo } from "@/lib/videos"
import { SITE_NAME } from "@/lib/site"

export const runtime = "nodejs"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const video = await unifiedGetVideo(id)

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #09090b 0%, #18181b 50%, #3f0d1d 100%)",
        color: "#fafafa",
        padding: "64px",
        fontFamily: "sans-serif",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          fontSize: 34,
          fontWeight: 700,
          color: "#f43f5e",
        }}
      >
        <span>{SITE_NAME}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        <div
          style={{
            display: "flex",
            width: "fit-content",
            padding: "10px 18px",
            borderRadius: 999,
            background: "rgba(244, 63, 94, 0.14)",
            color: "#fda4af",
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          Watch Page
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 58,
            lineHeight: 1.1,
            fontWeight: 800,
            maxWidth: 960,
          }}
        >
          {video?.title || "Watch free HD videos"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 24,
          color: "#d4d4d8",
        }}
      >
        <span>{video?.source?.toUpperCase() || "MULTI-SOURCE"}</span>
        <span>{video?.durationStr || "HD Streaming"}</span>
      </div>
    </div>,
    size
  )
}
