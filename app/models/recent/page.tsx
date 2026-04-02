"use client"

import { api, Creator } from "@/lib/api"
import { ArtistCard } from "@/components/artist-card"
import { useSource } from "@/lib/source-context"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { IconSparkles, IconMenu2 } from "@tabler/icons-react"

export default function RecentCreatorsPage() {
  const { source } = useSource()
  const [artists, setArtists] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true)
      try {
        const data = await api.getCreators(source)
        // Sort by updated timestamp descending
        const sorted = [...data]
          .sort((a, b) => b.updated - a.updated)
          .slice(0, 48)
        setArtists(sorted)
      } catch (error) {
        console.error("Failed to fetch recent models:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchArtists()
  }, [source])

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <IconSparkles className="h-5 w-5" />
          <span className="text-sm font-bold tracking-wider uppercase">
            Recently Updated
          </span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter md:text-5xl">
          Recent models
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          The latest models to have their content archived.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artists.map((artist) => (
            <ArtistCard
              key={`${artist.service}-${artist.id}`}
              artist={artist}
            />
          ))}
        </div>
      )}
    </div>
  )
}
