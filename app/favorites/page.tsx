"use client"

import { useAppStore } from "@/lib/store"
import Link from "next/link"
import { IconHeart, IconTrash, IconHeartOff } from "@tabler/icons-react"

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useAppStore()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <IconHeart className="size-6 text-primary" />
            Favorites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {favorites.length} saved video{favorites.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="group relative flex flex-col overflow-hidden rounded-xl bg-card transition-all hover:ring-1 hover:ring-primary/30"
            >
              <Link
                href={`/watch/${fav.id}`}
                className="relative aspect-video w-full overflow-hidden bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fav.thumb}
                  alt={fav.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                  {fav.duration}
                </div>
              </Link>
              <div className="flex items-start justify-between gap-2 p-3">
                <Link href={`/watch/${fav.id}`} className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm leading-snug font-medium">
                    {fav.title}
                  </h3>
                </Link>
                <button
                  onClick={() => removeFavorite(fav.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Remove from favorites"
                >
                  <IconTrash className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconHeartOff className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            No favorites yet
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
