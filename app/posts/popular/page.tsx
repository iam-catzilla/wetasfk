"use client"

import { api, Post } from "@/lib/api"
import { PostCard } from "@/components/post-card"
import { useSource } from "@/lib/source-context"
import { useEffect, useState } from "react"
import { IconLoader2 } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PopularPostsPage() {
  const { source } = useSource()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("recent")

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const data = await api.getPopularPosts(source, period)
        setPosts(data)
      } catch (error) {
        console.error("Failed to fetch popular posts:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [source, period])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Popular Posts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See what&apos;s trending across the platform.
          </p>
        </div>
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {posts.map((post) => (
            <PostCard
              key={`${post.service}-${post.user}-${post.id}`}
              post={post}
            />
          ))}
        </div>
      )}
    </div>
  )
}
