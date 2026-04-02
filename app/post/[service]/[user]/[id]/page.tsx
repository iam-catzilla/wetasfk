"use client"

import { api, Post } from "@/lib/api"
import { useSource } from "@/lib/source-context"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconPhoto,
  IconPlayerPlay,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SafeImage } from "@/components/ui/safe-image"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

export default function PostPage() {
  const { source } = useSource()
  const params = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true)
      try {
        const data = await api.getPost(
          params.service as string,
          params.user as string,
          params.id as string,
          source
        )
        setPost(data)
      } catch (error) {
        console.error("Failed to fetch post:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [source, params.service, params.user, params.id])

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-150 w-full rounded-3xl" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <p className="text-muted-foreground">
          The post you are looking for does not exist or has been removed.
        </p>
      </div>
    )
  }

  const postSource = api.getSourceFromService(post.service)
  const mediaUrl = post.file?.path
    ? api.getMediaUrl(post.file.path, postSource)
    : null
  const iconUrl = api.getIconUrl(post.service, post.user, postSource)

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pb-20">
        <div className="mb-2 flex items-center gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/models/search">Models</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/user/${post.service}/${post.user}`}>
                  {post.user}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Post</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-bold uppercase">
              {post.service}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Published on{" "}
              {format(new Date(post.published || post.added), "PPP")}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            {post.title || "Untitled Post"}
          </h1>
        </div>

        {/* Main Media */}
        {mediaUrl && (
          <div className="overflow-hidden rounded-3xl border border-border/50 bg-black/20 shadow-2xl">
            {post.file?.path.match(/\.(mp4|webm|mov)$/i) ? (
              <video
                src={mediaUrl}
                controls
                className="h-auto max-h-[80vh] w-full"
              />
            ) : (
              <SafeImage
                src={mediaUrl}
                alt={post.title}
                className="h-auto max-h-[80vh] w-full object-contain"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-8 lg:col-span-2">
            {post.content && (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-xl font-bold">
                  <IconFileText className="h-5 w-5 text-primary" />
                  Description
                </h3>
                <div
                  className="prose prose-invert max-w-none rounded-3xl border border-border/50 bg-muted/20 p-8 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </div>
            )}

            {/* Rendered Attachments */}
            {post.attachments?.length > 0 && (
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-xl font-bold">
                  <IconPhoto className="h-5 w-5 text-primary" />
                  Attachments ({post.attachments.length})
                </h3>
                <div className="flex flex-col gap-6">
                  {post.attachments.map((att, i) => {
                    const attUrl = api.getMediaUrl(att.path, postSource)
                    const isVideo = att.path.match(/\.(mp4|webm|mov)$/i)

                    return (
                      <div
                        key={i}
                        className="overflow-hidden rounded-3xl border border-border/50 bg-black/20 shadow-lg"
                      >
                        {isVideo ? (
                          <div className="group relative">
                            <video
                              src={attUrl}
                              controls
                              className="h-auto max-h-[80vh] w-full"
                            />
                            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur-md">
                              <IconPlayerPlay className="h-3 w-3 fill-white" />
                              Video Attachment
                            </div>
                          </div>
                        ) : (
                          <div className="group relative">
                            <SafeImage
                              src={attUrl}
                              alt={att.name || `Attachment ${i + 1}`}
                              className="h-auto max-h-[80vh] w-full object-contain"
                            />
                            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur-md">
                              <IconPhoto className="h-3 w-3" />
                              Image Attachment
                            </div>
                            <a
                              href={attUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-4 right-4 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 rounded-full p-0"
                              >
                                <IconExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 p-4">
                          <span className="max-w-[70%] truncate text-sm font-medium">
                            {att.name || `Attachment ${i + 1}`}
                          </span>
                          <a href={attUrl} download={att.name}>
                            <Button size="sm" variant="ghost" className="gap-2">
                              <IconDownload className="h-4 w-4" />
                              Download
                            </Button>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Navigation */}
        <div className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 px-6 transition-[left] duration-300 ease-linear">
          <div className="flex w-full items-center justify-end gap-2">
            {post.prev ? (
              <Link
                href={`/post/${post.service}/${post.user}/${post.prev}`}
                className="pointer-events-auto"
              >
                <Button
                  variant="secondary"
                  size="icon"
                  className="group h-12 w-12 rounded-full border border-border/50 bg-background/80 shadow-2xl backdrop-blur-xl transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <IconChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-0.5" />
                </Button>
              </Link>
            ) : (
              <div />
            )}

            {post.next ? (
              <Link
                href={`/post/${post.service}/${post.user}/${post.next}`}
                className="pointer-events-auto"
              >
                <Button
                  variant="secondary"
                  size="icon"
                  className="group h-12 w-12 rounded-full border border-border/50 bg-background/80 shadow-2xl backdrop-blur-xl transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <IconChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
