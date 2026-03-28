import { unifiedGetVideo, unifiedSearch, formatViews } from "@/lib/videos"
import { resolveHandler } from "@/lib/source-registry"
import { VideoGrid } from "@/components/video-grid"
import { WatchPageClient } from "./watch-client"
import { notFound } from "next/navigation"
import { IconEye, IconStar, IconClock, IconCalendar } from "@tabler/icons-react"
import Link from "next/link"

interface Props {
  params: Promise<{ id: string }>
}

export default async function WatchPage({ params }: Props) {
  const { id } = await params

  const resolved = resolveHandler(id)
  const source = resolved?.source ?? "eporner"

  const [video, relatedData] = await Promise.all([
    unifiedGetVideo(id),
    unifiedSearch({ per_page: 12, order: "most-popular", sources: [source] }),
  ])

  if (!video) notFound()

  const keywords = video.keywords
    ? [
        ...new Set(
          video.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        ),
      ]
    : []

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* Player */}
        <WatchPageClient video={video} />

        {/* Video Info */}
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-xl leading-tight font-bold lg:text-2xl">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <IconEye className="size-4" />
              {formatViews(video.views)} views
            </span>
            {video.rating && (
              <span className="flex items-center gap-1.5">
                <IconStar className="size-4" />
                {video.rating} rating
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <IconClock className="size-4" />
              {video.durationStr}
            </span>
            <span className="flex items-center gap-1.5">
              <IconCalendar className="size-4" />
              {video.added}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {keywords.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar - Related */}
      <aside className="w-full shrink-0 lg:w-80 xl:w-96">
        <h2 className="mb-4 font-heading text-lg font-semibold">
          Related Videos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {relatedData.videos
            .filter((v) => v.id !== video.id)
            .slice(0, 8)
            .map((v) => (
              <Link
                key={v.id}
                href={`/watch/${v.id}`}
                className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
              >
                <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumb || ""}
                    alt={v.title}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] text-white">
                    {v.durationStr}
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-foreground">
                    {v.title}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatViews(v.views)} views
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </aside>
    </div>
  )
}
