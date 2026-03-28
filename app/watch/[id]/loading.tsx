export default function WatchLoading() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* Player skeleton */}
        <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />

        {/* Action buttons skeleton */}
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>

        {/* Title skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-6 w-2/5 animate-pulse rounded bg-muted" />
        </div>

        {/* Metadata skeleton */}
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-24 animate-pulse rounded bg-muted" />
          ))}
        </div>

        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 animate-pulse rounded-full bg-muted"
              style={{ width: 60 + Math.random() * 60 }}
            />
          ))}
        </div>
      </div>

      {/* Sidebar skeleton */}
      <aside className="w-full shrink-0 lg:w-80 xl:w-96">
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-lg p-2">
              <div className="aspect-video w-36 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
