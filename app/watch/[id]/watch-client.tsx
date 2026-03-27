"use client"

import { useEffect } from "react"
import { VideoPlayer } from "@/components/video-player"
import { useAppStore } from "@/lib/store"
import type { UnifiedVideo } from "@/lib/types"
import {
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconExternalLink,
} from "@tabler/icons-react"

interface WatchPageClientProps {
  video: UnifiedVideo
}

export function WatchPageClient({ video }: WatchPageClientProps) {
  const { addToHistory, addFavorite, removeFavorite, isFavorite } =
    useAppStore()
  const favorited = isFavorite(video.id)

  useEffect(() => {
    addToHistory({
      id: video.id,
      title: video.title,
      thumb: video.thumb || "",
      duration: video.durationStr,
      watchedAt: Date.now(),
    })
  }, [video, addToHistory])

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
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <VideoPlayer
        embedUrl={video.embedUrl}
        videoId={video.id}
        source={video.source}
        title={video.title}
      />

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
          {favorited ? "Saved" : "Favorite"}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <IconShare className="size-4" />
          Share
        </button>

        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <IconExternalLink className="size-4" />
          Source
        </a>
      </div>
    </div>
  )
}
