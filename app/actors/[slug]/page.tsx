import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  IconExternalLink,
  IconFilter,
  IconSparkles,
  IconVideo,
} from "@tabler/icons-react"
import { Pagination } from "@/components/pagination"
import { VideoGrid } from "@/components/video-grid"
import {
  getPerformerImage,
  getPerformerProfile,
  getPerformerVideos,
  summarizePerformerSources,
} from "@/lib/server-performer-data"
import { performerNameFromSlug } from "@/lib/performers"
import { SITE_NAME } from "@/lib/site"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; source?: string; img?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const name = performerNameFromSlug(slug)
  const [profile, videos] = await Promise.all([
    getPerformerProfile(name),
    getPerformerVideos(name),
  ])

  if (!videos.length && !profile.description) {
    return {
      title: "Actor not found",
      robots: { index: false, follow: false },
    }
  }

  const description = profile.description
    ? profile.description.slice(0, 160)
    : "Watch videos featuring " + name + " on " + SITE_NAME + "."

  return {
    title: name + " videos",
    description,
  }
}

function formatSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    sxyporn: "SxyPrn",
    xnxx: "XNXX",
    hqporner: "HQPorner",
    porntrex: "PornTrex",
    redtube: "RedTube",
    motherless: "Motherless",
    pornhoarder: "PornHoarder",
    "7mmtv": "7MMTV",
    javmost: "JavMost",
  }
  return labels[source] ?? source
}

export default async function ActorProfilePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const filters = await searchParams
  const name = performerNameFromSlug(slug)
  const [profile, videos, fallbackHeroImage] = await Promise.all([
    getPerformerProfile(name),
    getPerformerVideos(name),
    getPerformerImage(name),
  ])

  if (!videos.length && !profile.description) {
    notFound()
  }

  const sources = summarizePerformerSources(videos)
  const sourceCounts = sources.map((source) => ({
    source,
    count: videos.filter((v) => v.source === source).length,
  }))
  const selectedSource =
    filters.source &&
    sources.includes(filters.source as (typeof sources)[number])
      ? filters.source
      : "all"
  const filteredVideos =
    selectedSource === "all"
      ? videos
      : videos.filter((v) => v.source === selectedSource)
  const page = Math.max(1, parseInt(filters.page || "1", 10) || 1)
  const perPage = 24
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / perPage))
  const safePage = Math.min(page, totalPages)
  const paginatedVideos = filteredVideos.slice(
    (safePage - 1) * perPage,
    safePage * perPage
  )

  const allImages = [
    ...new Set(
      [profile.image, fallbackHeroImage, ...profile.galleryImages].filter(
        (value): value is string => Boolean(value)
      )
    ),
  ]
  const requestedImageIndex = Number.parseInt(filters.img || "0", 10)
  const selectedImageIndex =
    Number.isFinite(requestedImageIndex) &&
    requestedImageIndex >= 0 &&
    requestedImageIndex < allImages.length
      ? requestedImageIndex
      : 0
  const heroImage = allImages[selectedImageIndex] || ""
  const heroStats = [
    { label: "Matched Videos", value: videos.length.toLocaleString() },
    { label: "Sources", value: Math.max(sources.length, 1).toString() },
    ...profile.stats,
  ].slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
        {profile.bannerImage && (
          <Image
            src={profile.bannerImage}
            alt=""
            aria-hidden
            fill
            unoptimized
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-br from-background/95 via-background/85 to-background/70" />

        <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:flex-row lg:items-start lg:gap-8">
          {/* Portrait + gallery strip */}
          <div className="flex shrink-0 flex-col gap-3 lg:w-56 xl:w-64">
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-white/10 bg-muted">
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={name}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 50vw, 260px"
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl font-bold text-muted-foreground select-none">
                  {name.charAt(0)}
                </div>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="grid grid-cols-3 gap-1.5">
                {allImages.slice(0, 6).map((image, i) => (
                  <Link
                    key={image + i}
                    href={{
                      pathname: "/actors/" + slug,
                      query: {
                        ...(selectedSource === "all"
                          ? {}
                          : { source: selectedSource }),
                        img: String(i),
                      },
                    }}
                    className={
                      "relative aspect-square overflow-hidden rounded-lg border transition-colors " +
                      (selectedImageIndex === i
                        ? "border-primary/60"
                        : "border-border/40 hover:border-primary/30")
                    }
                  >
                    <Image
                      src={image}
                      alt={name + " " + (i + 1)}
                      fill
                      unoptimized
                      sizes="84px"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Bio + stats */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                Actor Profile
              </span>
              {sources.length > 0 && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.15em] text-primary uppercase">
                  {sources.map(formatSourceLabel).join(" · ")}
                </span>
              )}
            </div>

            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl xl:text-5xl">
                {name}
              </h1>
              {profile.description && (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  {profile.description}
                </p>
              )}
            </div>

            {heroStats.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label + stat.value}
                    className="rounded-xl border border-border/50 bg-background/60 px-4 py-3"
                  >
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {profile.featuredIn.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <IconSparkles className="size-3.5 text-primary" />
                  Featured In
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.featuredIn.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.externalLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.externalLinks.map((link) => (
                  <Link
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                  >
                    <IconExternalLink className="size-3" />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Details */}
      {profile.details.length > 0 && (
        <section>
          <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <IconVideo className="size-3.5 text-primary" />
              Performer Details
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {profile.details.map((detail) => (
                <div
                  key={detail.label + detail.value}
                  className="rounded-xl border border-border/40 bg-background/70 p-3"
                >
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    {detail.label}
                  </p>
                  <p className="mt-1.5 text-sm font-medium">{detail.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Videos */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Videos Featuring {name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredVideos.length.toLocaleString()} result
              {filteredVideos.length === 1 ? "" : "s"} across{" "}
              {Math.max(sources.length, 1)} source
              {sources.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {sourceCounts.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <IconFilter className="size-3.5" />
              Source
            </div>
            <Link
              href={"/actors/" + slug}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (selectedSource === "all"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/60 bg-background/80 text-muted-foreground hover:border-primary/30 hover:text-foreground")
              }
            >
              All ({videos.length})
            </Link>
            {sourceCounts.map(({ source, count }) => (
              <Link
                key={source}
                href={
                  "/actors/" + slug + "?source=" + encodeURIComponent(source)
                }
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (selectedSource === source
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/80 text-muted-foreground hover:border-primary/30 hover:text-foreground")
                }
              >
                {formatSourceLabel(source)} ({count})
              </Link>
            ))}
          </div>
        )}

        <VideoGrid videos={paginatedVideos} priorityCount={8} />

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          baseUrl={"/actors/" + slug}
          searchParams={{
            ...(selectedSource === "all" ? {} : { source: selectedSource }),
            ...(selectedImageIndex > 0
              ? { img: String(selectedImageIndex) }
              : {}),
          }}
        />
      </section>
    </div>
  )
}
