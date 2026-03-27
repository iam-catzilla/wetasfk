"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CATEGORIES } from "@/lib/constants"
import { useRef, useState, useEffect } from "react"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

export function CategoryPills() {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    el?.addEventListener("scroll", checkScroll)
    window.addEventListener("resize", checkScroll)
    return () => {
      el?.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [])

  function scroll(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute top-1/2 -left-1 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-md"
        >
          <IconChevronLeft className="size-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2 overflow-x-auto py-1"
      >
        {CATEGORIES.map((cat) => {
          const href =
            cat === "Popular"
              ? "/"
              : cat === "Trending"
                ? "/?order=top-weekly"
                : `/search?q=${encodeURIComponent(cat)}`
          const isActive =
            (cat === "Popular" &&
              pathname === "/" &&
              !globalThis.location?.search) ||
            false

          return (
            <Link
              key={cat}
              href={href}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-muted/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
              )}
            >
              {cat}
            </Link>
          )
        })}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute top-1/2 -right-1 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-md"
        >
          <IconChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}
