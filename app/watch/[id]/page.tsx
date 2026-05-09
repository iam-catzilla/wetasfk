import { formatViews } from "@/lib/videos"
import { unifiedGetVideo, unifiedSearch } from "@/lib/server-video-data"
import { resolveHandler } from "@/lib/source-registry"
import { performerSlug } from "@/lib/performers"
import { WatchPageClient, WatchPageActions } from "./watch-client"
import { PlaylistQueue } from "@/components/playlist-queue"
import { notFound } from "next/navigation"
import { IconEye, IconStar, IconClock, IconCalendar } from "@tabler/icons-react"
import Link from "next/link"
import type { Metadata } from "next"
import { SITE_NAME, SITE_URL } from "@/lib/site"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ playlist?: string }>
}

function toIsoDuration(durationSec: number): string | undefined {
  if (!durationSec) {
    return undefined
  }

  const hours = Math.floor(durationSec / 3600)
  const minutes = Math.floor((durationSec % 3600) / 60)
  const seconds = durationSec % 60
  const parts = ["PT"]

  if (hours) parts.push(`${hours}H`)
  if (minutes) parts.push(`${minutes}M`)
  if (seconds || parts.length === 1) parts.push(`${seconds}S`)

  return parts.join("")
}

function absoluteUrl(path: string): string {
  if (!path) {
    return SITE_URL
  }

  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const video = await unifiedGetVideo(id)

  if (!video) {
    return {
      title: "Video not found",
      robots: { index: false, follow: false },
    }
  }

  const canonical = `/watch/${id}`
  const description = [
    `Watch ${video.title} on ${SITE_NAME}.`,
    video.durationStr ? `Duration: ${video.durationStr}.` : null,
    video.keywords ? `Tags: ${video.keywords}.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return {
    title: video.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: video.title,
      description,
      url: canonical,
      type: "video.other",
      images: [
        {
          url: `${canonical}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: video.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: [`${canonical}/opengraph-image`],
    },
  }
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { id } = await params
  const { playlist: playlistId } = await searchParams

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

  const performers = video.performers || []

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: keywords.length
      ? `${video.title}. Tags: ${keywords.join(", ")}.`
      : video.title,
    thumbnailUrl: video.thumb ? [absoluteUrl(video.thumb)] : undefined,
    duration: toIsoDuration(video.durationSec),
    embedUrl: absoluteUrl(video.embedUrl),
    url: `${SITE_URL}/watch/${video.id}`,
    genre: keywords,
    actor: performers.length
      ? performers.map((name) => ({
          "@type": "Person",
          name,
        }))
      : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* Player */}
        <WatchPageClient video={video} />

        {/* Video Info */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="font-heading text-xl leading-tight font-bold lg:text-2xl">
              {video.title}
            </h1>
            <div className="shrink-0">
              <WatchPageActions video={video} />
            </div>
          </div>

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

          {performers.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                In This Video
              </h2>
              <div className="flex flex-wrap gap-2">
                {performers.map((performer) => (
                  <Link
                    key={performer}
                    href={`/actors/${performerSlug(performer)}`}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/15"
                  >
                    {performer}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Queue + Related */}
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80 xl:w-96">
        {playlistId && (
          <PlaylistQueue playlistId={playlistId} currentVideoId={video.id} />
        )}

        <div>
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
        </div>
      </aside>
    </div>
  )
}
