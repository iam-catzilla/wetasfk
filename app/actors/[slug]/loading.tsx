export default function ActorProfileLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero card skeleton */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
        <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:flex-row lg:items-start lg:gap-8">
          {/* Portrait + gallery */}
          <div className="flex shrink-0 flex-col gap-3 lg:w-56 xl:w-64">
            <div className="aspect-3/4 animate-pulse rounded-2xl bg-muted" />
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>

          {/* Bio + stats */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex gap-2">
              <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="space-y-3">
              <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 max-w-md animate-pulse rounded bg-muted" />
            </div>
            {/* Stats grid */}
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-border/50 bg-background/60 px-4 py-3"
                >
                  <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
            {/* Featured In */}
            <div className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-20 animate-pulse rounded-full bg-muted"
                  />
                ))}
              </div>
            </div>
            {/* External links */}
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-24 animate-pulse rounded-full bg-muted"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Details section skeleton */}
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="space-y-2 rounded-xl border border-border/40 bg-background/70 p-3"
              >
                <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-5">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Videos section skeleton */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
      </section>
    </div>
  )
}
