"use client"

import { useAppStore } from "@/lib/store"
import Link from "next/link"
import { IconHistory, IconTrash, IconClock } from "@tabler/icons-react"

export default function HistoryPage() {
  const { watchHistory, clearHistory } = useAppStore()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <IconHistory className="size-6 text-primary" />
            Watch History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {watchHistory.length} video{watchHistory.length !== 1 ? "s" : ""}{" "}
            watched
          </p>
        </div>
        {watchHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
          >
            <IconTrash className="size-4" />
            Clear History
          </button>
        )}
      </div>

      {watchHistory.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {watchHistory.map((item) => (
            <Link
              key={`${item.id}-${item.watchedAt}`}
              href={`/watch/${item.id}`}
              className="group relative flex flex-col overflow-hidden rounded-xl bg-card transition-all hover:ring-1 hover:ring-primary/30"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.thumb ? (
                  <img
                    src={item.thumb}
                    alt={item.title}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                  {item.duration}
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3">
                <h3 className="line-clamp-2 text-sm leading-snug font-medium">
                  {item.title}
                </h3>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconClock className="size-3" />
                  {new Date(item.watchedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconClock className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            No watch history
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Videos you watch will appear here
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
