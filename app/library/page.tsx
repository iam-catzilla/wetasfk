"use client"

import { useAppStore } from "@/lib/store"
import Link from "next/link"
import {
  IconTrash,
  IconPlayerPlay,
  IconFolderOpen,
  IconDeviceTv,
} from "@tabler/icons-react"

export default function LibraryPage() {
  const { playlists, deletePlaylist } = useAppStore()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <IconDeviceTv className="size-6 text-primary" />
            Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="group relative flex flex-col overflow-hidden rounded-xl bg-card transition-all hover:ring-1 hover:ring-primary/30"
            >
              {/* Thumbnail mosaic */}
              <Link
                href={`/library/${pl.id}`}
                className="relative aspect-video w-full overflow-hidden bg-muted"
              >
                {pl.items.length > 0 ? (
                  <div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
                    {pl.items.slice(0, 4).map((item, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={item.id}
                        src={item.thumb}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ))}
                    {/* Fill remaining slots with muted bg */}
                    {Array.from({
                      length: Math.max(0, 4 - pl.items.length),
                    }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-muted" />
                    ))}
                  </div>
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <IconDeviceTv className="size-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                  {pl.items.length} video{pl.items.length !== 1 ? "s" : ""}
                </div>
                {pl.items.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                    <IconPlayerPlay className="size-10 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                )}
              </Link>

              <div className="flex items-start justify-between gap-2 p-3">
                <Link href={`/library/${pl.id}`} className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm leading-snug font-medium">
                    {pl.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pl.items.length} video{pl.items.length !== 1 ? "s" : ""}
                  </p>
                </Link>
                <button
                  onClick={() => deletePlaylist(pl.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Delete playlist"
                >
                  <IconTrash className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconFolderOpen className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            No playlists yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Save videos to a playlist from any watch page
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
