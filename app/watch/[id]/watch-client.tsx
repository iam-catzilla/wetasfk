"use client"

import { useEffect, useState } from "react"
import { VideoPlayer } from "@/components/video-player"
import { useAppStore } from "@/lib/store"
import { SaveToPlaylistDialog } from "@/components/save-to-playlist"
import type { UnifiedVideo } from "@/lib/types"
import { getVideoDownloadUrl } from "@/lib/downloads"
import {
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconBookmark,
  IconDownload,
} from "@tabler/icons-react"
import { toast } from "sonner"

interface WatchPageClientProps {
  video: UnifiedVideo
}

export function WatchPageClient({ video }: WatchPageClientProps) {
  const { addToHistory } = useAppStore()
  const [saveOpen, setSaveOpen] = useState(false)

  useEffect(() => {
    addToHistory({
      id: video.id,
      title: video.title,
      thumb: video.thumb || "",
      duration: video.durationStr,
      watchedAt: Date.now(),
    })
  }, [video, addToHistory])

  return (
    <div className="flex flex-col gap-4">
      <VideoPlayer
        embedUrl={video.embedUrl}
        videoId={video.id}
        source={video.source}
        title={video.title}
      />

      <SaveToPlaylistDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        videoId={video.id}
        videoTitle={video.title}
        videoThumb={video.thumb || ""}
        videoDuration={video.durationStr}
      />
    </div>
  )
}

export function WatchPageActions({ video }: { video: UnifiedVideo }) {
  const { addFavorite, removeFavorite, isFavorite } = useAppStore()
  const favorited = isFavorite(video.id)
  const [saveOpen, setSaveOpen] = useState(false)

  function toggleFavorite() {
    if (favorited) {
      removeFavorite(video.id)
    } else {
      addFavorite({
        id: video.id,
        title: video.title,
        thumb: video.thumb || "",
        duration: video.durationStr,
        addedAt: Date.now(),
      })
    }
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: video.title, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Watch link copied")
    }
  }

  function handleDownload() {
    const downloadUrl = getVideoDownloadUrl(video)

    if (!downloadUrl) {
      toast.info("This source does not expose a direct downloadable stream yet")
      return
    }

    const absoluteUrl = new URL(downloadUrl, window.location.origin).toString()
    const anchor = document.createElement("a")
    anchor.href = absoluteUrl
    anchor.rel = "noopener noreferrer"
    anchor.target = "_blank"

    if (
      /\.(?:mp4|m3u8)(?:\?|$)/i.test(absoluteUrl) ||
      absoluteUrl.includes("/api/")
    ) {
      anchor.download = `${video.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || video.id}.mp4`
    }

    anchor.click()
    toast.success("Opening download")
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleFavorite}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          favorited
            ? "bg-primary text-primary-foreground"
            : "border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {favorited ? (
          <IconHeartFilled className="size-4" />
        ) : (
          <IconHeart className="size-4" />
        )}
        {favorited ? "In Favorites" : "Add to Favorites"}
      </button>

      <button
        onClick={() => setSaveOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <IconBookmark className="size-4" />
        Save
      </button>

      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <IconDownload className="size-4" />
        Download
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <IconShare className="size-4" />
        Share
      </button>

      <SaveToPlaylistDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        videoId={video.id}
        videoTitle={video.title}
        videoThumb={video.thumb || ""}
        videoDuration={video.durationStr}
      />
    </div>
  )
}
