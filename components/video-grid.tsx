import type { UnifiedVideo } from "@/lib/types"
import { VideoCard } from "./video-card"

interface VideoGridProps {
  videos: UnifiedVideo[]
  priorityCount?: number
}

export function VideoGrid({ videos, priorityCount = 4 }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No videos found
        </p>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Try a different search or category
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {videos.map((video, i) => (
        <VideoCard
          key={`${video.source}-${video.id}`}
          video={video}
          priority={i < priorityCount}
        />
      ))}
    </div>
  )
}
