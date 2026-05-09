import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { HOME_CATEGORIES, HOME_SOURCE_PARAM } from "@/lib/home-content"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Browse video categories and jump directly into filtered results.",
}

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Categories
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Pick a category to open matching videos in search.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {HOME_CATEGORIES.map((cat) => (
          <Link
            key={cat.query}
            href={`/search?q=${encodeURIComponent(cat.query)}&sources=${encodeURIComponent(HOME_SOURCE_PARAM)}`}
            className="group relative block aspect-4/3 overflow-hidden rounded-2xl border border-white/10"
          >
            {cat.image ? (
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className={cn("absolute inset-0 bg-linear-to-br", cat.accent)}
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent transition-opacity group-hover:opacity-90" />
            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {cat.label}
                </p>
                <ArrowRight className="size-3.5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
