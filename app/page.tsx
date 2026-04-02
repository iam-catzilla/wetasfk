"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconSearch, IconArrowRight, IconFlame } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import Image from "next/image"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const getEnabledList = useAppStore((s) => s.getEnabledList)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      const enabled = getEnabledList()
      const params = new URLSearchParams()
      params.set("q", trimmed)
      params.set("sources", enabled.join(","))
      router.push(`/search?${params.toString()}`)
    }
  }

  return (
    <div className="-mx-3 -my-6 flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-6 md:-mx-6">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2.5 text-primary">
            <Image src="/logo.png" alt="Wetasfk Logo" width={40} height={40} />
            <span className="mb-2 font-mono text-4xl font-bold tracking-tight">
              Wet as f**k
            </span>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Stream free HD videos from all your favorite platforms, in one
            place.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              className="h-12 rounded-xl border-border/60 bg-muted/50 pl-10 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="size-12 shrink-0 rounded-xl"
          >
            <IconArrowRight className="size-4" />
          </Button>
        </form>

        {/* Preview image */}
        <div className="relative w-full max-w-125 overflow-hidden rounded-2xl">
          <Image
            src="/bg.png"
            alt="Preview"
            width={500}
            height={300}
            className="block h-auto w-full"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-primary/40 mix-blend-multiply" />
        </div>
      </div>
    </div>
  )
}
