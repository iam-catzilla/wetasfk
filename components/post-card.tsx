import { Post, api } from "@/lib/api"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { SafeImage } from "@/components/ui/safe-image"
import { IconVideo } from "@tabler/icons-react"

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const date = new Date(post.published || post.added)
  const source = api.getSourceFromService(post.service)

  const isVideo = (path?: string) => path?.match(/\.(mp4|webm|mov)$/i)
  const isImage = (path?: string) => path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  const mainFile = post.file?.path
  const attachments = post.attachments || []

  let thumbnailType: "image" | "video" | null = null
  let thumbnailUrl: string | null = null

  if (mainFile) {
    if (isImage(mainFile)) {
      thumbnailType = "image"
      thumbnailUrl = api.getMediaUrl(mainFile, source)
    } else if (isVideo(mainFile)) {
      thumbnailType = "video"
      thumbnailUrl = api.getMediaUrl(mainFile, source)
    }
  }

  if (!thumbnailUrl) {
    const firstImage = attachments.find((att) => isImage(att.path))
    if (firstImage) {
      thumbnailType = "image"
      thumbnailUrl = api.getMediaUrl(firstImage.path, source)
    } else {
      const firstVideo = attachments.find((att) => isVideo(att.path))
      if (firstVideo) {
        thumbnailType = "video"
        thumbnailUrl = api.getMediaUrl(firstVideo.path, source)
      }
    }
  }

  const iconUrl = api.getIconUrl(post.service, post.user, source)

  return (
    <Link href={`/post/${post.service}/${post.user}/${post.id}`}>
      <Card className="flex h-full flex-col overflow-hidden border-none bg-muted/30 transition-colors hover:bg-muted/50">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
          <Avatar className="h-10 w-10 border border-border/50">
            <AvatarImage src={iconUrl} />
            <AvatarFallback>{post.user[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="max-w-30 truncate text-sm font-bold">
                {post.user}
              </span>
              <Badge
                variant="outline"
                className="h-4 px-1 text-[10px] uppercase"
              >
                {post.service}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(date)} ago
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          {thumbnailUrl && (
            <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-black/20">
              {thumbnailType === "image" ? (
                <SafeImage
                  src={thumbnailUrl}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <video
                  src={thumbnailUrl}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  muted
                  playsInline
                  preload="metadata"
                />
              )}
              {thumbnailType === "video" && (
                <div className="absolute top-2 right-2 z-10 rounded-xl bg-black/60 p-1 backdrop-blur-md">
                  <IconVideo className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          )}
          <div className="flex-1 p-4">
            <h4 className="mb-2 line-clamp-2 text-sm font-semibold">
              {post.title || "Untitled Post"}
            </h4>
            {(post.substring || post.content) && (
              <div
                className="prose prose-invert line-clamp-3 max-w-none text-xs text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: post.substring || post.content,
                }}
              />
            )}
            {post.attachments?.length > 0 && (
              <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                  {post.attachments.length} attachments
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
