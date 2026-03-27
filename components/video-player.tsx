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
  // Both sources now use iframe embeds:
  // - Eporner: their own embed player
  // - SxyPrn: external host embed (lulustream, vidara, etc.)
  const iframeSrc = source === "eporner" ? `${embedUrl}?autoplay=0` : embedUrl

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
