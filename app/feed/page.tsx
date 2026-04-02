"use client"

import { api, Post } from "@/lib/api"
import { useSource } from "@/lib/source-context"
import { useEffect, useState, useRef } from "react"
import { FeedVideoCard } from "@/components/feed-video-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import {
  IconMovie,
  IconChevronDown,
  IconLoader2,
  IconHeart,
  IconVolume,
} from "@tabler/icons-react"
import { useFavorites } from "@/hooks/use-favorites"

export default function FeedPage() {
  const { source } = useSource()
  const { favorites } = useFavorites()
  const [videoPosts, setVideoPosts] = useState<{ post: Post; url: string }[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchVideos = async (currentOffset: number) => {
    try {
      if (favorites.length === 0) return []
      const batchSize = 10
      const start = currentOffset % favorites.length
      let favoritesToFetch = favorites.slice(start, start + batchSize)

      // If we need more to fill the batch (wrap around)
      if (favoritesToFetch.length < batchSize && favorites.length > batchSize) {
        favoritesToFetch = [
          ...favoritesToFetch,
          ...favorites.slice(0, batchSize - favoritesToFetch.length),
        ]
      }

      // Determine API offset based on how many times we've cycled through favorites
      const apiOffset = Math.floor(currentOffset / favorites.length) * 10

      // Fetch posts for each favorite in parallel
      const favoritePostsPromises = favoritesToFetch.map((fav) =>
        api.getCreatorPosts(fav.service, fav.id, source, apiOffset)
      )

      const results = await Promise.allSettled(favoritePostsPromises)
      const allPosts: Post[] = []

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          allPosts.push(...result.value)
        }
      })

      const videos: { post: Post; url: string }[] = []

      allPosts.forEach((post) => {
        const postSource = api.getSourceFromService(post.service)
        // Check main file
        if (post.file?.path?.match(/\.(mp4|webm|mov)$/i)) {
          videos.push({
            post,
            url: api.getMediaUrl(post.file.path, postSource),
          })
        }
        // Check attachments
        post.attachments?.forEach((att) => {
          if (att.path?.match(/\.(mp4|webm|mov)$/i)) {
            videos.push({
              post,
              url: api.getMediaUrl(att.path, postSource),
            })
          }
        })
      })

      // Sort by date (newest first) and remove duplicates (if any)
      const uniqueVideos = Array.from(
        new Map(videos.map((v) => [v.url, v])).values()
      )

      // Randomize the order using Fisher-Yates shuffle
      const shuffled = [...uniqueVideos]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    } catch (error) {
      console.error("Failed to fetch videos for feed:", error)
      return []
    }
  }

  useEffect(() => {
    const initFeed = async () => {
      if (favorites.length === 0) {
        setLoading(false)
        return
      }
      setLoading(true)
      const videos = await fetchVideos(0)
      setVideoPosts(videos)
      setLoading(false)
    }
    initFeed()
  }, [source, favorites])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const options = {
      root: container,
      rootMargin: "0px",
      threshold: 0.5,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Array.from(container.children).indexOf(entry.target)
          if (index !== -1) {
            setActiveIndex(index)
          }
        }
      })
    }, options)

    const children = Array.from(container.children)
    children.forEach((child) => observer.observe(child))

    return () => {
      children.forEach((child) => observer.unobserve(child))
    }
  }, [videoPosts])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          videoPosts.length > 0
        ) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [isFetchingMore, videoPosts.length])

  const loadMore = async () => {
    setIsFetchingMore(true)
    const nextOffset = offset + 10
    const newVideos = await fetchVideos(nextOffset)
    setVideoPosts((prev) => [...prev, ...newVideos])
    setOffset(nextOffset)
    setIsFetchingMore(false)
  }

  const scrollToNext = (index: number) => {
    if (containerRef.current) {
      const nextIndex = index + 1
      const children = containerRef.current.children
      if (nextIndex < children.length) {
        children[nextIndex].scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  if (loading) {
    return (
      <div className="mt-1 flex h-[calc(100dvh-1rem)] w-full items-center justify-center overflow-hidden rounded-2xl bg-black md:mt-2 md:h-[calc(100vh-2rem)] md:rounded-3xl">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="animate-pulse font-bold text-white/50">
            Loading your feed...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto mt-1 h-[calc(100dvh-8rem)] w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl md:mt-2 md:h-[calc(100vh-8rem)] md:rounded-2xl">
      <div className="group pointer-events-auto absolute top-6 right-6 z-50">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md transition-all hover:bg-black/40">
          <IconVolume className="h-4 w-4 shrink-0 text-white" />
          <div className="w-0 overflow-hidden transition-all duration-300 group-hover:w-24">
            <Slider
              value={[volume * 100]}
              step={10}
              max={100}
              onValueChange={(vals) => {
                const newVal = Array.isArray(vals) ? vals[0] : vals
                if (typeof newVal === "number" && !isNaN(newVal)) {
                  setVolume(newVal / 100)
                }
              }}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="scrollbar-hide h-full w-full snap-y snap-mandatory overflow-y-scroll"
      >
        {videoPosts.map((item, index) => (
          <FeedVideoCard
            key={`${item.post.id}-${index}`}
            post={item.post}
            videoUrl={item.url}
            onEnded={() => scrollToNext(index)}
            volume={volume}
            shouldPreload={index >= activeIndex && index <= activeIndex + 2}
          />
        ))}

        {isFetchingMore && (
          <div className="flex h-full w-full snap-start items-center justify-center bg-black">
            <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div ref={loadMoreRef} className="h-10 w-full" />

        {videoPosts.length === 0 && (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
            {favorites.length === 0 ? (
              <>
                <IconHeart className="mb-4 h-16 w-16 text-primary opacity-20" />
                <h2 className="mb-2 text-xl font-bold text-white">
                  No Favorites Yet
                </h2>
                <p className="text-sm text-white/50">
                  Add some models to your favorites to see their videos here!
                </p>
              </>
            ) : (
              <>
                <IconMovie className="mb-4 h-16 w-16 text-muted-foreground opacity-20" />
                <h2 className="mb-2 text-xl font-bold text-white">
                  No videos found
                </h2>
                <p className="text-sm text-white/50">
                  None of your favorite models have posted videos recently on
                  this source.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
