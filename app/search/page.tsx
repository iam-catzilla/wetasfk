import { unifiedSearch } from "@/lib/videos"
import { VideoGrid } from "@/components/video-grid"
import { Pagination } from "@/components/pagination"
import { SearchFilters } from "./search-filters"
import type { SortOrder, VideoSource } from "@/lib/types"
import { ALL_SOURCES, DEFAULT_ENABLED } from "@/lib/source-config"
import type { Metadata } from "next"

type Props = {
  searchParams: Promise<{
    q?: string
    page?: string
    order?: string
    sources?: string
  }>
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams
  const query = params.q || ""
  return {
    title: query
      ? `"${query}" – Free HD Porn Videos`
      : "Search Free Porn Videos – Find Any XXX",
    description: query
      ? `Watch free HD porn videos for "${query}". Browse thousands of results across Eporner, HQPorner, xnxx, motherless and more.`
      : "Search millions of free HD adult videos across all major platforms. Find any porn, any category, any model – instantly.",
    keywords: query
      ? [
          query,
          `${query} porn`,
          `${query} xxx`,
          `${query} sex video`,
          `free ${query} videos`,
        ]
      : [
          "search porn videos",
          "find xxx videos",
          "porn search engine",
          "free adult video search",
          "search sex videos online",
          "find porn by category",
          "xxx search",
          "hd porn search",
        ],
    alternates: {
      canonical: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    },
    robots: query
      ? { index: false, follow: false }
      : { index: true, follow: true },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const query = params.q || ""
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const order = (params.order || "most-popular") as SortOrder

  // Use sources from URL, or fall back to the default enabled sources
  const sources: VideoSource[] = params.sources
    ? (params.sources.split(",").filter(Boolean) as VideoSource[])
    : ALL_SOURCES.filter((s) => DEFAULT_ENABLED[s])

  const data = query
    ? await unifiedSearch({ query, per_page: 36, page, order, sources }).catch(
        () => null
      )
    : null

  const sp: Record<string, string> = {}
  if (query) sp.q = query
  if (order) sp.order = order
  sp.sources = sources.join(",")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {query ? `Results for "${query}"` : "Search Videos"}
        </h1>
        {data && (
          <p className="mt-1 text-sm text-muted-foreground">
            {data.totalCount.toLocaleString()} results found
          </p>
        )}
      </div>

      <SearchFilters currentQuery={query} currentOrder={order} />

      {data ? (
        <>
          <VideoGrid
            key={`search-${query}-${page}-${order}`}
            videos={data.videos}
          />
          <Pagination
            currentPage={page}
            totalPages={Math.min(data.totalPages, 100)}
            baseUrl="/search"
            searchParams={sp}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-muted-foreground">
            Enter a search term to find videos
          </p>
        </div>
      )}
    </div>
  )
}
