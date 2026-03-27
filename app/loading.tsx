import { IconLoader2 } from "@tabler/icons-react"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Category pills skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <IconLoader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading videos...</span>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl bg-card"
          >
            <div className="aspect-video w-full animate-pulse bg-muted" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
