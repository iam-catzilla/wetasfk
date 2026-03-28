"use client"

import { useAppStore } from "@/lib/store"
import Link from "next/link"
import { IconPlayerPlay, IconPlaylist } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface PlaylistQueueProps {
  playlistId: string
  currentVideoId: string
}

export function PlaylistQueue({
  playlistId,
  currentVideoId,
}: PlaylistQueueProps) {
  const { getPlaylistById } = useAppStore()
  const playlist = getPlaylistById(playlistId)

  if (!playlist || playlist.items.length === 0) return null

  const currentIndex = playlist.items.findIndex((i) => i.id === currentVideoId)

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <IconPlaylist className="size-4 text-primary" />
          <span className="text-sm font-semibold">{playlist.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {playlist.items.length}
        </span>
      </div>

      {/* Queue items */}
      <div className="max-h-80 overflow-y-auto">
        {playlist.items.map((item, index) => {
          const isCurrent = item.id === currentVideoId
          return (
            <Link
              key={item.id}
              href={`/watch/${item.id}?playlist=${playlistId}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent",
                isCurrent && "bg-primary/10"
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-center text-xs",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isCurrent ? (
                  <IconPlayerPlay className="mx-auto size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
                <div className="absolute right-0.5 bottom-0.5 rounded bg-black/80 px-1 py-0.5 text-[9px] text-white">
                  {item.duration}
                </div>
              </div>
              <p
                className={cn(
                  "line-clamp-2 min-w-0 flex-1 text-xs leading-snug",
                  isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.title}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
