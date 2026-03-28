import { unifiedSearch } from "@/lib/videos"
import { VideoGrid } from "@/components/video-grid"
import { CategoryPills } from "@/components/category-pills"
import { Pagination } from "@/components/pagination"
import type { SortOrder, VideoSource } from "@/lib/types"
import { ALL_SOURCES, DEFAULT_ENABLED } from "@/lib/source-config"

interface Props {
  searchParams: Promise<{ page?: string; order?: string; sources?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const order = (params.order || "top-weekly") as SortOrder

  // Use sources from URL, or fall back to the default enabled sources
  const sources: VideoSource[] = params.sources
    ? (params.sources.split(",").filter(Boolean) as VideoSource[])
    : ALL_SOURCES.filter((s) => DEFAULT_ENABLED[s])

  const data = await unifiedSearch({
    per_page: 36,
    page,
    order,
    sources,
  })

  return (
    <div className="flex flex-col gap-6">
      <CategoryPills />

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {order === "top-weekly" ? "Trending This Week" : "Popular Videos"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.totalCount.toLocaleString()} videos
        </p>
      </div>

      <VideoGrid videos={data.videos} />

      <Pagination
        currentPage={page}
        totalPages={Math.min(data.totalPages, 100)}
        baseUrl="/"
        searchParams={{
          order,
          sources: sources.join(","),
        }}
      />
    </div>
  )
}
