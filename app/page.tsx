import type { Metadata } from "next"
import { HomeLanding } from "@/components/home/home-landing"
import { HOME_ARTISTS, HOME_PAGE_SOURCES } from "@/lib/home-content"
import { unifiedSearch } from "@/lib/server-video-data"
import { getPerformerImage } from "@/lib/server-performer-data"

export const metadata: Metadata = {
  title: "Curated Home",
  description:
    "Featured videos, category shortcuts, top artists, and a horizontal trending rail in one landing page.",
}

export default async function HomePage() {
  const [popularData, trendingData, artistImageResults] = await Promise.all([
    unifiedSearch({
      per_page: 8,
      page: 1,
      order: "most-popular",
      sources: HOME_PAGE_SOURCES,
    }).catch(() => null),
    unifiedSearch({
      per_page: 18,
      page: 1,
      order: "top-weekly",
      sources: HOME_PAGE_SOURCES,
    }).catch(() => null),
    Promise.allSettled(HOME_ARTISTS.map((name) => getPerformerImage(name))),
  ])

  const trendingVideos = (
    trendingData?.videos.length
      ? trendingData.videos
      : popularData?.videos || []
  ).slice(0, 18)

  const artistImages: Record<string, string | null> = Object.fromEntries(
    HOME_ARTISTS.map((name, i) => {
      const result = artistImageResults[i]
      return [name, result.status === "fulfilled" ? result.value : null]
    })
  )

  return (
    <HomeLanding trendingVideos={trendingVideos} artistImages={artistImages} />
  )
}
