export default function Loading() {
  return (
    <div className="-mx-3 -my-6 overflow-x-hidden md:-mx-6">
      {/* Hero carousel skeleton */}
      <div className="relative h-90 w-full animate-pulse bg-muted md:h-120">
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 left-0 max-w-2xl space-y-3 px-5 py-8 md:px-10 md:py-12">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-white/10" />
            <div className="h-5 w-12 rounded-full bg-white/10" />
          </div>
          <div className="h-9 w-80 rounded-lg bg-white/10" />
          <div className="h-5 w-48 rounded bg-white/10" />
          <div className="h-9 w-32 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl space-y-14 px-4 pb-14 md:px-6">
        {/* Search bar skeleton */}
        <div className="relative z-10 -mt-5">
          <div className="h-14 max-w-2xl animate-pulse rounded-2xl border border-border/50 bg-card/90" />
        </div>

        {/* Top Categories skeleton */}
        <section className="space-y-5 pt-4">
          <div className="h-6 w-36 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-4/3 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        </section>

        {/* Top Artists skeleton */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-6 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-[44%] shrink-0 sm:w-[28%] md:w-[20%] lg:w-[15%] xl:w-[12%]"
              >
                <div className="aspect-3/4 animate-pulse rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </section>

        {/* Trending rail skeleton */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[84%] shrink-0 sm:w-[44%] md:w-[30%] xl:w-[23%]"
              >
                <div className="flex flex-col overflow-hidden rounded-xl bg-card">
                  <div className="aspect-video w-full animate-pulse bg-muted" />
                  <div className="flex flex-col gap-2 p-3">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
