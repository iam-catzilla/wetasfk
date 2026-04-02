"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api, Post, Creator, CreatorProfile } from "@/lib/api"
import { PostCard } from "@/components/post-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SafeImage } from "@/components/ui/safe-image"
import { useFavorites } from "@/hooks/use-favorites"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import {
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconHeart,
  IconShare,
  IconFileText,
  IconMessage,
  IconUsers,
  IconArrowsUpDown,
  IconSearch,
  IconVideo,
  IconPhoto,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArtistCard } from "@/components/artist-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CreatorProfilePage() {
  const params = useParams()
  const service = params.service as string
  const id = params.id as string

  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [recommended, setRecommended] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRecommended, setLoadingRecommended] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest")
  const [filterType, setFilterType] = useState<"all" | "videos">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const { isFavorite, toggleFavorite } = useFavorites()
  const source = api.getSourceFromService(service)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setOffset(0) // Reset offset on search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Fetch full profile info
        const profile = await api.getProfile(service, id, source)
        setCreator(profile)

        // Fetch posts
        const newPosts = await api.getCreatorPosts(
          service,
          id,
          source,
          offset,
          debouncedSearch
        )

        // Sort posts
        const sortedPosts = [...newPosts].sort((a, b) => {
          const dateA = new Date(a.published || a.added).getTime()
          const dateB = new Date(b.published || b.added).getTime()
          return sortBy === "newest" ? dateB - dateA : dateA - dateB
        })

        setPosts(sortedPosts)
        setHasMore(newPosts.length === 50)
      } catch (error) {
        console.error("Failed to load creator profile:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [service, id, source, offset, sortBy, debouncedSearch])

  const fetchRecommended = async () => {
    if (recommended.length > 0) return
    setLoadingRecommended(true)
    try {
      const data = await api.getRecommendedCreators(service, id, source)
      setRecommended(data)
    } catch (error) {
      console.error("Failed to fetch recommended creators:", error)
      toast.error("Failed to load similar creators")
    } finally {
      setLoadingRecommended(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success("Profile URL copied to clipboard!")
  }

  const iconUrl = api.getIconUrl(service, id, source)
  const bannerUrl = api.getBannerUrl(service, id, source)
  const isFav = creator ? isFavorite(creator) : false

  const filteredPosts = posts.filter((post) => {
    if (filterType === "all") return true
    const hasVideo =
      post.file?.path?.match(/\.(mp4|webm|mov)$/i) ||
      post.attachments?.some((att) => att.path?.match(/\.(mp4|webm|mov)$/i))
    return hasVideo
  })

  return (
    <>
      <div className="mb-4 ml-2 flex items-center gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/models/search">Models</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{creator?.name || id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex flex-col gap-8 pb-10">
        {/* Header Section */}
        <div className="relative">
          <div className="relative h-48 w-full overflow-hidden rounded-3xl bg-muted md:h-64">
            <SafeImage
              src={bannerUrl}
              alt="Banner"
              className="h-full w-full object-cover"
              fallbackClassName="h-48 md:h-64 w-full bg-linear-to-r from-primary/20 via-muted to-primary/10"
            />
            <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          </div>

          <div className="-mt-12 flex flex-col gap-6 px-6 sm:items-end md:-mt-16 md:flex-row">
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl md:h-40 md:w-40">
              <AvatarImage src={iconUrl} />
              <AvatarFallback className="text-4xl font-bold">
                {creator?.name?.[0] || id[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 pb-2">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tighter md:text-4xl">
                  {creator?.name || id}
                </h1>
                <Badge
                  variant="secondary"
                  className="bg-primary font-bold text-primary-foreground uppercase"
                >
                  {service}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconFileText className="h-4 w-4" />
                  <span className="font-bold text-foreground">
                    {creator?.post_count?.toLocaleString() || 0}
                  </span>{" "}
                  posts
                </span>
                {(creator?.chat_count || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <IconMessage className="h-4 w-4" />
                    <span className="font-bold text-foreground">
                      {creator?.chat_count?.toLocaleString() || 0}
                    </span>{" "}
                    chats
                  </span>
                )}
                <span className="flex items-center gap-1">
                  Updated:{" "}
                  {creator?.updated
                    ? typeof creator.updated === "number"
                      ? new Date(creator.updated * 1000).toLocaleDateString()
                      : new Date(creator.updated).toLocaleDateString()
                    : "recently"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pb-2">
              <Dialog onOpenChange={(open) => open && fetchRecommended()}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    title="Similar Models"
                  >
                    <IconUsers className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Similar Models</DialogTitle>
                  </DialogHeader>
                  {loadingRecommended ? (
                    <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-3">
                      {recommended.map((artist) => (
                        <ArtistCard key={artist.id} artist={artist} />
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handleShare}
              >
                <IconShare className="h-4 w-4" />
              </Button>
              <Button
                className={`gap-2 rounded-full font-bold ${
                  isFav ? "bg-rose-500 text-white hover:bg-rose-600" : ""
                }`}
                onClick={() => creator && toggleFavorite(creator)}
              >
                <IconHeart className={`h-4 w-4 ${isFav ? "fill-white" : ""}`} />
                {isFav ? "Favorited" : "Add to Favorites"}
              </Button>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="px-2">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative max-w-md flex-1">
                <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  className="border-none bg-muted/50 pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Tabs
                value={filterType}
                onValueChange={(v) => setFilterType(v as "all" | "videos")}
                className="mr-2"
              >
                <TabsList className="h-9 border-none bg-muted/50">
                  <TabsTrigger
                    value="all"
                    className="gap-2 rounded-full text-xs font-bold"
                  >
                    <IconPhoto className="h-3.5 w-3.5" />
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="videos"
                    className="gap-2 rounded-full text-xs font-bold"
                  >
                    <IconVideo className="h-3.5 w-3.5" />
                    Videos
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() =>
                    setSortBy(sortBy === "newest" ? "oldest" : "newest")
                  }
                >
                  <IconArrowsUpDown className="h-4 w-4" />
                  {sortBy === "newest" ? "Newest First" : "Oldest First"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset(Math.max(0, offset - 50))}
                >
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                {posts.length > 0 && (
                  <div className="flex h-8 items-center rounded-full border border-border/50 bg-muted/30 px-3 text-xs font-medium text-muted-foreground">
                    Showing {offset + 1} -{" "}
                    {Math.min(offset + posts.length, creator?.post_count || 0)}{" "}
                    of {creator?.post_count || 0}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    !hasMore ||
                    loading ||
                    (creator?.post_count !== undefined &&
                      offset + 50 >= creator.post_count)
                  }
                  onClick={() => setOffset(offset + 50)}
                >
                  <IconChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-3/4 rounded-2xl" />
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed bg-muted/20 py-20 text-center">
              <p className="font-medium text-muted-foreground">
                No {filterType === "videos" ? "videos" : "posts"} found for this
                creator.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
