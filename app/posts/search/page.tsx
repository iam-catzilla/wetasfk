"use client"

import { api, Post } from "@/lib/api"
import { PostCard } from "@/components/post-card"
import { useSource } from "@/lib/source-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconLoader2, IconSearch, IconX } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"

export default function PostsSearchPage() {
  const { source } = useSource()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    if (searchQuery === "") {
      setDebouncedSearch("")
      return
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchPosts = async (reset = false) => {
    setLoading(true)
    try {
      const currentOffset = reset ? 0 : offset
      const data = await api.getRecentPosts(
        source,
        currentOffset,
        debouncedSearch
      )
      if (data.length === 0) {
        setHasMore(false)
        if (reset) setPosts([])
      } else {
        setPosts((prev) => (reset ? data : [...prev, ...data]))
        setOffset(currentOffset + 50)
        setHasMore(data.length === 50)
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    fetchPosts(true)
  }, [source, debouncedSearch])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Browse Posts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore the latest posts from all models.
        </p>
      </div>

      <div className="relative">
        <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          className="h-11 rounded-xl border-border/60 bg-muted/50 pr-9 pl-10 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {posts.map((post) => (
            <PostCard
              key={`${post.service}-${post.user}-${post.id}`}
              post={post}
            />
          ))}
        </div>
      ) : !loading ? (
        <div className="rounded-3xl border-2 border-dashed bg-muted/20 py-20 text-center">
          <p className="font-medium text-muted-foreground">
            No posts found. Try a different search term.
          </p>
        </div>
      ) : null}

      {loading && (
        <div className="flex justify-center py-8">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && hasMore && posts.length > 0 && (
        <div className="flex justify-center py-8">
          <Button
            onClick={() => fetchPosts(false)}
            variant="outline"
            className="rounded-full px-8 font-bold"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
