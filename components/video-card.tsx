"use client"

import Image from "next/image"
import Link from "next/link"
import {
  IconClock,
  IconEye,
  IconStar,
  IconHeart,
  IconHeartFilled,
} from "@tabler/icons-react"
import type { UnifiedVideo } from "@/lib/types"
import { formatViews, formatDuration } from "@/lib/videos"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useState, useCallback } from "react"

interface VideoCardProps {
  video: UnifiedVideo
  priority?: boolean
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  const { addFavorite, removeFavorite, isFavorite } = useAppStore()
  const favorited = isFavorite(video.id)
  const [imgError, setImgError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const thumbSrc = imgError
    ? "/placeholder.svg"
    : video.thumb || video.thumbs?.[0] || "/placeholder.svg"

  const hoverThumb = video.thumbs?.[7] || video.thumbs?.[4]

  const toggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
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
    },
    [favorited, video, addFavorite, removeFavorite]
  )

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card transition-all hover:shadow-lg hover:ring-1 hover:shadow-primary/5 hover:ring-primary/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Image
          src={isHovered && hoverThumb ? hoverThumb : thumbSrc}
          alt={video.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1400px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
          onError={() => setImgError(true)}
          unoptimized
        />

        {/* Duration Badge */}
        <div className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {video.durationStr || formatDuration(video.durationSec)}
        </div>

        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          className={cn(
            "absolute top-2 right-2 rounded-full p-1.5 transition-all",
            "opacity-0 group-hover:opacity-100",
            favorited
              ? "bg-primary text-primary-foreground opacity-100"
              : "bg-black/60 text-white hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {favorited ? (
            <IconHeartFilled className="size-4" />
          ) : (
            <IconHeart className="size-4" />
          )}
        </button>

        {/* HD Badge */}
        {video.quality && (
          <div className="absolute top-2 left-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {video.quality}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-foreground/90 group-hover:text-foreground">
          {video.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <IconEye className="size-3.5" />
            {formatViews(video.views)}
          </span>
          {video.rating && (
            <span className="flex items-center gap-1">
              <IconStar className="size-3.5" />
              {video.rating}
            </span>
          )}
          <span className="flex items-center gap-1">
            <IconClock className="size-3.5" />
            {video.durationStr}
          </span>
        </div>
      </div>
    </Link>
  )
}
