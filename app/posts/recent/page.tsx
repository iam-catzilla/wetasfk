"use client"

import { api, Post } from "@/lib/api"
import { PostCard } from "@/components/post-card"
import { useSource } from "@/lib/source-context"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { IconClock, IconMenu2 } from "@tabler/icons-react"

export default function RecentPostsPage() {
  const { source } = useSource()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const data = await api.getRecentPosts(source)
        setPosts(data)
      } catch (error) {
        console.error("Failed to fetch recent posts:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [source])

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <IconClock className="h-5 w-5" />
          <span className="text-sm font-bold tracking-wider uppercase">
            Live Feed
          </span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter md:text-5xl">
          Recent Posts
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Stay up to date with the latest content from all your favorite models.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-3/4 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-muted/20 py-20">
          <p className="font-medium text-muted-foreground">
            No posts found. Please try again later.
          </p>
        </div>
      )}
    </div>
  )
}
