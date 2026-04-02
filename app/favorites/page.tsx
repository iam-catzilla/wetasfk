"use client"

import { useAppStore } from "@/lib/store"
import { useFavorites } from "@/hooks/use-favorites"
import Link from "next/link"
import { IconHeart, IconTrash, IconHeartOff } from "@tabler/icons-react"
import { ArtistCard } from "@/components/artist-card"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

function FavoritesContent() {
  const { favorites: videoFavs, removeFavorite } = useAppStore()
  const { favorites: modelFavs } = useFavorites()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"videos" | "models">(
    searchParams.get("tab") === "models" ? "models" : "videos"
  )

  useEffect(() => {
    if (searchParams.get("tab") === "models") setTab("models")
  }, [searchParams])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
          <IconHeart className="size-6 text-primary" />
          Favorites
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "videos"
            ? `${videoFavs.length} saved video${videoFavs.length !== 1 ? "s" : ""}`
            : `${modelFavs.length} saved model${modelFavs.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
        <button
          onClick={() => setTab("videos")}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "videos"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Videos
        </button>
        <button
          onClick={() => setTab("models")}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "models"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Models
        </button>
      </div>

      {tab === "videos" ? (
        videoFavs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {videoFavs.map((fav) => (
              <div
                key={fav.id}
                className="group relative flex flex-col overflow-hidden rounded-xl bg-card transition-all hover:ring-1 hover:ring-primary/30"
              >
                <Link
                  href={`/watch/${fav.id}`}
                  className="relative aspect-video w-full overflow-hidden bg-muted block"
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
            <p className="text-lg font-medium text-muted-foreground">No favorite videos yet</p>
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
        )
      ) : modelFavs.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {modelFavs.map((creator) => (
            <ArtistCard key={creator.id + creator.service} artist={creator} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconHeartOff className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">No favorite models yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Click the heart icon on any model to save them here
          </p>
          <Link
            href="/models/search"
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse models
          </Link>
        </div>
      )}
    </div>
  )
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <FavoritesContent />
    </Suspense>
  )
}
