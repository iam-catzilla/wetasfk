"use client"

import { useState } from "react"
import { IconPhoto } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string
}

export function SafeImage({
  className,
  fallbackClassName,
  alt = "",
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const srcValue = typeof props.src === "string" ? props.src : ""
  const proxiedSrc = (() => {
    if (!srcValue || typeof window === "undefined") return srcValue

    try {
      const parsed = new URL(srcValue, window.location.origin)
      const isRemote = parsed.origin !== window.location.origin
      if (!isRemote) return srcValue
      return `/api/img?url=${encodeURIComponent(parsed.toString())}`
    } catch {
      return srcValue
    }
  })()

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl bg-muted",
          fallbackClassName || className
        )}
      >
        <IconPhoto className="mb-2 h-8 w-8 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Image not available
        </span>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {loading && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-xl" />
      )}
      <img
        {...props}
        src={proxiedSrc}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true)
          setLoading(false)
        }}
      />
    </div>
  )
}
