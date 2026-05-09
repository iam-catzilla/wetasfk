"use client"

import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { SafeImage } from "@/components/ui/safe-image"
import { useSyncExternalStore } from "react"
import {
  IconArrowLeft,
  IconDeviceTv,
  IconHeart,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react"

export default function LikedVideosPage() {
  const { favorites, removeFavorite } = useAppStore()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const safeFavorites = mounted ? favorites : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/library"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
          Library
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
              <IconHeart className="size-6 text-primary" />
              Liked Videos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {safeFavorites.length} video
              {safeFavorites.length !== 1 ? "s" : ""}
            </p>
          </div>

          {safeFavorites.length > 0 && (
            <Link
              href={`/watch/${safeFavorites[0].id}`}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <IconPlayerPlay className="size-4" />
              Play all
            </Link>
          )}
        </div>
      </div>

      {safeFavorites.length > 0 ? (
        <div className="flex flex-col gap-2">
          {safeFavorites.map((item, index) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
            >
              <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                {index + 1}
              </span>

              <Link
                href={`/watch/${item.id}`}
                className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-muted"
              >
                <SafeImage
                  src={item.thumb}
                  alt={item.title}
                  className="size-full object-cover"
                />
                <div className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] text-white">
                  {item.duration}
                </div>
              </Link>

              <Link href={`/watch/${item.id}`} className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-foreground">
                  {item.title}
                </p>
              </Link>

              <button
                onClick={() => removeFavorite(item.id)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                title="Remove from liked videos"
              >
                <IconTrash className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconDeviceTv className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            No liked videos yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Click the heart icon on any video to save it here
          </p>
          <Link
            href="/"
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse videos
          </Link>
        </div>
      )}
    </div>
  )
}
