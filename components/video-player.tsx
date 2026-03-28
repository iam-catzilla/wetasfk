"use client"

import type { VideoSource } from "@/lib/types"

interface VideoPlayerProps {
  embedUrl: string
  videoId: string
  source?: VideoSource
  title?: string
}

export function VideoPlayer({
  embedUrl,
  videoId,
  source = "eporner",
  title,
}: VideoPlayerProps) {
  const iframeSrc = source === "eporner" ? `${embedUrl}?autoplay=0` : embedUrl

  if (!iframeSrc) {
    return (
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black">
        <p className="text-sm text-white/60">Video source unavailable</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={iframeSrc}
        allowFullScreen
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        className="absolute inset-0 h-full w-full border-0"
        title={title || "Video player"}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
