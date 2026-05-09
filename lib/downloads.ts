import type { UnifiedVideo } from "./types"

export function getVideoDownloadUrl(video: UnifiedVideo): string | null {
  if (video.downloadUrl) {
    // RedTube /media/mp4 URLs are JSON API endpoints, not direct files.
    // Route them through the server-side resolve endpoint which follows the
    // indirection and 302-redirects to the actual CDN MP4.
    if (
      video.source === "redtube" &&
      /\/media\/mp4(?:\?|$)/i.test(video.downloadUrl)
    ) {
      return `/api/redtube/resolve?url=${encodeURIComponent(video.downloadUrl)}`
    }

    return video.downloadUrl
  }

  if (video.embedUrl.startsWith("/api/sxyprn/stream?url=")) {
    return video.embedUrl
  }

  if (/^https?:\/\/[^\s]+\.(?:mp4|m3u8)(?:\?|$)/i.test(video.embedUrl)) {
    return video.embedUrl
  }

  return null
}
