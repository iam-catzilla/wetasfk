"use client"

import { useEffect, useRef, useState } from "react"
import { Post, api } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  IconDownload,
  IconExternalLink,
  IconMusic,
  IconUser,
  IconPlayerPlay,
  IconMaximize,
} from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface FeedVideoCardProps {
  post: Post
  videoUrl: string
  onEnded?: () => void
  volume?: number
  shouldPreload?: boolean
}

export function FeedVideoCard({
  post,
  videoUrl,
  onEnded,
  volume = 0.5,
  shouldPreload = false,
}: FeedVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const source = api.getSourceFromService(post.service)
  const iconUrl = api.getIconUrl(post.service, post.user, source)

  useEffect(() => {
    if (videoRef.current && typeof volume === "number" && !isNaN(volume)) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume))
    }
  }, [volume])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }

    video.addEventListener("timeupdate", updateProgress)
    return () => video.removeEventListener("timeupdate", updateProgress)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.5,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video
            .play()
            .then(() => {
              setIsPlaying(true)
            })
            .catch(() => {
              // Autoplay might be blocked by browser
              setIsPlaying(false)
            })
        } else {
          video.pause()
          setIsPlaying(false)
        }
      })
    }, options)

    observer.observe(video)

    return () => {
      observer.unobserve(video)
    }
  }, [])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  return (
    <div className="relative flex h-full w-full snap-start items-center justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full cursor-pointer object-contain"
        playsInline
        onClick={togglePlay}
        onEnded={onEnded}
        preload={shouldPreload ? "auto" : "metadata"}
      />

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-in rounded-full bg-black/40 p-6 backdrop-blur-sm duration-300 fade-in zoom-in">
            <IconPlayerPlay className="h-12 w-12 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="absolute right-0 bottom-0 left-0 z-50 h-1 bg-white/20">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/20 to-transparent p-3 md:p-4">
        <div className="pointer-events-auto flex w-full items-end justify-between gap-2">
          <div className="min-w-0 flex-1 pb-2">
            <Link
              href={`/user/${post.service}/${post.user}`}
              className="group mb-2 flex items-center gap-2 md:mb-3 md:gap-3"
            >
              <Avatar className="h-8 w-8 border-2 border-white shadow-lg transition-transform group-hover:scale-110 md:h-10 md:w-10">
                <AvatarImage src={iconUrl} />
                <AvatarFallback>
                  <IconUser className="h-4 w-4 md:h-6 md:w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="truncate text-base font-bold text-white drop-shadow-md md:text-lg">
                    @{post.user}
                  </span>
                  <Badge className="border-none bg-primary px-1.5 py-0 text-[8px] font-bold text-primary-foreground uppercase md:text-[10px]">
                    {post.service}
                  </Badge>
                </div>
              </div>
            </Link>
            <h3 className="mb-1 line-clamp-2 text-xs font-medium text-white drop-shadow-md md:mb-2 md:text-sm">
              {post.title || "Untitled Post"}
            </h3>
          </div>

          <div className="flex flex-col items-center gap-3 pb-2 md:gap-6 md:pb-4">
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 md:h-12 md:w-12"
                onClick={() => window.open(videoUrl, "_blank")}
              >
                <IconDownload className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
              <span className="text-[9px] font-bold text-white md:text-[10px]">
                Download
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Link
                target="_blank"
                href={`/post/${post.service}/${post.user}/${post.id}`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 md:h-12 md:w-12"
                >
                  <IconExternalLink className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <span className="text-[9px] font-bold text-white md:text-[10px]">
                View post
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 md:h-12 md:w-12"
                onClick={toggleFullScreen}
              >
                <IconMaximize className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
              <span className="text-[9px] font-bold text-white md:text-[10px]">
                Full screen
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
