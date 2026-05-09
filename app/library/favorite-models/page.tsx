"use client"

import Link from "next/link"
import { useFavorites } from "@/hooks/use-favorites"
import { ArtistCard } from "@/components/artist-card"
import { IconArrowLeft, IconHeart, IconHeartOff } from "@tabler/icons-react"
import { useSyncExternalStore } from "react"

export default function FavoriteModelsPage() {
  const { favorites } = useFavorites()
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

        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <IconHeart className="size-6 text-primary" />
            Favorite Models
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {safeFavorites.length} model{safeFavorites.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {safeFavorites.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {safeFavorites.map((creator) => (
            <ArtistCard
              key={`${creator.id}:${creator.service}`}
              artist={creator}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconHeartOff className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            No favorite models yet
          </p>
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
