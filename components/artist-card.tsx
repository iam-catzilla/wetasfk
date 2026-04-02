"use client"

import { Creator, api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useFavorites } from "@/hooks/use-favorites"
import { IconHeart } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"

interface ArtistCardProps {
  artist: Creator
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const isFav = isFavorite(artist)
  const source = api.getSourceFromService(artist.service)

  const iconUrl = api.getIconUrl(artist.service, artist.id, source)
  const bannerUrl = api.getBannerUrl(artist.service, artist.id, source)

  return (
    <div className="group relative h-full">
      <Link
        href={`/user/${artist.service}/${artist.id}`}
        className="block h-full"
      >
        <Card className="flex h-full cursor-pointer flex-col overflow-hidden border-none bg-muted/30 py-0 transition-all hover:bg-muted/50">
          <div className="relative aspect-video overflow-hidden bg-muted">
            {/* Banner */}
            <SafeImage
              src={bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow-2xl transition-colors group-hover:border-primary/50">
                  <AvatarImage src={iconUrl} />
                  <AvatarFallback className="bg-muted text-lg font-bold">
                    {artist.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col overflow-hidden">
                  <Badge
                    variant="secondary"
                    className="mb-1 w-fit border-none bg-primary text-[10px] font-bold text-primary-foreground uppercase hover:bg-primary/90"
                  >
                    {artist.service}
                  </Badge>
                  <h3 className="w-full truncate text-base leading-tight font-bold text-white">
                    {artist.name}
                  </h3>
                  <p className="flex items-center gap-1 text-[10px] text-gray-300">
                    {artist.favorited?.toLocaleString() || 0} favorites
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-10 text-white hover:bg-black/20 hover:text-red-500"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleFavorite(artist)
        }}
      >
        <IconHeart
          className={`h-5 w-5 ${isFav ? "fill-red-500 text-red-500" : ""}`}
        />
      </Button>
    </div>
  )
}
